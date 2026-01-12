import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findAll(organizationId?: string) {
    if (organizationId) {
      return this.userRepo.find({ where: { organizationId } });
    }
    return this.userRepo.find();
  }

  async findOne(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(data: Partial<User>) {
    return this.userRepo.save(this.userRepo.create(data));
  }

  async update(id: string, data: Partial<User>) {
    await this.userRepo.update(id, data);
    return this.findOne(id);
  }

  async delete(id: string) {
    await this.userRepo.delete(id);
  }
}
