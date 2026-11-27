import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { RatingsService } from '../application/ratings.service.js';
import { RatingsPageDto, SubmitRatingDto } from '../dto/rating.dto.js';

@ApiTags('ratings')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class RatingsController {
  constructor(private readonly service: RatingsService) {}

  @Get('ratings/reputation')
  reputation(@Req() request: AuthenticatedRequest) {
    return this.service.reputation(request.principal.userId);
  }

  @Get('ratings')
  history(
    @Req() request: AuthenticatedRequest,
    @Query() query: RatingsPageDto,
  ) {
    return this.service.history(request.principal.userId, query.cursor);
  }

  @Get('trips/:tripId/ratings')
  detail(
    @Req() request: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.service.detail(request.principal.userId, tripId);
  }

  @Post('trips/:tripId/ratings')
  submit(
    @Req() request: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() input: SubmitRatingDto,
  ) {
    return this.service.submit(request.principal.userId, tripId, input);
  }
}
