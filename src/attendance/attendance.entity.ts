import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Attendee } from './attendee.entity';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  attendeeId: string;

  @ManyToOne(() => Attendee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attendeeId' })
  attendee: Attendee;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  checkedInAt: Date;
}
