import { Controller, Get, Query } from '@nestjs/common';
import { ReportingService } from './reporting.service';

@Controller('reporting')
export class ReportingController {
  constructor(private service: ReportingService) {}

  @Get('double-booked-users')
  findDoubleBookedUsers() {
    return this.service.findDoubleBookedUsers();
  }

  @Get('violating-events')
  findViolatingEvents() {
    return this.service.findViolatingEvents();
  }

  @Get('resource-utilization')
  getResourceUtilization() {
    return this.service.getResourceUtilization();
  }

  @Get('invalid-parent-events')
  findParentEventsWithInvalidChildren() {
    return this.service.findParentEventsWithInvalidChildren();
  }

  @Get('external-attendees')
  findEventsWithExternalAttendees(
    @Query('threshold') threshold?: string,
  ) {
    const thresholdNum = threshold ? parseInt(threshold) : 10;
    return this.service.findEventsWithExternalAttendees(thresholdNum);
  }

  @Get('underutilized-resources')
  findUnderutilizedResources(
    @Query('minUsageHours') minUsageHours?: string,
  ) {
    const minHours = minUsageHours ? parseInt(minUsageHours) : 10;
    return this.service.findUnderutilizedResources(minHours);
  }
}
