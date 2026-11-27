import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../../../common/guards/session.guard.js';
import { AccountLifecycleService } from '../application/account-lifecycle.service.js';
import {
  RecentPasswordDto,
  CloseAccountDto,
  AccountRecoveryActionDto,
  AccountRecoveryStatusDto,
} from '../dto/account-lifecycle.dto.js';
import { AccountSessionGuard } from '../guards/account-session.guard.js';

@ApiTags('account-lifecycle')
@Controller('auth/lifecycle')
export class AccountLifecycleController {
  constructor(
    private readonly service: AccountLifecycleService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(AccountSessionGuard)
  @Header('Cache-Control', 'no-store')
  settings(@Req() req: AuthenticatedRequest) {
    return this.service.settings(req.principal);
  }

  @Post('sessions/:id/revoke')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(AccountSessionGuard)
  @HttpCode(204)
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  revoke(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RecentPasswordDto,
  ) {
    return this.service.revoke(req.principal, input.password, id);
  }

  @Post('close')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(AccountSessionGuard)
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  async close(
    @Req() req: AuthenticatedRequest,
    @Body() input: CloseAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const status = await this.service.close(req.principal, input);
    res.clearCookie('ruteam_session', {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.env.NODE_ENV === 'production',
      path: '/api/v1',
    });
    return status;
  }

  @Post('status')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  status(@Body() input: AccountRecoveryStatusDto) {
    return this.service.status(input.email, input.password);
  }

  @Post('recover')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  recover(@Body() input: AccountRecoveryActionDto) {
    return this.service.recover(input);
  }
}
