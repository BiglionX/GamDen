import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  access: {
    secret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    ttl: process.env.JWT_ACCESS_TTL ?? '2h',
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    ttl: process.env.JWT_REFRESH_TTL ?? '14d',
  },
}));
