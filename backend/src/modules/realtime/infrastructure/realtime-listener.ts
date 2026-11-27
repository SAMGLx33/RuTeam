import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { Client } from 'pg';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';

type ChangeKind = 'TRIP' | 'TRACKING' | 'CHAT' | 'PERSON' | 'SESSION';
export interface DatabaseChange {
  kind: ChangeKind;
  id: string;
}
const signal = /^(TRIP|TRACKING|CHAT|PERSON|SESSION):([0-9a-f-]{36})$/;

@Injectable()
export class RealtimeListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeListener.name);
  private readonly observers = new Set<
    (value: DatabaseChange | null) => void
  >();
  private connection?: Client;
  private retry?: ReturnType<typeof setTimeout>;
  private closing = false;

  constructor(@Inject(ENVIRONMENT) private readonly env: Environment) {}

  onModuleInit() {
    void this.connect();
  }

  async onModuleDestroy() {
    this.closing = true;
    clearTimeout(this.retry);
    const connection = this.connection;
    this.connection = undefined;
    this.listening = false;
    for (const observer of this.observers) observer(null);
    this.observers.clear();
    if (connection) await connection.end().catch(() => {});
  }

  available() {
    return this.connection !== undefined && this.listening;
  }

  subscribe(observer: (value: DatabaseChange | null) => void) {
    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  }

  private listening = false;
  private async connect() {
    if (this.closing) return;
    const connection = new Client({
      connectionString: this.env.DATABASE_URL,
      connectionTimeoutMillis: 4000,
    });
    this.connection = connection;
    const reconnect = () => {
      if (this.connection !== connection || this.closing) return;
      this.connection = undefined;
      this.listening = false;
      for (const observer of this.observers) observer(null);
      void connection.end().catch(() => {});
      this.logger.warn('Se restablecerá el canal de cambios de PostgreSQL');
      this.retry = setTimeout(() => void this.connect(), 3000);
      this.retry.unref();
    };
    connection.on('error', reconnect);
    connection.on('end', reconnect);
    connection.on('notification', ({ payload }) => {
      const match = payload && signal.exec(payload);
      if (match)
        for (const observer of this.observers)
          observer({ kind: match[1] as ChangeKind, id: match[2] });
    });
    try {
      await connection.connect();
      if (this.closing || this.connection !== connection) return;
      await connection.query('LISTEN ruteam_refresh');
      this.listening = this.connection === connection;
    } catch {
      reconnect();
    }
  }
}
