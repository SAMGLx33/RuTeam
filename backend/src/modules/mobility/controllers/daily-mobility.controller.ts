import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { DailyMobilityService } from '../application/daily-mobility.service.js';

class AgendaQuery {
  @ApiPropertyOptional({ format: 'date' })
  @Matches(/^20\d{2}-\d{2}-\d{2}$/)
  @IsOptional()
  start?: string;

  @ApiPropertyOptional({ enum: [7, 28] })
  @Type(() => Number)
  @IsIn([7, 28])
  @IsOptional()
  days?: number;
}
@ApiTags('daily-mobility')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('mobility')
export class DailyMobilityController {
  constructor(private readonly service: DailyMobilityService) {}
  @Get('agenda')
  @Header('Cache-Control', 'private, no-store')
  agenda(@Req() req: AuthenticatedRequest, @Query() input: AgendaQuery) {
    return this.service.agenda(
      req.principal.userId,
      input.start,
      input.days ?? 7,
    );
  }
  @Get('activity')
  @Header('Cache-Control', 'private, no-store')
  activity(@Req() req: AuthenticatedRequest) {
    return this.service.activities(req.principal.userId);
  }
}
