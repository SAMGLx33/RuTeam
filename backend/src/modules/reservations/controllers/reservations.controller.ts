import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { ReservationsService } from '../application/reservations.service.js';
import {
  ConfirmParticipationDto,
  TripTransitionDto,
} from '../dto/reservation.dto.js';

@ApiTags('reservations')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post('trips/:tripId/participations')
  confirm(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() body: ConfirmParticipationDto,
  ) {
    return this.service.confirm(req.principal.userId, tripId, body);
  }

  @Get('trips/:tripId/participations')
  participants(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.service.forDriver(req.principal.userId, tripId);
  }

  @Get('reservations/my')
  myReservations(@Req() req: AuthenticatedRequest) {
    return this.service.forMember(req.principal.userId);
  }

  @Post('participations/:id/cancel')
  @HttpCode(200)
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(req.principal.userId, id);
  }

  @Post('participations/:id/board')
  @HttpCode(200)
  board(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.board(req.principal.userId, id);
  }

  @Post('trips/:tripId/transition')
  @HttpCode(200)
  transition(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() body: TripTransitionDto,
  ) {
    return this.service.transition(req.principal.userId, tripId, body.action);
  }
}
