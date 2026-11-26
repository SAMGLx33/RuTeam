import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { MobilityService } from '../application/mobility.service.js';
import {
  FeedQueryDto,
  MobilityPreferenceDto,
  NotificationQueryDto,
} from '../dto/mobility.dto.js';

@ApiTags('mobility')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class MobilityController {
  constructor(private readonly service: MobilityService) {}
  @Get('mobility/preferences') profiles(@Req() req: AuthenticatedRequest) {
    return this.service.profiles(req.principal.userId);
  }
  @Post('mobility/preferences') create(
    @Req() req: AuthenticatedRequest,
    @Body() input: MobilityPreferenceDto,
  ) {
    return this.service.create(req.principal.userId, input);
  }
  @Patch('mobility/preferences/:id') update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: MobilityPreferenceDto,
  ) {
    return this.service.update(req.principal.userId, id, input);
  }
  @Delete('mobility/preferences/:id') @HttpCode(204) remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(req.principal.userId, id);
  }
  @Get('trips/feed') feed(
    @Req() req: AuthenticatedRequest,
    @Query() query: FeedQueryDto,
  ) {
    return this.service.feed(req.principal.userId, query);
  }
  @Get('trips/:id') detail(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.detail(req.principal.userId, id);
  }
  @Get('notifications') notifications(
    @Req() req: AuthenticatedRequest,
    @Query() query: NotificationQueryDto,
  ) {
    return this.service.notifications(req.principal.userId, query.cursor);
  }
  @Post('notifications/:id/read') @HttpCode(200) read(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.readNotification(req.principal.userId, id);
  }
}
