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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { PrivateSafetyService } from '../application/private-safety.service.js';
import {
  EmergencyContactDto,
  TripIncidentDto,
  PrivateHistoryQuery,
} from '../dto/private-safety.dto.js';

@ApiTags('private-safety')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller()
export class PrivateSafetyController {
  constructor(private readonly service: PrivateSafetyService) {}

  @Get('me/emergency-contacts')
  @Header('Cache-Control', 'private, no-store')
  contacts(@Req() req: AuthenticatedRequest) {
    return this.service.contacts(req.principal.userId);
  }

  @Post('me/emergency-contacts')
  @Header('Cache-Control', 'private, no-store')
  createContact(
    @Req() req: AuthenticatedRequest,
    @Body() input: EmergencyContactDto,
  ) {
    return this.service.createContact(req.principal.userId, input);
  }

  @Put('me/emergency-contacts/:id')
  @Header('Cache-Control', 'private, no-store')
  replaceContact(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: EmergencyContactDto,
  ) {
    return this.service.replaceContact(req.principal.userId, id, input);
  }

  @Delete('me/emergency-contacts/:id')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(204)
  deleteContact(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteContact(req.principal.userId, id);
  }

  @Get('me/incidents')
  @Header('Cache-Control', 'private, no-store')
  personalHistory(
    @Req() req: AuthenticatedRequest,
    @Query() query: PrivateHistoryQuery,
  ) {
    return this.service.personalHistory(req.principal.userId, query.offset);
  }

  @Get('me/incidents/trips')
  @Header('Cache-Control', 'private, no-store')
  eligibleTrips(
    @Req() req: AuthenticatedRequest,
    @Query() query: PrivateHistoryQuery,
  ) {
    return this.service.eligibleTrips(req.principal.userId, query.offset);
  }

  @Get('me/incidents/:id/export')
  @Header('Cache-Control', 'private, no-store')
  exportIncident(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.exportIncident(req.principal.userId, id);
  }

  @Get('trips/:tripId/incidents')
  @Header('Cache-Control', 'private, no-store')
  incidents(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.service.incidents(req.principal.userId, tripId);
  }

  @Post('trips/:tripId/incidents')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  incident(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() input: TripIncidentDto,
  ) {
    return this.service.createIncident(req.principal.userId, tripId, input);
  }
}
