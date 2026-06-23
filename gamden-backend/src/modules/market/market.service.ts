import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { MarketItem } from '../../entities/market-item.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class MarketService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listItems(category?: MarketItem['category']): Promise<MarketItem[]> {
    const qb = this.dataSource
      .getRepository(MarketItem)
      .createQueryBuilder('i')
      .where('i.isActive = true');
    if (category) qb.andWhere('i.category = :category', { category });
    return qb.orderBy('i.price', 'ASC').getMany();
  }

  /**
   * 兑换道具（金币扣减 + 道具记录）
   * 使用事务保证一致性
   */
  async exchange(userId: string, itemId: string): Promise<{ user: User; item: MarketItem }> {
    return this.dataSource.transaction(async (em: EntityManager) => {
      const user = await em.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('用户不存在');
      if (!user.isActive) throw new BadRequestException('账号已停用');

      const item = await em.findOne(MarketItem, { where: { id: itemId } });
      if (!item || !item.isActive) throw new NotFoundException('道具不存在或已下架');
      if (item.stock > 0 && item.stock <= item.soldCount) {
        throw new BadRequestException('库存不足');
      }
      if (user.coinBalance < item.price) {
        throw new BadRequestException(`金币不足，需要 ${item.price}，当前 ${user.coinBalance}`);
      }

      user.coinBalance -= item.price;
      item.soldCount += 1;

      await em.save(user);
      await em.save(item);

      return { user, item };
    });
  }
}
