import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import { SendSmsDto } from './dto/send-sms.dto';

@ApiTags('短信')
@Controller('auth/sms-code')
export class SmsController {
  constructor(private readonly sms: SmsService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '发送短信验证码（注册/登录）' })
  async send(@Body() dto: SendSmsDto): Promise<{ ttl: number }> {
    await this.sms.sendCode(dto.phone, dto.purpose);
    return { ttl: 300 };
  }
}
