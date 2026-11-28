import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../../../common/guards/session.guard.js';
import { RecoveryService } from '../application/recovery.service.js';
import {
  AccountEmailDto,
  AccountResetDto,
  VerifyRecoveryDto,
} from '../dto/account.dto.js';
import { ConfigureRecoveryDto, RecoveryCodeDto } from '../dto/recovery.dto.js';
import { AccountSessionGuard } from '../guards/account-session.guard.js';

@ApiTags('account-recovery')
@Controller('auth/recovery')
export class RecoveryController {
  constructor(private readonly recovery: RecoveryService) {}

  @Get('availability')
  @Header('Cache-Control', 'no-store')
  availability() {
    return this.recovery.availability();
  }

  @Get('contact')
  @Header('Cache-Control', 'no-store')
  @UseGuards(AccountSessionGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  status(@Req() req: AuthenticatedRequest) {
    return this.recovery.status(req.principal.userId);
  }

  @Put('contact')
  @Header('Cache-Control', 'no-store')
  @UseGuards(AccountSessionGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  configure(
    @Req() req: AuthenticatedRequest,
    @Body() { password, channel, contact }: ConfigureRecoveryDto,
  ) {
    return this.recovery.configure(
      req.principal,
      { channel, contact },
      password,
    );
  }

  @Post('contact/request')
  @Header('Cache-Control', 'no-store')
  @UseGuards(AccountSessionGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  send(@Req() req: AuthenticatedRequest) {
    return this.recovery.sendConfirmation(req.principal);
  }

  @Post('contact/confirm')
  @Header('Cache-Control', 'no-store')
  @UseGuards(AccountSessionGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  confirm(@Req() req: AuthenticatedRequest, @Body() { code }: RecoveryCodeDto) {
    return this.recovery.confirm(req.principal, code);
  }

  @Post('request')
  @Header('Cache-Control', 'no-store')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  request(@Body() { email }: AccountEmailDto) {
    return this.recovery.requestReset(email);
  }

  @Post('verify')
  @Header('Cache-Control', 'no-store')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verify(@Body() { email, code }: VerifyRecoveryDto) {
    return this.recovery.verify(email, code);
  }

  @Post('reset')
  @Header('Cache-Control', 'no-store')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  reset(@Body() { token, password }: AccountResetDto) {
    return this.recovery.reset(token, password);
  }
}
