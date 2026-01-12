import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Check,
} from 'typeorm';
import { Event } from '../event/event.entity';
import { Resource } from './resource.entity';

@Entity('event_resources')
@Unique(['eventId', 'resourceId'])
@Check(`"quantity" > 0`)
export class EventResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column('uuid')
  resourceId: string;

  @ManyToOne(() => Resource, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resourceId' })
  resource: Resource;

  @Column('int', { default: 1 })
  quantity: number; // For consumables, tracks amount used
}
