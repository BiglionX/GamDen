import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Territory } from '../../entities/territory.entity';
import { TerritoryEvolution } from '../../entities/territory-evolution.entity';
import { User } from '../../entities/user.entity';
import { TerritoryService } from './territory.service';
import { TerritoryController } from './territory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Territory, TerritoryEvolution, User])],
  providers: [TerritoryService],
  controllers: [TerritoryController],
  exports: [TerritoryService],
})
export class TerritoryModule {}
