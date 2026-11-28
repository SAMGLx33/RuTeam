import pg from 'pg';

const test = process.argv[2] === '--test';
if (process.argv.length !== (test ? 3 : 2))
  throw new Error(
    'Uso: node --env-file=.env scripts/configure-pampalinda.mjs [--test]',
  );
function databaseUrl(variable) {
  try {
    const url = new URL(process.env[variable]);
    if (url.protocol === 'postgresql:' || url.protocol === 'postgres:')
      return url;
  } catch {
    // Report the variable name without exposing the connection string.
  }
  throw new Error(`Configura una URL PostgreSQL válida en ${variable}.`);
}

const url = databaseUrl(test ? 'TEST_DATABASE_URL' : 'DATABASE_URL');
const development = test ? databaseUrl('DATABASE_URL') : url;
if (
  test &&
  ((development.host === url.host && development.pathname === url.pathname) ||
    !url.pathname.endsWith('_test'))
)
  throw new Error(
    'Se requiere una base de pruebas independiente con sufijo _test.',
  );
if (
  !test &&
  (process.env.NODE_ENV !== 'development' ||
    process.env.INSTITUTIONAL_ACCESS_MODE !== 'DECLARED_DOMAIN' ||
    process.env.DEMO_MODE !== 'false')
)
  throw new Error(
    'La referencia pública se configura en el entorno académico declarado.',
  );
const db = new pg.Client({
  connectionString: url.href,
  connectionTimeoutMillis: 5000,
});
await db.connect();
try {
  const { rowCount } = await db.query(
    `UPDATE "CampusDestination"
     SET latitude = $1, longitude = $2, "sourceUrl" = $3
     WHERE code = 'USC-CALI-PAMPALINDA' AND campus = 'USC'
       AND kind = 'CAMPUS' AND active AND NOT demo
       AND latitude IS NULL AND longitude IS NULL`,
    [3.403412, -76.547719, 'https://www.wikidata.org/wiki/Q5575968'],
  );
  const {
    rows: [site],
  } = await db.query(
    `SELECT latitude, longitude FROM "CampusDestination"
     WHERE code = 'USC-CALI-PAMPALINDA' AND campus = 'USC'
       AND kind = 'CAMPUS' AND active AND NOT demo`,
  );
  if (site?.latitude == null || site.longitude == null)
    throw new Error(
      'Falta la fila activa de Pampalinda o su referencia está incompleta. Revisa el catálogo y las migraciones.',
    );
  console.log(
    rowCount
      ? 'Referencia pública de Pampalinda configurada.'
      : 'Pampalinda ya tiene una referencia; se conservó.',
  );
} finally {
  await db.end();
}
