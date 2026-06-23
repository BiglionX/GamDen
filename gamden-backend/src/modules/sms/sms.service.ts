import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.module';
import { SmsPurpose } from './dto/send-sms.dto';

/**
 * 短信验证码服务
 *
 * V1.0 实现：
 *  - 生成 6 位数字验证码
 *  - 缓存到 Redis，TTL 5 分钟
 *  - 同一手机号 + 用途 60 秒内不重复发送（防刷）
 *  - sendToPhone() 在 mock 模式下打印到日志；TODO: 接阿里云/腾讯云 SMS
 *
 * Redis key 设计：
 *  - gamden:sms:code:<purpose>:<phone>      -> 验证码（5 分钟 TTL）
 *  - gamden:sms:cooldown:<purpose>:<phone>  -> "1"（60 秒 TTL，防刷）
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /** 验证码有效期（秒） */
  private readonly CODE_TTL = 5 * 60;

  /** 发送冷却（秒） */
  private readonly COOLDOWN_TTL = 60;

  constructor(private readonly redis: RedisService) {}

  /**
   * 生成 6 位数字验证码
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private codeKey(purpose: SmsPurpose, phone: string): string {
    return `gamden:sms:code:${purpose}:${phone}`;
  }

  private cooldownKey(purpose: SmsPurpose, phone: string): string {
    return `gamden:sms:cooldown:${purpose}:${phone}`;
  }

  /**
   * 发送验证码
   * - 同手机号 + 用途 60 秒内只发一次
   * - 验证码 TTL 5 分钟
   */
  async sendCode(phone: string, purpose: SmsPurpose): Promise<void> {
    const cooldown = await this.redis.exists(this.cooldownKey(purpose, phone));
    if (cooldown) {
      throw new BadRequestException('请求过于频繁，请稍后再试');
    }

    const code = this.generateCode();
    await this.redis.set(this.codeKey(purpose, phone), code, this.CODE_TTL);
    await this.redis.set(this.cooldownKey(purpose, phone), '1', this.COOLDOWN_TTL);

    await this.sendToPhone(phone, code, purpose);
  }

  /**
   * 校验并消费验证码（用完即删）
   * - 校验通过返回 true
   * - 校验失败返回 false（不抛异常，由调用方决定错误信息）
   */
  async verifyCode(
    phone: string,
    code: string,
    purpose: SmsPurpose,
  ): Promise<boolean> {
    const key = this.codeKey(purpose, phone);
    const stored = await this.redis.getDel(key);
    if (!stored) return false;
    if (stored !== code) {
      // 验证码错误时不抛异常，让调用方处理；
      // 如果业务需要更严格（例如锁定 5 分钟），可以在此扩展
      return false;
    }
    return true;
  }

  /**
   * 真实下发短信
   * V1.0 mock 实现：打印到日志
   * TODO: 接入阿里云短信 / 腾讯云短信
   */
  private async sendToPhone(
    phone: string,
    code: string,
    purpose: SmsPurpose,
  ): Promise<void> {
    const purposeText = purpose === SmsPurpose.REGISTER ? '注册' : '登录';
    this.logger.warn(
      `[SMS-MOCK] ${phone} 验证码: ${code}（${purposeText}，5 分钟内有效）`,
    );
    // 真实环境示例：
    // const client = new DysmsapiClient(config.accessKeyId, config.accessKeySecret);
    // await client.sendSms({ PhoneNumbers: phone, TemplateCode: 'SMS_xxx', TemplateParam: JSON.stringify({ code }) });
  }
}
