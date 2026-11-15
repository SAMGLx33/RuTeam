import { copyFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log(
    'Creado .env. Configura PostgreSQL y ejecuta de nuevo node scripts/setup.mjs.',
  );
  process.exit(0);
}
for (const task of ['db:generate', 'db:migrate', 'db:seed']) {
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', task],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  'Configuración/migración/seed finalizados. Arrancar API y Expo en terminales separadas.',
);
