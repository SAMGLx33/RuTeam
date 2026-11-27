import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { MobilityStatisticsService } from '../application/mobility-statistics.service.js';

class MobilityStatisticsQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 36, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number;
}

@ApiTags('mobility-statistics')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('mobility/statistics')
export class MobilityStatisticsController {
  constructor(private readonly service: MobilityStatisticsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  summary(
    @Req() req: AuthenticatedRequest,
    @Query() input: MobilityStatisticsQuery,
  ) {
    return this.service.summary(req.principal.userId, input.months ?? 12);
  }
}
