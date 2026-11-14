import { execFileSync } from 'node:child_process';
console.log(
  `Node ${process.version}; ${process.platform}/${process.arch}; cwd ${process.cwd()}`,
);
for (const command of ['git', 'psql']) {
  try {
    console.log(
      execFileSync(command, ['--version'], { encoding: 'utf8' }).trim(),
    );
  } catch {
    console.log(`${command}: no disponible en PATH`);
  }
}
console.log(
  'Node 22.12–22.x; npm 10+; PostgreSQL 17/18 o Compose. Ver docs/development/SETUP.md',
);
