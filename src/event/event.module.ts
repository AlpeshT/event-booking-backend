import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { EventResource } from '../resource/event-resource.entity';
import { Resource } from '../resource/resource.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventResource, Resource]),
  ],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
