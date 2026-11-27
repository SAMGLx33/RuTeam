import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { TripSafetyService } from '../application/trip-safety.service.js';

@ApiTags('seguridad')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('trips/:tripId/safety')
export class TripSafetyController {
  constructor(private readonly safety: TripSafetyService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  context(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.safety.context(tripId, req.principal.userId);
  }
}
