const base = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const call = async (path, options = {}) => {
  const response = await fetch(base + path, {
    ...options,
    signal: AbortSignal.timeout(10000),
  });
  const body = response.status === 204 ? null : await response.json();
  return { status: response.status, body };
};
const assert = (condition, label) => {
  if (!condition) throw new Error(label);
  console.log(`OK ${label}`);
};
assert((await call('/health')).status === 200, 'health PostgreSQL');
const headers = {
  'Content-Type': 'application/json',
  'x-ruteam-client': 'native',
};
const inactive = await call('/auth/demo/login', {
  method: 'POST',
  headers,
  body: JSON.stringify({ identity: 'laura' }),
});
assert(inactive.status === 403, 'inactiva rechazada');
const login = await call('/auth/demo/login', {
  method: 'POST',
  headers,
  body: JSON.stringify({ identity: 'ana' }),
});
assert(
  login.status === 201 && typeof login.body.token === 'string',
  'sesión activa persistida',
);
const authorized = { ...headers, Authorization: `Bearer ${login.body.token}` };
const me = await call('/auth/me', { headers: authorized });
assert(
  me.status === 200 && me.body.membership.status === 'ACTIVE',
  'auth/me real',
);
assert(
  (await call('/auth/logout', { method: 'POST', headers: authorized }))
    .status === 204,
  'logout',
);
assert(
  (await call('/auth/me', { headers: authorized })).status === 401,
  'sesión revocada',
);
console.log('Smoke: 6/6 comprobaciones.');
