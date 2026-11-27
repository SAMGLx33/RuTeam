import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { EconomicHistoryService } from '../application/economic-history.service.js';
import { EconomicHistoryDto } from '../dto/economic-history.dto.js';

@ApiTags('economic-history')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('economics/history')
export class EconomicHistoryController {
  constructor(private readonly service: EconomicHistoryService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(@Req() req: AuthenticatedRequest, @Query() input: EconomicHistoryDto) {
    return this.service.list(req.principal.userId, input);
  }
}
