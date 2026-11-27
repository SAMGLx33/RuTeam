import {
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { SessionGuard } from '../../../common/guards/session.guard.js';
import { GeocodingService } from '../application/geocoding.service.js';
import {
  PlaceSearchDto,
  PlaceSearchResponseDto,
} from '../dto/place-search.dto.js';

@ApiTags('geocoding')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocoding: GeocodingService) {}

  @Post('search')
  @HttpCode(200)
  @ApiOkResponse({ type: PlaceSearchResponseDto })
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  async search(
    @Body() body: PlaceSearchDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const controller = new AbortController();
    const close = () => controller.abort();
    res.once('close', close);
    try {
      return await this.geocoding.search(body.query, controller.signal);
    } finally {
      res.off('close', close);
    }
  }
}
