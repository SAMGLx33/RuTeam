import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { EnvironmentService } from '../application/environment.service.js';
import { AlternativeMobilityDto } from '../dto/energy.dto.js';

@ApiTags('mobility-environment')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('mobility/environment/trips')
export class EnvironmentController {
  constructor(private readonly service: EnvironmentService) {}

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  trip(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.trip(req.principal.userId, id);
  }

  @Put(':id/alternative')
  @Header('Cache-Control', 'private, no-store')
  alternative(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: AlternativeMobilityDto,
  ) {
    return this.service.alternative(req.principal.userId, id, input);
  }
}
