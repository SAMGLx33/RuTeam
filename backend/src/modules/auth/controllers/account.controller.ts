import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import type { AuthenticatedRequest } from '../../../common/guards/session.guard.js';
import { AccountService } from '../application/account.service.js';
import { AccountSessionGuard } from '../guards/account-session.guard.js';
import {
  AccountEmailDto,
  AccountLoginDto,
  AccountRegisterDto,
  AccountResetDto,
  OnboardingDto,
} from '../dto/account.dto.js';
@ApiTags('account')
@Controller('auth')
export class AccountController {
  constructor(
    private readonly accounts: AccountService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  @Post('register')
  @HttpCode(202)
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  register(@Body() data: AccountRegisterDto) {
    return this.accounts.register(data);
  }
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() data: AccountLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, ...session } = await this.accounts.login(
      data.email,
      data.password,
    );
    if (req.headers['x-ruteam-client'] === 'native')
      return { ...session, token };
    res.cookie('ruteam_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.env.NODE_ENV === 'production',
      path: '/api/v1',
      expires: new Date(session.expiresAt),
    });
    return session;
  }
  @Get('account')
  @UseGuards(AccountSessionGuard)
  @Header('Cache-Control', 'no-store')
  account(@Req() req: AuthenticatedRequest) {
    return this.accounts.account(req.principal.userId);
  }
  @Patch('onboarding')
  @UseGuards(AccountSessionGuard)
  @Header('Cache-Control', 'no-store')
  onboarding(@Req() req: AuthenticatedRequest, @Body() data: OnboardingDto) {
    return this.accounts.onboarding(req.principal.userId, data);
  }
  @Post('email/request')
  @HttpCode(202)
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  requestEmail(@Body() data: AccountEmailDto) {
    return this.accounts.requestEmail(data.email, 'EMAIL_CONFIRMATION');
  }
  @Post('email/confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  confirmEmail(@Body() data: AccountResetDto) {
    return this.accounts.confirmEmail(data.token, data.password);
  }
  @Post('password/request')
  @HttpCode(202)
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  requestPassword(@Body() data: AccountEmailDto) {
    return this.accounts.requestEmail(data.email, 'PASSWORD_RESET');
  }
  @Post('password/reset')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  resetPassword(@Body() data: AccountResetDto) {
    return this.accounts.resetPassword(data.token, data.password);
  }
}
