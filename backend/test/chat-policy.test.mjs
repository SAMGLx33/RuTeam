import { expect, test } from '@jest/globals';
import {
  chatAccess,
  chatRetentionMs,
  isAfterChatMarker,
} from '../dist/src/modules/chat/domain/chat.policy.js';

const now = new Date('2026-11-26T05:00:00Z');
const driver = 'driver';
const rider = 'rider';
const confirmed = { boardedAt: null };
const past = (ms) => new Date(now.getTime() - ms);
const trip = (status, finishedAt = null) => ({
  driverId: driver,
  status,
  finishedAt,
});

test.each(['PROGRAMADO', 'EN_CURSO'])(
  '%s permite conductor propio y participante confirmado, con independencia del abordaje',
  (status) => {
    expect(chatAccess(trip(status), driver, null, now)).toBe('WRITE');
    expect(chatAccess(trip(status), rider, confirmed, now)).toBe('WRITE');
    expect(chatAccess(trip(status), rider, null, now)).toBe('DENIED');
    expect(
      chatAccess(trip(status), rider, { ...confirmed, noShowAt: now }, now),
    ).toBe('DENIED');
  },
);
test('viaje cancelado bloquea hasta el historial del conductor', () => {
  expect(chatAccess(trip('CANCELADO'), driver, null, now)).toBe('DENIED');
  expect(chatAccess(trip('CANCELADO'), rider, confirmed, now)).toBe('DENIED');
});
test('24 h desde el cierre real: sólo abordados y conductor, exclusivamente lectura', () => {
  const boarded = { boardedAt: past(500) };
  const recentlyFinished = trip('COMPLETADO', past(chatRetentionMs - 1));
  expect(chatAccess(recentlyFinished, driver, null, now)).toBe('READ');
  expect(chatAccess(recentlyFinished, rider, boarded, now)).toBe('READ');
  expect(chatAccess(recentlyFinished, rider, confirmed, now)).toBe('DENIED');
  expect(
    chatAccess(trip('COMPLETADO', past(chatRetentionMs)), driver, null, now),
  ).toBe('DENIED');
  expect(chatAccess(trip('COMPLETADO'), driver, null, now)).toBe('DENIED');
});
test('marcador por timestamp e ID, sin retrocesos ni pérdida en empate', () => {
  const marker = { at: now, id: 'b' };
  expect(isAfterChatMarker({ at: now, id: 'c' }, marker)).toBe(true);
  expect(isAfterChatMarker({ at: now, id: 'a' }, marker)).toBe(false);
  expect(isAfterChatMarker({ at: now, id: 'b' }, marker)).toBe(false);
  expect(isAfterChatMarker({ at: past(1), id: 'z' }, marker)).toBe(false);
});
