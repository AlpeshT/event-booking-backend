import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @Post('register')
  register(
    @Body('eventId') eventId: string,
    @Body('userId') userId?: string,
    @Body('email') email?: string,
    @Body('name') name?: string,
  ) {
    return this.service.registerForEvent(eventId, userId, email, name);
  }

  @Post(':attendeeId/checkin')
  checkIn(@Param('attendeeId') attendeeId: string) {
    return this.service.checkIn(attendeeId);
  }

  @Get('event/:eventId')
  getEventAttendees(@Param('eventId') eventId: string) {
    return this.service.getEventAttendees(eventId);
  }

  @Get('user/:userId')
  getUserAttendances(@Param('userId') userId: string) {
    return this.service.getUserAttendances(userId);
  }
}
