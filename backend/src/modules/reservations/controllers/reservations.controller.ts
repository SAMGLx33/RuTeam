import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { ReservationsService } from '../application/reservations.service.js';
import { TripTransitionGuard } from './trip-transition.guard.js';
import {
  ConfirmParticipationDto,
  TripTransitionDto,
} from '../dto/reservation.dto.js';

import { RedeemBoardingPassDto } from '../dto/boarding-pass.dto.js';

@ApiTags('reservations')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller()
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post('trips/:tripId/participations')
  @UseGuards(SessionGuard)
  confirm(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() body: ConfirmParticipationDto,
  ) {
    return this.service.confirm(req.principal.userId, tripId, body);
  }

  @Get('trips/:tripId/participations')
  @UseGuards(SessionGuard)
  participants(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.service.forDriver(req.principal.userId, tripId);
  }

  @Get('reservations/my')
  @UseGuards(SessionGuard)
  myReservations(@Req() req: AuthenticatedRequest) {
    return this.service.forMember(req.principal.userId);
  }

  @Post('participations/:id/cancel')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(req.principal.userId, id);
  }

  @Post('participations/:id/board')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  board(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.board(req.principal.userId, id);
  }

  @Post('participations/:id/boarding-pass')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  issueBoardingPass(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.issueBoardingPass(req.principal.userId, id);
  }

  @Post('trips/:tripId/boarding-pass/redeem')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  redeemBoardingPass(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() body: RedeemBoardingPassDto,
  ) {
    return this.service.redeemBoardingPass(
      req.principal.userId,
      tripId,
      body.code,
    );
  }

  @Post('participations/:id/no-show')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  noShow(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.noShow(req.principal.userId, id);
  }

  @Post('trips/:tripId/stops/:stopId/reach')
  @UseGuards(SessionGuard)
  @HttpCode(200)
  reachStop(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
  ) {
    return this.service.reachStop(req.principal.userId, tripId, stopId);
  }

  @Post('trips/:tripId/transition')
  @UseGuards(TripTransitionGuard)
  @HttpCode(200)
  transition(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() body: TripTransitionDto,
  ) {
    return this.service.transition(req.principal.userId, tripId, body.action);
  }
}
