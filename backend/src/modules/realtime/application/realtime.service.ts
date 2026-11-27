import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { RealtimeSignal } from '@ruteam/contracts';
import {
  AuthService,
  type SessionPrincipal,
} from '../../auth/application/auth.service.js';
import {
  RealtimeListener,
  type DatabaseChange,
} from '../infrastructure/realtime-listener.js';
import { RealtimeAccess } from '../infrastructure/realtime-access.js';

type Connection = {
  start: () => void;
  write: (signal: RealtimeSignal) => void;
  finish: () => void;
  onClose: (fn: () => void) => void;
};
@Injectable()
export class RealtimeService {
  private readonly sessions = new Map<string, number>();

  constructor(
    private readonly realtime: RealtimeListener,
    private readonly access: RealtimeAccess,
    private readonly auth: AuthService,
  ) {}

  async connect(
    principal: SessionPrincipal,
    token: string | undefined,
    transport: Connection,
    tripId?: string,
  ) {
    if (!this.realtime.available())
      throw new ServiceUnavailableException(
        'Actualización en tiempo real temporalmente no disponible',
      );
    if (tripId && !(await this.access.trip(tripId, principal.userId, 'TRIP')))
      throw new NotFoundException('Viaje no disponible');
    const session = principal.sessionId;
    const count = this.sessions.get(session) ?? 0;
    if (count >= 5)
      throw new HttpException(
        'Demasiadas conexiones activas',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    this.sessions.set(session, count + 1);
    let open = true;
    let pending = new Map<string, DatabaseChange>();
    let flushing = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const close = () => {
      if (!open) return;
      open = false;
      unsubscribe();
      clearInterval(heartbeat);
      clearTimeout(timeout);
      pending.clear();
      const left = (this.sessions.get(session) ?? 1) - 1;
      if (left) this.sessions.set(session, left);
      else this.sessions.delete(session);
      transport.finish();
    };
    const validate = async () => {
      try {
        const current = await this.auth.authenticate(token, true);
        return (
          open &&
          current.sessionId === session &&
          current.userId === principal.userId
        );
      } catch {
        if (open) transport.write({ kind: 'SESSION_ENDED' });
        close();
        return false;
      }
    };
    const flush = async () => {
      if (flushing || !open) return;
      flushing = true;
      const batch = pending;
      pending = new Map();
      try {
        if (!(await validate())) return;
        if (!batch.size) transport.write({ kind: 'PING' });
        if (batch.has('feed')) transport.write({ kind: 'FEED' });
        for (const item of batch.values()) {
          if (!open) break;
          if (item.kind === 'SESSION') continue;
          if (item.kind === 'PERSON') transport.write({ kind: 'PERSON' });
          else if (
            (await this.access.trip(item.id, principal.userId, item.kind)) &&
            open
          )
            transport.write({ kind: item.kind, tripId: item.id });
        }
      } catch {
        close();
      } finally {
        flushing = false;
        if (pending.size && open) schedule();
      }
    };
    const schedule = () => {
      if (timeout || !open || flushing) return;
      timeout = setTimeout(() => {
        timeout = undefined;
        void flush();
      }, 120);
    };
    const heartbeat = setInterval(() => void flush(), 15_000);
    heartbeat.unref();
    const unsubscribe = this.realtime.subscribe((item) => {
      if (!item) return close();
      if (item.kind === 'SESSION') {
        if (item.id === session) {
          transport.write({ kind: 'SESSION_ENDED' });
          close();
        }
        return;
      }
      if (item.kind === 'PERSON') {
        if (item.id !== principal.userId) return;
        pending.set('PERSON', item);
      } else {
        if (item.kind === 'TRIP' && !tripId)
          pending.set('feed', { kind: 'SESSION', id: session });
        if (!tripId || tripId === item.id)
          pending.set(item.kind + ':' + item.id, item);
      }
      if (pending.size > 100) return close();
      if (pending.size) schedule();
    });
    transport.onClose(close);
    if (!open) return;
    transport.start();
    transport.write({ kind: 'READY' });
  }
}
