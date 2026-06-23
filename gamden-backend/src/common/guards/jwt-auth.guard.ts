import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err || !user) {
      const reason =
        (info as { message?: string } | undefined)?.message ?? '未登录或 token 已失效';
      throw new UnauthorizedException(reason);
    }
    return user;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
