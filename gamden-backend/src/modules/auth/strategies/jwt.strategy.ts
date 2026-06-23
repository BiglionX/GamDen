import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUserPayload } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('jwt.access.secret');
    if (!secret) throw new Error('JWT_ACCESS_SECRET 未配置');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Passport 在验证通过后调用，返回值会挂到 req.user
   */
  validate(payload: JwtUserPayload): JwtUserPayload {
    if (!payload?.sub) {
      throw new UnauthorizedException('token payload 缺失');
    }
    return payload;
  }
}
