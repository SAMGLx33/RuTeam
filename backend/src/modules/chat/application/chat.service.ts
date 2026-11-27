import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { ChatConversation, ChatMessage } from '@ruteam/contracts';
import {
  chatAccess,
  isAfterChatMarker,
  type ChatMarker,
} from '../domain/chat.policy.js';
import {
  ChatRepository,
  chatPageSize,
  type ChatMessageRow,
  type ChatTripRow,
  type ChatUnit,
} from '../infrastructure/repositories/chat.repository.js';

function parseCursor(cursor?: string): ChatMarker | undefined {
  if (cursor === undefined) return undefined;
  if (/^[\w-]{1,128}$/.test(cursor)) {
    const [date, id, extra] = Buffer.from(cursor, 'base64url')
      .toString('utf8')
      .split('|');
    const at = new Date(date);
    if (
      !extra &&
      id &&
      isUUID(id) &&
      Number.isFinite(at.getTime()) &&
      at.toISOString() === date
    )
      return { at, id };
  }
  throw new BadRequestException('Cursor de conversación inválido');
}

function page<T>(rows: T[], marker: (row: T) => ChatMarker) {
  const items = rows.slice(0, chatPageSize);
  const last = items.at(-1);
  const position = last && rows.length > chatPageSize ? marker(last) : null;
  return {
    items,
    nextCursor: position
      ? Buffer.from(`${position.at.toISOString()}|${position.id}`).toString(
          'base64url',
        )
      : null,
  };
}

function conversation(row: ChatTripRow): ChatConversation {
  if (row.status === 'CANCELADO')
    throw new NotFoundException('Conversación inexistente');
  const message = row.chatMessages[0];
  const read = row.chatReads[0];
  return {
    tripId: row.id,
    originLabel: row.originLabel,
    destinationLabel: row.stops[0]?.label ?? 'Destino',
    departureAt: row.departureAt.toISOString(),
    status: row.status,
    canSend: row.status !== 'COMPLETADO' && row.status !== 'INTERRUMPIDO',
    hasUnread:
      !!message &&
      (!read ||
        isAfterChatMarker(
          { at: message.createdAt, id: message.id },
          { at: read.lastReadAt, id: read.lastReadMessageId },
        )),
  };
}

function messageView(row: ChatMessageRow, actorId: string): ChatMessage {
  return {
    id: row.id,
    authorName: row.author.profile?.displayName ?? 'Participante',
    isMine: row.authorId === actorId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

async function authorize(unit: ChatUnit, actorId: string) {
  const trip = await unit.trip();
  const access = chatAccess(
    trip,
    actorId,
    trip.reservations[0] ?? null,
    new Date(),
  );
  if (access === 'DENIED')
    throw new NotFoundException('Conversación inexistente');
  return { trip, access };
}

@Injectable()
export class ChatService {
  constructor(private readonly repository: ChatRepository) {}

  async list(actorId: string, cursor?: string) {
    const rows = await this.repository.conversations(
      actorId,
      new Date(),
      parseCursor(cursor),
    );
    const result = page(rows, ({ departureAt, id }) => ({
      at: departureAt,
      id,
    }));
    const unread = await this.repository.unread(
      actorId,
      result.items.map(({ id }) => id),
    );
    return {
      items: result.items.map((row) => ({
        ...conversation(row),
        unreadCount: unread.get(row.id) ?? 0,
      })),
      nextCursor: result.nextCursor,
    };
  }

  history(tripId: string, actorId: string, cursor?: string) {
    const position = parseCursor(cursor);
    return this.repository.withTripLock(tripId, actorId, async (unit) => {
      const { trip } = await authorize(unit, actorId);
      const rows = await unit.history(position);
      const result = page(rows, ({ createdAt, id }) => ({ at: createdAt, id }));
      return {
        conversation: conversation(trip),
        messages: result.items.map((row) => messageView(row, actorId)),
        nextCursor: result.nextCursor,
      };
    });
  }

  send(tripId: string, actorId: string, clientId: string, text: string) {
    const body = text.trim();
    if (!body) throw new BadRequestException('Escribe un mensaje');
    return this.repository.withTripLock(tripId, actorId, async (unit) => {
      const { trip, access } = await authorize(unit, actorId);
      const existing = await unit.existing(clientId);
      if (existing) {
        if (existing.body !== body)
          throw new ConflictException(
            'Este identificador ya corresponde a otro mensaje',
          );
        return messageView(existing, actorId);
      }
      if (access !== 'WRITE')
        throw new ConflictException('La conversación es de sólo lectura');
      const row = await unit.createMessage(clientId, body, new Date());
      await unit.notifyOthers(trip.driverId, row.createdAt);
      return messageView(row, actorId);
    });
  }

  async read(tripId: string, actorId: string, messageId: string) {
    await this.repository.withTripLock(tripId, actorId, async (unit) => {
      const { trip } = await authorize(unit, actorId);
      const message = await unit.message(messageId);
      if (!message) throw new NotFoundException('Mensaje inexistente');
      const read = trip.chatReads[0];
      const marker = { at: message.createdAt, id: message.id };
      if (
        read &&
        !isAfterChatMarker(marker, {
          at: read.lastReadAt,
          id: read.lastReadMessageId,
        })
      )
        return;
      await unit.markRead(marker);
    });
  }
}
