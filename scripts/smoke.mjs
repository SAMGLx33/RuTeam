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
const password = process.env.AUTH_FIXTURE_PASSWORD;
if (!password)
  throw new Error(
    'AUTH_FIXTURE_PASSWORD debe coincidir con la usada en el seed aislado',
  );
const signIn = (identity) =>
  call('/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: `${identity}@student-fixtures.ruteam.invalid`,
      password,
    }),
  });
const inactive = await signIn('laura');
const inactiveHeaders = {
  ...headers,
  Authorization: `Bearer ${inactive.body.token}`,
};
assert(
  inactive.status === 200 &&
    !inactive.body.account.capabilities.passenger &&
    (await call('/trips/feed', { headers: inactiveHeaders })).status === 403,
  'cuenta inactiva autenticada y viajes bloqueados',
);
await call('/auth/logout', { method: 'POST', headers: inactiveHeaders });
const login = await signIn('ana');
assert(
  login.status === 200 && typeof login.body.token === 'string',
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
