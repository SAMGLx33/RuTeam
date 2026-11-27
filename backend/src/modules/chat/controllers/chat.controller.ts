import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  SessionGuard,
  type AuthenticatedRequest,
} from '../../../common/guards/session.guard.js';
import { ChatService } from '../application/chat.service.js';
import {
  ChatPageDto,
  ReadChatDto,
  SendChatMessageDto,
} from '../dto/chat.dto.js';

@ApiTags('chat')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller()
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get('chat/conversations')
  list(@Req() req: AuthenticatedRequest, @Query() query: ChatPageDto) {
    return this.service.list(req.principal.userId, query.cursor);
  }

  @Get('trips/:tripId/chat')
  history(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Query() query: ChatPageDto,
  ) {
    return this.service.history(tripId, req.principal.userId, query.cursor);
  }

  @Post('trips/:tripId/chat/messages')
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  send(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() input: SendChatMessageDto,
  ) {
    return this.service.send(
      tripId,
      req.principal.userId,
      input.clientMessageId,
      input.body,
    );
  }

  @Post('trips/:tripId/chat/read')
  @HttpCode(204)
  read(
    @Req() req: AuthenticatedRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() input: ReadChatDto,
  ) {
    return this.service.read(tripId, req.principal.userId, input.messageId);
  }
}
