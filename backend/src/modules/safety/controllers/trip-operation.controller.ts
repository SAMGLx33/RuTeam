import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { TripOperationService } from '../application/trip-operation.service.js';

@ApiTags('trip-operation')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('trips/:id/operation')
export class TripOperationController {
  constructor(private readonly service: TripOperationService) {}
  @Get()
  @Header('Cache-Control', 'private, no-store')
  context(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.context(id, req.principal.userId);
  }
}
