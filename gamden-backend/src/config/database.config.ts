import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { User } from '../entities/user.entity';
import { Territory } from '../entities/territory.entity';
import { Invite } from '../entities/invite.entity';
import { Club } from '../entities/club.entity';
import { ClubPost } from '../entities/club-post.entity';
import { MarketItem } from '../entities/market-item.entity';
import { UserMiniProgram } from '../entities/user-mini-program.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'gamden',
    password: process.env.DB_PASSWORD ?? 'gamden_secret',
    database: process.env.DB_DATABASE ?? 'gamden',
    entities: [User, Territory, Invite, Club, ClubPost, MarketItem, UserMiniProgram],
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true').toLowerCase() === 'true',
    logging: (process.env.DB_LOGGING ?? 'false').toLowerCase() === 'true',
    // 生产环境推荐开启
    // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }),
);
