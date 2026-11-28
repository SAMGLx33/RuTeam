import pg from 'pg';
import { spawnSync } from 'node:child_process';
import fixtures from './test-fixtures.json' with { type: 'json' };
const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
if (!TEST_DATABASE_URL || TEST_DATABASE_URL === DATABASE_URL)
  throw new Error('TEST_DATABASE_URL debe ser distinta a desarrollo');
const url = new URL(TEST_DATABASE_URL);
const database = decodeURIComponent(url.pathname.slice(1));
if (!/^[a-z][a-z0-9_]*_test$/.test(database))
  throw new Error(
    'La BD de pruebas debe terminar en _test y usar sólo letras/números/guion bajo',
  );
const maintenance = new URL(url);
maintenance.pathname = '/postgres';
const client = new pg.Client({
  connectionString: maintenance.toString(),
  connectionTimeoutMillis: 5000,
});
await client.connect();
try {
  const exists = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [database],
  );
  // Identificador validado por allowlist arriba; PostgreSQL no admite parámetros en CREATE DATABASE.
  if (!exists.rowCount) await client.query(`CREATE DATABASE "${database}"`);
} finally {
  await client.end();
}
for (const task of ['db:migrate', 'db:seed']) {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, ['run', task], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_FIXTURE_PASSWORD:
        process.env.AUTH_FIXTURE_PASSWORD ??
        fixtures.defaultAuthFixturePassword,
    },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const site = spawnSync(
  process.execPath,
  ['scripts/configure-pampalinda.mjs', '--test'],
  { stdio: 'inherit' },
);
if (site.status !== 0) process.exit(site.status ?? 1);
console.log('BD de prueba preparada sin reset ni borrado.');
