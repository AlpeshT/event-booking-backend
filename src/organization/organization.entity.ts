import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Event } from '../event/event.entity';
import { Resource } from '../resource/resource.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  domain: string;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Event, (event) => event.organization)
  events: Event[];

  @OneToMany(() => Resource, (resource) => resource.organization)
  resources: Resource[];
}
