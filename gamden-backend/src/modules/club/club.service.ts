import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Club } from '../../entities/club.entity';

@Injectable()
export class ClubService {
  constructor(
    @InjectRepository(Club) private readonly clubRepo: Repository<Club>,
  ) {}

  async list(): Promise<Club[]> {
    return this.clubRepo.find({
      where: { isActive: true },
      order: { memberCount: 'DESC' },
      take: 50,
    });
  }

  async findById(id: string): Promise<Club> {
    const club = await this.clubRepo.findOne({ where: { id } });
    if (!club) throw new NotFoundException('俱乐部不存在');
    return club;
  }

  async create(data: Partial<Club>): Promise<Club> {
    const club = this.clubRepo.create({
      ...data,
      memberCount: 1,
      todayNewPosts: 0,
      isActive: true,
    });
    return this.clubRepo.save(club);
  }
}
