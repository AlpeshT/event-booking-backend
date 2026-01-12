import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Organization } from '../organization/organization.entity';
import { EventResource } from './event-resource.entity';

export enum ResourceType {
  EXCLUSIVE = 'exclusive',
  SHAREABLE = 'shareable',
  CONSUMABLE = 'consumable',
}

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  type: ResourceType;

  @Column('uuid', { nullable: true })
  organizationId: string | null; // null = global resource

  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization | null;

  @Column('int', { nullable: true })
  maxConcurrent: number | null; // For shareable resources

  @Column('int', { nullable: true })
  totalQuantity: number | null; // For consumables

  @OneToMany(() => EventResource, (er) => er.resource)
  eventResources: EventResource[];
}
