import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { GroupsService } from '../application/groups.service.js';
import {
  CreateTripGroupDto,
  TripGroupInvitationDto,
} from '../dto/trip-group.dto.js';

@ApiTags('trip-groups')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller()
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Post('trips/:tripId/groups')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  create(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() input: CreateTripGroupDto,
  ) {
    return this.service.create(req.principal.userId, tripId, input);
  }

  @Post('trip-groups/preview')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  preview(@Body() input: TripGroupInvitationDto) {
    return this.service.preview(input.code);
  }

  @Post('trip-groups/join')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  join(
    @Req() req: AuthenticatedRequest,
    @Body() input: TripGroupInvitationDto,
  ) {
    return this.service.join(req.principal.userId, input.code);
  }

  @Post('trip-groups/:id/invitation')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  rotate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.rotate(req.principal.userId, id);
  }

  @Post('trip-groups/:id/confirm')
  @HttpCode(200)
  confirm(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.confirm(req.principal.userId, id);
  }

  @Delete('trip-groups/:id/membership')
  leave(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.leave(req.principal.userId, id);
  }

  @Get('trip-groups')
  @Header('Cache-Control', 'no-store')
  mine(@Req() req: AuthenticatedRequest) {
    return this.service.mine(req.principal.userId);
  }
}
