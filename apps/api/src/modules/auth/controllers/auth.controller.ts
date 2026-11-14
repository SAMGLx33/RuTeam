import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from '../application/auth.service.js';
import { DemoLoginDto } from '../dto/demo-login.dto.js';
import {
  SessionGuard,
  SessionRevocationGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('demo/login')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async login(
    @Body() dto: DemoLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, ...session } = await this.auth.loginDemo(dto.identity);
    res.setHeader('Cache-Control', 'no-store');
    if (req.headers['x-ruteam-client'] === 'native')
      return { ...session, token };
    res.cookie('ruteam_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      path: '/api/v1',
      expires: new Date(session.expiresAt),
    });
    return session;
  }
  @Get('me')
  @ApiCookieAuth()
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.auth.currentUser(req.principal.userId);
  }
  @Post('logout')
  @UseGuards(SessionRevocationGuard)
  @HttpCode(204)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(req.principal.sessionId);
    res.clearCookie('ruteam_session', {
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/v1',
    });
  }
}
