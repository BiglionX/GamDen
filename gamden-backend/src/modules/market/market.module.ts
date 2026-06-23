import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketItem } from '../../entities/market-item.entity';
import { User } from '../../entities/user.entity';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MarketItem, User])],
  providers: [MarketService],
  controllers: [MarketController],
})
export class MarketModule {}
