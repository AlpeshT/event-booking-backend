import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Or } from 'typeorm';
import { Resource } from './resource.entity';

@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepo: Repository<Resource>,
  ) {}

  async findAll(organizationId?: string) {
    if (organizationId) {
      return this.resourceRepo.find({
        where: [
          { organizationId },
          { organizationId: null }, // Include global resources
        ],
        relations: ['organization'],
      });
    }
    return this.resourceRepo.find({
      relations: ['organization'],
    });
  }

  async create(data: Partial<Resource>) {
    const resource = await this.resourceRepo.save(this.resourceRepo.create(data));
    // Reload with relations to include organization
    return this.resourceRepo.findOne({
      where: { id: resource.id },
      relations: ['organization'],
    });
  }

  async update(id: string, data: Partial<Resource>) {
    await this.resourceRepo.update(id, data);
    return this.findOne(id);
  }

  async findOne(id: string) {
    return this.resourceRepo.findOne({
      where: { id },
      relations: ['organization'],
    });
  }

  async delete(id: string) {
    await this.resourceRepo.delete(id);
  }
}
