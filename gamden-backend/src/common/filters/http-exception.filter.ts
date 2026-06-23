import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponseDto } from '../dto/api-response.dto';

/**
 * 全局异常过滤器
 * - HttpException 保留原始 status 与 message
 * - 其他异常归类为 500，message 脱敏
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 1;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      message =
        typeof resp === 'string'
          ? resp
          : (resp as { message?: string }).message ?? exception.message;
      code = status >= 500 ? 1 : status;
    } else if (exception instanceof Error) {
      this.logger.error(`[${req.method} ${req.url}] ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`[${req.method} ${req.url}] Unknown error`, String(exception));
    }

    res.status(status).json(
      ApiResponseDto.fail(code, message),
    );
  }
}
