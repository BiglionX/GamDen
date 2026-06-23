import { ApiProperty } from '@nestjs/swagger';

/**
 * 统一 API 响应结构
 */
export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: 0, description: '业务状态码，0 表示成功' })
  code!: number;

  @ApiProperty({ example: 'ok', description: '提示信息' })
  message!: string;

  @ApiProperty({ description: '业务数据', nullable: true })
  data!: T | null;

  @ApiProperty({ example: '2026-06-23T08:00:00.000Z' })
  timestamp!: string;

  static ok<T>(data: T, message = 'ok'): ApiResponseDto<T> {
    return {
      code: 0,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static fail(code: number, message: string): ApiResponseDto<null> {
    return {
      code,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    };
  }
}
