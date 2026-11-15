import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SessionGuard } from '../../../common/guards/session.guard.js';
import { CampusService } from '../application/campus.service.js';
@ApiTags('campus')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('campus')
export class CampusController {
  constructor(private readonly campus: CampusService) {}
  @Get('destinations') destinations() {
    return this.campus.destinations();
  }
}
