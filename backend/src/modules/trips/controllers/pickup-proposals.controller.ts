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
import { PickupProposalsService } from '../application/pickup-proposals.service.js';
import { PickupDecisionDto } from '../dto/pickup-proposal.dto.js';

@ApiTags('pickup-proposals')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('trips/:tripId/pickup-proposals')
export class PickupProposalsController {
  constructor(private readonly service: PickupProposalsService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.service.list(req.principal.userId, tripId);
  }

  @Post()
  propose() {
    return this.service.propose();
  }

  @Post(':id/decision')
  @HttpCode(200)
  decide(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: PickupDecisionDto,
  ) {
    return this.service.decide(
      req.principal.userId,
      tripId,
      id,
      input.decision,
    );
  }
}
