import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
  ) {}

  async findAll() {
    return this.orgRepo.find();
  }

  async findOne(id: string) {
    return this.orgRepo.findOne({ where: { id } });
  }

  async create(data: Partial<Organization>) {
    return this.orgRepo.save(this.orgRepo.create(data));
  }

  async update(id: string, data: Partial<Organization>) {
    await this.orgRepo.update(id, data);
    return this.findOne(id);
  }

  async delete(id: string) {
    await this.orgRepo.delete(id);
  }
}
