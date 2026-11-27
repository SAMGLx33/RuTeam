const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export const invitationCodePattern = /^[A-Za-z0-9_-]{43}$/;

type OpenTarget =
  | { kind: 'trip' | 'chat' | 'notice'; id: string }
  | { kind: 'group'; id: string }
  | { kind: 'activity' | 'records'; id?: string };

let groupInvitation: { id: string; code: string } | null = null;
let sequence = 0;

export function getNotificationId(data: unknown): string | null {
  if (
    typeof data === 'object' &&
    data !== null &&
    'route' in data &&
    data.route === '/notifications' &&
    'notificationId' in data &&
    typeof data.notificationId === 'string' &&
    uuid.test(data.notificationId)
  )
    return data.notificationId.toLowerCase();
  return null;
}

function validActivityId(id: string) {
  if (uuid.test(id)) return true;
  const parts = id.split(':');
  if (parts.length !== 2) return false;
  const [first, second] = parts;
  return (
    (['trip', 'pickup', 'license', 'rating', 'comp'].includes(first) &&
      uuid.test(second)) ||
    (uuid.test(first) && /^\d{4}-\d{2}-\d{2}$/.test(second))
  );
}

export function parseOpenTarget(parts: unknown): OpenTarget | null {
  if (!Array.isArray(parts)) return null;
  const [kind, id] = parts;
  if (
    parts.length === 2 &&
    (kind === 'trip' || kind === 'chat' || kind === 'notice') &&
    typeof id === 'string' &&
    uuid.test(id)
  )
    return { kind, id: id.toLowerCase() };
  if (parts.length === 1 && (kind === 'activity' || kind === 'records'))
    return { kind };
  if (parts.length === 2 && typeof id === 'string') {
    if (kind === 'records' && uuid.test(id))
      return { kind, id: id.toLowerCase() };
    const decoded = id.replace(/%3a/gi, ':').toLowerCase();
    if (kind === 'activity' && validActivityId(decoded))
      return { kind, id: decoded };
  }
  if (
    parts.length === 2 &&
    kind === 'group' &&
    typeof id === 'string' &&
    /^\d+$/.test(id)
  )
    return { kind, id };
  return null;
}

export function peekGroupInvitation(id: string) {
  return groupInvitation?.id === id ? groupInvitation.code : null;
}

export function takeGroupInvitation(id: string) {
  const code = peekGroupInvitation(id);
  if (code) groupInvitation = null;
  return code;
}

export function rewriteNativeOpenPath(path: string): string {
  const normalized = path.replace(/^ruteam:\/{2,3}open\//, '/open/');
  if (!normalized.startsWith('/open/')) return path;
  const parts = normalized.slice('/open/'.length).split('/');
  const [kind, code] = parts;
  groupInvitation = null;
  if (kind === 'group') {
    if (parts.length !== 2 || !invitationCodePattern.test(code))
      return '/open/invalid';
    const id = String(++sequence);
    groupInvitation = { id, code };
    return `/open/group/${id}`;
  }
  return parseOpenTarget(parts) ? normalized : '/open/invalid';
}
