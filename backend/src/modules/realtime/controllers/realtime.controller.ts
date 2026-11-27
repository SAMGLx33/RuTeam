import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  SessionGuard,
  sessionCredential,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { RealtimeService } from '../application/realtime.service.js';

@ApiTags('realtime')
@ApiBearerAuth()
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly service: RealtimeService) {}

  @Get()
  account(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    return this.open(req, res);
  }

  @Get('trips/:id')
  trip(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.open(req, res, id);
  }

  private open(req: AuthenticatedRequest, res: Response, tripId?: string) {
    return this.service.connect(
      req.principal,
      sessionCredential(req),
      {
        start: () => {
          res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'private, no-store, no-transform',
            'X-Accel-Buffering': 'no',
          });
          res.flushHeaders();
        },
        write: (signal) => {
          if (
            !res.writableEnded &&
            !res.write('data: ' + JSON.stringify(signal) + '\n\n')
          )
            res.end();
        },
        finish: () => {
          if (!res.writableEnded) res.end();
        },
        onClose: (close) => {
          res.once('close', close);
          if (res.destroyed) close();
        },
      },
      tripId,
    );
  }
}
