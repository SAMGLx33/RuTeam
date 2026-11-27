import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getNotificationId,
  parseOpenTarget,
  rewriteNativeOpenPath,
  takeGroupInvitation,
} from '../src/services/notifications/navigation-path.ts';

const id = '4bf835d1-dc9d-4657-a030-af76ee8b0358';
const code = 'sYNDPsHMJtv2aAKPeZ_OVb-EB2057enJXHM_zuvpZYk';

test('a remote tap can identify only an existing inbox notice', () => {
  assert.equal(
    getNotificationId({ route: '/notifications', notificationId: id }),
    id,
  );
  assert.equal(
    getNotificationId({ route: 'https://example.com', notificationId: id }),
    null,
  );
  assert.equal(
    getNotificationId({
      route: '/notifications',
      notificationId: `${id}/../../`,
    }),
    null,
  );
  assert.equal(getNotificationId({ route: '/chat', tripId: id }), null);
});

test('internal navigation accepts only known resources and canonical segments', () => {
  assert.deepEqual(parseOpenTarget(['trip', id]), { kind: 'trip', id });
  assert.deepEqual(parseOpenTarget(['chat', id]), { kind: 'chat', id });
  assert.deepEqual(parseOpenTarget(['activity']), { kind: 'activity' });
  assert.deepEqual(parseOpenTarget(['records']), { kind: 'records' });
  assert.deepEqual(parseOpenTarget(['records', id]), { kind: 'records', id });
  assert.deepEqual(parseOpenTarget(['activity', `pickup%3A${id}`]), {
    kind: 'activity',
    id: `pickup:${id}`,
  });
  assert.equal(parseOpenTarget(['activity', `unknown:${id}`]), null);
  assert.equal(parseOpenTarget(['trip', id, 'extra']), null);
  assert.deepEqual(parseOpenTarget(['notice', id]), { kind: 'notice', id });
  assert.equal(parseOpenTarget(['notifications', id]), null);
  assert.equal(parseOpenTarget(['group', code]), null);
  assert.equal(parseOpenTarget(['chat', `${id}%2f`]), null);
});

test('native invitation codes are stripped from the router path and consumed once', () => {
  assert.equal(
    rewriteNativeOpenPath(`ruteam://open/group/${code}`),
    '/open/group/1',
  );
  assert.equal(takeGroupInvitation('2'), null);
  assert.equal(takeGroupInvitation('1'), code);
  assert.equal(takeGroupInvitation('1'), null);
  assert.equal(
    rewriteNativeOpenPath(`ruteam:///open/group/${code}?other=abc`),
    '/open/invalid',
  );
  assert.equal(takeGroupInvitation('2'), null);
  assert.equal(
    rewriteNativeOpenPath(`ruteam://open/trip/${id}`),
    `/open/trip/${id}`,
  );
  assert.equal(
    rewriteNativeOpenPath(`/open/chat/${id}?action=delete`),
    '/open/invalid',
  );
  assert.equal(
    rewriteNativeOpenPath('ruteam://verify-email'),
    'ruteam://verify-email',
  );
});
