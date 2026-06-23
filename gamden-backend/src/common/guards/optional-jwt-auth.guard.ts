import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

import { JwtUserPayload } from '../decorators/current-user.decorator';

/**
 * 可选 JWT 鉴权 Guard
 *
 * 用途：公开接口但希望识别登录态的场景（如埋点上报、推送 token 注册）
 *  - 有 token：解析 userId 写入 req.user
 *  - 无 token / 无效：req.user = null（不抛异常）
 *
 * 用法：
 *   @UseGuards(OptionalJwtAuthGuard)
 *   @CurrentUser() user: JwtUserPayload | null
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtUserPayload | null>(
    _err: unknown,
    user: TUser,
    _info: unknown,
  ): TUser | null {
    return user ?? null;
  }

  canActivate(context: ExecutionContext) {
    // 强制 super.canActivate 不抛异常（无 token 时直接返回 true）
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
