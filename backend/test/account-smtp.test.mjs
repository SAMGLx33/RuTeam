import { expect, test } from '@jest/globals';
import { createServer } from 'node:net';
import { Buffer } from 'node:buffer';
import {
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
} from 'node:timers';
import { EmailDelivery } from '../dist/src/modules/auth/infrastructure/email-delivery.js';

const environment = (port) => ({
  NODE_ENV: 'test',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: port,
  SMTP_SECURE: false,
  MAIL_FROM: 'sender@test.invalid',
});
async function withServer(handler, run) {
  const peers = new Set();
  const server = createServer((socket) => {
    peers.add(socket);
    socket.on('close', () => peers.delete(socket));
    socket.on('error', () => {});
    handler(socket);
  });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    return await run(server.address().port);
  } finally {
    for (const peer of peers) peer.destroy();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
}
test('transporte SMTP real completa diálogo loopback y entrega contenido sin datos USC', async () => {
  const commands = [],
    data = [];
  await withServer(
    (socket) => {
      socket.setEncoding('utf8');
      socket.write('220 local fixture SMTP\r\n');
      let buffer = '',
        readingData = false;
      socket.on('data', (chunk) => {
        buffer += chunk;
        let index;
        while ((index = buffer.indexOf('\r\n')) >= 0) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          if (readingData) {
            if (line === '.') {
              readingData = false;
              socket.write('250 queued\r\n');
            } else data.push(line);
            continue;
          }
          commands.push(line);
          if (line.startsWith('EHLO'))
            socket.write('250-local.test\r\n250 SIZE 32768\r\n');
          else if (line.startsWith('MAIL FROM:') || line.startsWith('RCPT TO:'))
            socket.write('250 OK\r\n');
          else if (line === 'DATA') {
            readingData = true;
            socket.write('354 Send data\r\n');
          } else if (line === 'QUIT') socket.end('221 Bye\r\n');
          else socket.write('500 Unexpected fixture command\r\n');
        }
      });
    },
    async (port) => {
      await new EmailDelivery(environment(port)).send(
        'recipient@test.invalid',
        'Local SMTP test',
        'Mensaje local de transporte.',
      );
    },
  );
  expect(commands).toContain('MAIL FROM:<sender@test.invalid>');
  expect(commands).toContain('RCPT TO:<recipient@test.invalid>');
  expect(commands.at(-1)).toBe('QUIT');
  const blank = data.indexOf('');
  expect(
    Buffer.from(data.slice(blank + 1).join(''), 'base64').toString('utf8'),
  ).toBe('Mensaje local de transporte.');
  expect([...commands, ...data].join('\n')).not.toContain('usc.edu.co');
});
test('límite total SMTP cierra peer que mantiene activo el timeout de inactividad', async () => {
  await withServer(
    (socket) => {
      const interval = setInterval(
        () => socket.write('220-partial greeting\r\n'),
        20,
      );
      socket.on('close', () => clearInterval(interval));
    },
    async (port) => {
      let deadline;
      try {
        const result = await Promise.race([
          new EmailDelivery(environment(port))
            .send('recipient@test.invalid', 'Local test', 'payload', 100)
            .then(
              () => ({ kind: 'delivered' }),
              (error) => ({ kind: 'rejected', status: error.status }),
            ),
          new Promise((resolve) => {
            deadline = setTimeout(() => resolve({ kind: 'overran' }), 1000);
          }),
        ]);
        expect(result).toEqual({ kind: 'rejected', status: 503 });
      } finally {
        clearTimeout(deadline);
      }
    },
  );
});
test('transporte rechaza SMTP sin TLS fuera de loopback no productivo', () => {
  expect(
    new EmailDelivery({ ...environment(25), NODE_ENV: 'production' }).isReady(),
  ).toBe(false);
  expect(
    new EmailDelivery({
      ...environment(25),
      SMTP_HOST: 'mail.example.invalid',
    }).isReady(),
  ).toBe(false);
});
