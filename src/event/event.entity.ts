import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Check,
} from 'typeorm';
import { Organization } from '../organization/organization.entity';
import { EventResource } from '../resource/event-resource.entity';
import { Attendee } from '../attendance/attendee.entity';

@Entity('events')
@Check(`"endTime" > "startTime"`)
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('timestamptz')
  startTime: Date;

  @Column('timestamptz')
  endTime: Date;

  @Column('int')
  capacity: number;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid', { nullable: true })
  parentEventId: string | null;

  @ManyToOne(() => Event, (event) => event.childEvents, {
    nullable: true,
  })
  @JoinColumn({ name: 'parentEventId' })
  parentEvent: Event | null;

  @OneToMany(() => Event, (event) => event.parentEvent)
  childEvents: Event[];

  @OneToMany(() => EventResource, (er) => er.event)
  eventResources: EventResource[];

  @OneToMany(() => Attendee, (attendee) => attendee.event)
  attendees: Attendee[];
}
