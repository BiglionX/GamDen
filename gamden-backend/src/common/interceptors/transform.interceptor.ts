import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiResponseDto } from '../dto/api-response.dto';

/**
 * 全局响应转换拦截器
 * - 自动将 controller 返回值包装为 { code, message, data, timestamp }
 * - 如果 controller 已经是 ApiResponseDto 形态则不再包装
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          'code' in (data as object) &&
          'data' in (data as object) &&
          'timestamp' in (data as object)
        ) {
          return data as unknown as ApiResponseDto<T>;
        }
        return ApiResponseDto.ok(data as T);
      }),
    );
  }
}
