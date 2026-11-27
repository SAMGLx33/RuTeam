import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { RecurringTripsService } from '../application/recurring-trips.service.js';
import {
  DuplicateTripDto,
  RecurringActionDto,
  RecurringTripDto,
} from '../dto/recurring-trip.dto.js';

@ApiTags('recurring-trips')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class RecurringTripsController {
  constructor(private readonly service: RecurringTripsService) {}

  @Get('trip-schedules')
  @Header('Cache-Control', 'private, no-store')
  list(@Req() req: AuthenticatedRequest) {
    return this.service.list(req.principal.userId);
  }

  @Get('trip-schedules/:id')
  @Header('Cache-Control', 'private, no-store')
  detail(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.detail(req.principal.userId, id);
  }

  @Post('trip-schedules')
  create(@Req() req: AuthenticatedRequest, @Body() input: RecurringTripDto) {
    return this.service.create(req.principal.userId, input);
  }

  @Put('trip-schedules/:id')
  edit(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RecurringTripDto,
  ) {
    return this.service.edit(req.principal.userId, id, input);
  }

  @Post('trip-schedules/:id/action')
  @HttpCode(200)
  change(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RecurringActionDto,
  ) {
    return this.service.change(req.principal.userId, id, input.action);
  }

  @Get('trips/:id/reuse')
  @Header('Cache-Control', 'private, no-store')
  reuse(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.reuse(req.principal.userId, id);
  }

  @Post('trips/:id/duplicate')
  duplicate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: DuplicateTripDto,
  ) {
    return this.service.duplicate(req.principal.userId, id, input.departureAt);
  }
}
