import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { SavedMobilityService } from '../application/saved-mobility.service.js';
import { FrequentPlaceDto } from '../dto/frequent-place.dto.js';

@ApiTags('daily-mobility')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('mobility')
export class SavedMobilityController {
  constructor(private readonly mobility: SavedMobilityService) {}

  @Get('saved-trips')
  @Header('Cache-Control', 'private, no-store')
  saved(@Req() req: AuthenticatedRequest) {
    return this.mobility.saved(req.principal.userId);
  }

  @Put('saved-trips/:id')
  save(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mobility.save(req.principal.userId, id);
  }

  @Delete('saved-trips/:id')
  @HttpCode(204)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.mobility.remove(req.principal.userId, id);
  }

  @Put('saved-trips/:id/availability-alert')
  requestAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mobility.save(req.principal.userId, id, true);
  }

  @Delete('saved-trips/:id/availability-alert')
  @HttpCode(204)
  async cancelAlert(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.mobility.cancelAlert(req.principal.userId, id);
  }

  @Get('frequent-places')
  @Header('Cache-Control', 'private, no-store')
  places(@Req() req: AuthenticatedRequest) {
    return this.mobility.places(req.principal.userId);
  }

  @Post('frequent-places')
  createPlace(
    @Req() req: AuthenticatedRequest,
    @Body() input: FrequentPlaceDto,
  ) {
    return this.mobility.createPlace(req.principal.userId, input);
  }

  @Patch('frequent-places/:id')
  updatePlace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: FrequentPlaceDto,
  ) {
    return this.mobility.updatePlace(req.principal.userId, id, input);
  }

  @Delete('frequent-places/:id')
  @HttpCode(204)
  removePlace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mobility.removePlace(req.principal.userId, id);
  }
}
