import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { ViajeService } from '../application/trips.service.js';
import { PublishTripDto } from '../dto/publish-trip.dto.js';
@ApiTags('trips')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class ViajeController {
  constructor(private readonly service: ViajeService) {}
  @Post('trips') publicarViaje(
    @Req() req: AuthenticatedRequest,
    @Body() data: PublishTripDto,
  ) {
    return this.service.publicarViaje(req.principal.userId, data);
  }
  @Get('trips/my') listarPropios(@Req() req: AuthenticatedRequest) {
    return this.service.listarPropios(req.principal.userId);
  }
  @Get('trip-rules') reglas() {
    return this.service.reglas();
  }
}
