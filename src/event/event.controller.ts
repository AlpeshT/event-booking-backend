import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { EventService } from './event.service';
import { Event } from './event.entity';

@Controller('events')
export class EventController {
  constructor(private service: EventService) {}

  @Get()
  findAll(@Query('organizationId') organizationId?: string) {
    return this.service.findAll(organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Event>) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Partial<Event>) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':id/resources/:resourceId')
  allocateResource(
    @Param('id') eventId: string,
    @Param('resourceId') resourceId: string,
    @Body('quantity') quantity: number = 1,
  ) {
    return this.service.allocateResource(eventId, resourceId, quantity);
  }

  @Delete(':id/resources/:resourceId')
  removeResource(
    @Param('id') eventId: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.service.removeResource(eventId, resourceId);
  }
}
