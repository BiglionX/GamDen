import { dbPool } from '../config/database';
import { logger } from '../utils/logger';

export type SmsPurpose = 'register' | 'login' | 'reset_pwd';

/**
 * 发送短信验证码
 * 开发模式：生成验证码并打印日志
 * 生产模式：对接短信网关
 */
export const sendSmsCode = async (
  phone: string,
  purpose: SmsPurpose
): Promise<boolean> => {
  // 生成 6 位数字验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 设置过期时间（5 分钟）
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  try {
    // 写入数据库
    if (!dbPool) throw new Error('数据库连接未初始化');
    await dbPool.query(
      'INSERT INTO sms_codes (phone, code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
      [phone, code, purpose, expiresAt]
    );

    // 开发模式：打印验证码到日志
    logger.info(`[短信验证码] 手机：${phone}，用途：${purpose}，验证码：${code}`);
    console.log(`\n🔐 短信验证码（开发模式）\n手机：${phone}\n验证码：${code}\n用途：${purpose}\n`);

    // TODO: 生产环境对接短信网关
    // await sendSmsViaProvider(phone, `您的验证码是：${code}，5分钟内有效。`);

    return true;
  } catch (error) {
    logger.error('发送短信验证码失败', { phone, purpose, error });
    return false;
  }
};

/**
 * 验证短信验证码
 */
export const verifySmsCode = async (
  phone: string,
  code: string,
  purpose: SmsPurpose
): Promise<boolean> => {
  try {
    if (!dbPool) throw new Error('数据库连接未初始化');
    const result: any = await dbPool.query(
      'SELECT id, expires_at, is_used FROM sms_codes WHERE phone = $1 AND code = $2 AND purpose = $3 ORDER BY id DESC LIMIT 1',
      [phone, code, purpose]
    );

    const rows = result.rows;
    if (rows.length === 0) {
      logger.warn('验证码不存在', { phone, purpose });
      return false;
    }

    const record = rows[0];

    // 检查是否已使用
    if (record.is_used) {
      logger.warn('验证码已使用', { phone, purpose });
      return false;
    }

    // 检查是否过期
    if (new Date(record.expires_at) < new Date()) {
      logger.warn('验证码已过期', { phone, purpose });
      return false;
    }

    // 标记为已使用
    if (!dbPool) throw new Error('数据库连接未初始化');
    await dbPool.query(
      'UPDATE sms_codes SET is_used = 1 WHERE id = $1',
      [record.id]
    );

    logger.info('验证码校验成功', { phone, purpose });
    return true;
  } catch (error) {
    logger.error('验证短信验证码失败', { phone, purpose, error });
    return false;
  }
};
