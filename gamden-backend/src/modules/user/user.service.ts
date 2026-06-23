import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /** 根据 id 查询 */
  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  /** 根据手机号查询 */
  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phone } });
  }

  /** 更新昵称 / 头像 */
  async updateProfile(
    id: string,
    patch: Partial<Pick<User, 'nickname' | 'avatarUrl'>>,
  ): Promise<User> {
    await this.userRepo.update(id, patch);
    return this.findById(id);
  }
}
