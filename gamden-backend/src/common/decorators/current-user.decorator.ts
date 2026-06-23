import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * JWT 解析后的 payload（最小集）
 */
export interface JwtUserPayload {
  sub: string; // userId
  role: string;
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const req = ctx.switchToHttp().getRequest<Request & { user: JwtUserPayload }>();
    return req.user;
  },
);
