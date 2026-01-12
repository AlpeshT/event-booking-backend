import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Attendee } from './attendee.entity';
import { Attendance } from './attendance.entity';
import { Event } from '../event/event.entity';
import { User } from '../user/user.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendee)
    private attendeeRepo: Repository<Attendee>,
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
    private dataSource: DataSource,
  ) {}

  async registerForEvent(
    eventId: string,
    userId?: string,
    email?: string,
    name?: string,
  ) {
    const event = await this.dataSource
      .getRepository(Event)
      .findOne({ where: { id: eventId } });

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check capacity
    const attendeeCount = await this.attendeeRepo.count({
      where: { eventId },
    });

    if (attendeeCount >= event.capacity) {
      throw new BadRequestException('Event is at full capacity');
    }

    // Check for double-booking if user is provided
    if (userId) {
      // Verify user belongs to the same organization as the event
      const user = await this.dataSource
        .getRepository(User)
        .findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.organizationId !== event.organizationId) {
        throw new BadRequestException(
          'User can only register for events within their organization',
        );
      }

      // Check if user is already registered for this exact event
      const existingRegistration = await this.attendeeRepo.findOne({
        where: { eventId, userId },
      });

      if (existingRegistration) {
        throw new BadRequestException(
          'User is already registered for this event',
        );
      }

      // Check for overlapping events (different events with overlapping times)
      // Two events overlap if: existing.endTime > new.startTime AND existing.startTime < new.endTime
      const doubleBooked = await this.dataSource.query(
        `
        SELECT e.id, e.title, e."startTime", e."endTime"
        FROM events e
        INNER JOIN attendees a ON a."eventId" = e.id
        WHERE a."userId" = $1
          AND e.id != $2
          AND e."endTime" > $3::timestamptz
          AND e."startTime" < $4::timestamptz
      `,
        [userId, eventId, event.startTime, event.endTime],
      );

      if (doubleBooked.length > 0) {
        const conflictingEvent = doubleBooked[0];
        const conflictStart = new Date(conflictingEvent.startTime).toLocaleString();
        const conflictEnd = new Date(conflictingEvent.endTime).toLocaleString();
        const newStart = new Date(event.startTime).toLocaleString();
        const newEnd = new Date(event.endTime).toLocaleString();
        
        throw new BadRequestException(
          `User is already registered for an overlapping event: "${conflictingEvent.title}" (${conflictStart} - ${conflictEnd}). Current event: ${newStart} - ${newEnd}`,
        );
      }
    }

    // Create attendee
    const attendee = this.attendeeRepo.create({
      eventId,
      userId: userId || null,
      email: email || null,
      name: name || null,
    });

    return this.attendeeRepo.save(attendee);
  }

  async checkIn(attendeeId: string) {
    const attendee = await this.attendeeRepo.findOne({
      where: { id: attendeeId },
    });

    if (!attendee) {
      throw new BadRequestException('Attendee not found');
    }

    const attendance = this.attendanceRepo.create({
      attendeeId,
    });

    return this.attendanceRepo.save(attendance);
  }

  async getEventAttendees(eventId: string) {
    return this.attendeeRepo.find({
      where: { eventId },
      relations: ['user', 'attendances'],
    });
  }

  async getUserAttendances(userId: string) {
    return this.attendeeRepo.find({
      where: { userId },
      relations: ['event', 'attendances'],
    });
  }
}
