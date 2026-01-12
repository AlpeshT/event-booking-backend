import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Event } from './event.entity';
import { EventResource } from '../resource/event-resource.entity';
import { Resource } from '../resource/resource.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(EventResource)
    private eventResourceRepo: Repository<EventResource>,
    @InjectRepository(Resource)
    private resourceRepo: Repository<Resource>,
    private dataSource: DataSource,
  ) {}

  async findAll(organizationId?: string) {
    const where = organizationId ? { organizationId } : {};
    return this.eventRepo.find({
      where,
      relations: ['organization', 'parentEvent', 'childEvents'],
    });
  }

  async findOne(id: string) {
    return this.eventRepo.findOne({
      where: { id },
      relations: ['organization', 'parentEvent', 'childEvents', 'attendees'],
    });
  }

  async create(eventData: Partial<Event>) {
    // Validate organizationId is provided and not empty
    if (
      !eventData.organizationId ||
      (typeof eventData.organizationId === 'string' &&
        eventData.organizationId.trim() === '')
    ) {
      throw new BadRequestException('Organization ID is required');
    }

    // Validate parent-child time constraints
    if (eventData.parentEventId) {
      const parent = await this.eventRepo.findOne({
        where: { id: eventData.parentEventId },
      });
      if (!parent) {
        throw new BadRequestException('Parent event not found');
      }
      if (
        eventData.startTime < parent.startTime ||
        eventData.endTime > parent.endTime
      ) {
        throw new BadRequestException(
          'Child event must be within parent event time bounds',
        );
      }
    }

    return this.eventRepo.save(this.eventRepo.create(eventData));
  }

  async update(id: string, eventData: Partial<Event>) {
    const event = await this.findOne(id);
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Validate parent-child time constraints if parent is being set
    if (eventData.parentEventId) {
      const parent = await this.eventRepo.findOne({
        where: { id: eventData.parentEventId },
      });
      if (!parent) {
        throw new BadRequestException('Parent event not found');
      }
      const startTime = eventData.startTime || event.startTime;
      const endTime = eventData.endTime || event.endTime;
      if (startTime < parent.startTime || endTime > parent.endTime) {
        throw new BadRequestException(
          'Child event must be within parent event time bounds',
        );
      }
    }

    await this.eventRepo.update(id, eventData);
    return this.findOne(id);
  }

  async delete(id: string) {
    await this.eventRepo.delete(id);
  }

  async allocateResource(
    eventId: string,
    resourceId: string,
    quantity: number = 1,
  ) {
    const resource = await this.resourceRepo.findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new BadRequestException('Resource not found');
    }

    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if resource is already allocated to this event
    const existingAllocation = await this.eventResourceRepo.findOne({
      where: { eventId, resourceId },
    });

    if (existingAllocation) {
      throw new ConflictException(
        'Resource is already allocated to this event',
      );
    }

    // Check for exclusive resource conflicts
    if (resource.type === 'exclusive') {
      const conflicts = await this.dataSource.query(
        `
        SELECT e.id, e.title
        FROM events e
        INNER JOIN event_resources er ON er."eventId" = e.id
        WHERE er."resourceId" = $1
          AND e.id != $2
          AND e."endTime" > $3
          AND e."startTime" < $4
      `,
        [resourceId, eventId, event.startTime, event.endTime],
      );

      if (conflicts.length > 0) {
        throw new ConflictException(
          `Resource is already allocated to another event during this time`,
        );
      }
    }

    // Check shareable resource max concurrent
    if (resource.type === 'shareable' && resource.maxConcurrent) {
      const concurrent = await this.dataSource.query(
        `
        SELECT COUNT(*) as count
        FROM events e
        INNER JOIN event_resources er ON er."eventId" = e.id
        WHERE er."resourceId" = $1
          AND e."endTime" > $2
          AND e."startTime" < $3
      `,
        [resourceId, event.startTime, event.endTime],
      );

      if (parseInt(concurrent[0].count) >= resource.maxConcurrent) {
        throw new ConflictException(
          `Resource has reached maximum concurrent usage (${resource.maxConcurrent})`,
        );
      }
    }

    // Check consumable quantity
    if (resource.type === 'consumable' && resource.totalQuantity) {
      const used = await this.dataSource.query(
        `
        SELECT COALESCE(SUM(er.quantity), 0) as used
        FROM event_resources er
        WHERE er."resourceId" = $1
      `,
        [resourceId],
      );

      if (parseInt(used[0].used) + quantity > resource.totalQuantity) {
        throw new ConflictException(
          `Insufficient consumable resource quantity available`,
        );
      }
    }

    return this.eventResourceRepo.save(
      this.eventResourceRepo.create({
        eventId,
        resourceId,
        quantity,
      }),
    );
  }

  async removeResource(eventId: string, resourceId: string) {
    await this.eventResourceRepo.delete({
      eventId,
      resourceId,
    });
  }
}
