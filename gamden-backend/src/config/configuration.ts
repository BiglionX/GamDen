import { registerAs } from '@nestjs/config';

/**
 * 根配置 - 由 ConfigModule.forRoot({ load: [configuration] }) 加载
 * 通过 ConfigService.get('app.port') 等方式访问
 */
export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: process.env.CORS_ORIGIN?.split(',') ?? '*',

  territory: {
    coordMin: parseInt(process.env.TERRITORY_COORD_MIN ?? '-1000', 10),
    coordMax: parseInt(process.env.TERRITORY_COORD_MAX ?? '1000', 10),
  },

  invite: {
    codeLength: parseInt(process.env.INVITE_CODE_LENGTH ?? '8', 10),
    required: (process.env.INVITE_REQUIRED ?? 'true').toLowerCase() === 'true',
  },
}));
