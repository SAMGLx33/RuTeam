import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { connect as connectTcp, type Socket } from 'node:net';
import { connect as connectTls } from 'node:tls';
import { once } from 'node:events';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';

/** Minimal SMTP submission: implicit TLS, or loopback plaintext in nonproduction.
 * No STARTTLS downgrade, arbitrary URLs, disk capture, or messages/tokens in logs. */
@Injectable()
export class EmailDelivery {
  constructor(@Inject(ENVIRONMENT) private readonly env: Environment) {}
  isReady(): boolean {
    const {
      SMTP_HOST: host,
      MAIL_FROM: from,
      SMTP_USER: user,
      SMTP_PASSWORD: password,
    } = this.env;
    return (
      !!host &&
      !/[\s\r\n]/.test(host) &&
      !!from &&
      /^[^\s<>@]+@[^\s<>@]+$/.test(from) &&
      !!user === !!password &&
      (this.env.SMTP_SECURE === true ||
        (this.env.NODE_ENV !== 'production' &&
          ['localhost', '127.0.0.1', '::1'].includes(host)))
    );
  }
  async send(
    to: string,
    subject: string,
    body: string,
    deadlineMs = 15000,
  ): Promise<void> {
    if (!this.isReady() || /[\r\n<>]/.test(to) || /[\r\n]/.test(subject))
      throw new ServiceUnavailableException(
        'El servicio de correo no está configurado de forma segura',
      );
    const secure = this.env.SMTP_SECURE === true;
    const options = {
      host: this.env.SMTP_HOST!,
      port: this.env.SMTP_PORT ?? (secure ? 465 : 25),
    };
    const socket = secure
      ? connectTls({ ...options, servername: this.env.SMTP_HOST })
      : connectTcp(options);
    const smtp = new SmtpReplies(socket);
    // Bound the complete submission, including a peer that keeps idle timers alive.
    const deadline = setTimeout(
      () => socket.destroy(new Error('SMTP total deadline')),
      Number.isFinite(deadlineMs) && deadlineMs > 0
        ? Math.min(deadlineMs, 15000)
        : 15000,
    );
    try {
      await once(socket, secure ? 'secureConnect' : 'connect');
      await smtp.expect([220]);
      await smtp.command('EHLO ruteam.local', [250]);
      if (this.env.SMTP_USER && this.env.SMTP_PASSWORD) {
        const plain = Buffer.from(
          `\0${this.env.SMTP_USER}\0${this.env.SMTP_PASSWORD}`,
        ).toString('base64');
        await smtp.command(`AUTH PLAIN ${plain}`, [235]);
      }
      await smtp.command(`MAIL FROM:<${this.env.MAIL_FROM}>`, [250]);
      await smtp.command(`RCPT TO:<${to}>`, [250, 251]);
      await smtp.command('DATA', [354]);
      const encoded =
        Buffer.from(body, 'utf8')
          .toString('base64')
          .match(/.{1,76}/g)
          ?.join('\r\n') ?? '';
      const message = `From: ${this.env.MAIL_FROM}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${encoded}\r\n.`;
      await smtp.command(message, [250]);
      await smtp.command('QUIT', [221]);
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo enviar el correo; inténtalo más tarde',
      );
    } finally {
      clearTimeout(deadline);
      socket.destroy();
    }
  }
}

class SmtpReplies {
  private buffer = '';
  private pending: number[] = [];
  private waiting: {
    resolve: (code: number) => void;
    reject: (reason: Error) => void;
  }[] = [];
  private failure: Error | null = null;
  constructor(private readonly socket: Socket) {
    socket.setEncoding('utf8');
    socket.setTimeout(10000, () => socket.destroy(new Error('SMTP timeout')));
    socket.on('error', () => this.fail());
    socket.on('close', () => this.fail());
    socket.on('data', (chunk: string) => {
      this.buffer += chunk;
      if (this.buffer.length > 65536) {
        socket.destroy(new Error('SMTP response too large'));
        return;
      }
      let newline: number;
      while ((newline = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, newline).replace(/\r$/, '');
        this.buffer = this.buffer.slice(newline + 1);
        if (!/^\d{3}[ -]/.test(line)) {
          socket.destroy(new Error('Invalid SMTP response'));
          return;
        }
        if (line[3] === ' ') {
          const code = Number(line.slice(0, 3));
          const waiter = this.waiting.shift();
          if (waiter) waiter.resolve(code);
          else this.pending.push(code);
        }
      }
    });
  }
  private fail(): void {
    this.failure = new Error('SMTP unavailable');
    for (const waiter of this.waiting.splice(0)) waiter.reject(this.failure);
  }
  async expect(allowed: number[]): Promise<void> {
    if (this.failure) throw this.failure;
    const code =
      this.pending.shift() ??
      (await new Promise<number>((resolve, reject) =>
        this.waiting.push({ resolve, reject }),
      ));
    if (!allowed.includes(code)) throw new Error('SMTP rejected submission');
  }
  async command(command: string, allowed: number[]): Promise<void> {
    this.socket.write(`${command}\r\n`);
    await this.expect(allowed);
  }
}
