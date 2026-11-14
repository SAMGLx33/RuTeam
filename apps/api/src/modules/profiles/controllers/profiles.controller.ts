import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { AuthService } from '../../auth/application/auth.service.js';
import { ProfilesService } from '../application/profiles.service.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';
@ApiTags('profile')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('me')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly auth: AuthService,
  ) {}
  @Get() me(@Req() req: AuthenticatedRequest) {
    return this.auth.currentUser(req.principal.userId);
  }
  @Patch('profile') update(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profiles.update(req.principal.userId, dto.displayName);
  }
}
