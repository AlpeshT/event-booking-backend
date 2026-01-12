import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Event } from '../event/event.entity';
import { User } from '../user/user.entity';
import { Attendance } from './attendance.entity';

@Entity('attendees')
export class Attendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column('uuid', { nullable: true })
  userId: string | null; // null for external attendees

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ nullable: true })
  email: string; // For external attendees

  @Column({ nullable: true })
  name: string; // For external attendees

  @OneToMany(() => Attendance, (attendance) => attendance.attendee)
  attendances: Attendance[];
}
