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
import { TripTrackingService } from '../application/trip-tracking.service.js';
import {
  TripDriverLocationDto,
  TripDriverLocationStopDto,
} from '../dto/trip-tracking.dto.js';

@ApiTags('seguridad')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('trips/:tripId/location')
export class TripTrackingController {
  constructor(private readonly tracking: TripTrackingService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  view(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.tracking.view(tripId, req.principal.userId);
  }

  @Post()
  @HttpCode(204)
  @Throttle({ default: { ttl: 60000, limit: 12 } })
  share(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() data: TripDriverLocationDto,
  ) {
    return this.tracking.share(tripId, req.principal.userId, data);
  }

  @Delete()
  @HttpCode(204)
  forget(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() data?: TripDriverLocationStopDto,
  ) {
    return this.tracking.forget(tripId, req.principal.userId, data);
  }
}
