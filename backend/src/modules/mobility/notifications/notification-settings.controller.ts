import {
  Body,
  Controller,
  Delete,
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
import { NotificationSettingsService } from './notification-settings.service.js';
import {
  NotificationSettingsDto,
  PushDeviceDto,
} from './notification-settings.dto.js';

@ApiTags('notification-settings')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(private readonly settings: NotificationSettingsService) {}
  @Get()
  @Header('Cache-Control', 'private, no-store')
  view(@Req() req: AuthenticatedRequest) {
    return this.settings.settings(req.principal.userId);
  }

  @Put()
  @Header('Cache-Control', 'private, no-store')
  update(
    @Req() req: AuthenticatedRequest,
    @Body() dto: NotificationSettingsDto,
  ) {
    return this.settings.update(req.principal.userId, dto);
  }

  @Post('devices')
  @Header('Cache-Control', 'private, no-store')
  register(@Req() req: AuthenticatedRequest, @Body() dto: PushDeviceDto) {
    return this.settings.register(req.principal, dto);
  }

  @Delete('devices/:id')
  @HttpCode(204)
  revoke(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.settings.revoke(req.principal.userId, id);
  }
}
