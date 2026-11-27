import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(
  root,
  'docs/reviews/evidence/2026-11-14-arch-refactor',
);
const baseline = JSON.parse(
  readFileSync(resolve(evidence, 'inventory-before.json'), 'utf8'),
);
const oldFile = (path) =>
  execFileSync('git', ['show', `${baseline.base}:${path}`], {
    cwd: root,
    encoding: 'utf8',
  });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const exceptions = {
  'backend/AGENTS.md':
    'Updated root reference and mandatory architecture/agent guidance; documentation only.',
  'frontend/AGENTS.md':
    'Updated root reference and mandatory architecture/agent guidance; documentation only.',
};
const rows = baseline.files.map((file) => {
  const path = resolve(root, file.after);
  if (!existsSync(path))
    return { ...file, valid: false, reason: 'missing target' };
  const bytes = readFileSync(path);
  const mode = `0o${(statSync(path).mode & 0o777).toString(8)}`;
  const unchanged = sha(bytes) === file.sha256;
  let expectedChange = null;
  let contentValid = unchanged;
  if (!unchanged && exceptions[file.after]) {
    expectedChange = exceptions[file.after];
    contentValid = true;
  } else if (
    !unchanged &&
    [
      'backend/prisma.config.ts',
      'backend/prisma/seed.ts',
      'frontend/app.config.ts',
    ].includes(file.after)
  ) {
    expectedChange = 'Only dotenv root path ../../.env -> ../.env.';
    contentValid =
      bytes.toString() ===
      oldFile(file.before).replace("path: '../../.env'", "path: '../.env'");
  } else if (!unchanged && file.after === 'backend/package.json') {
    const expected = JSON.parse(oldFile(file.before));
    for (const key of ['dev', 'test'])
      expected.scripts[key] = expected.scripts[key]
        .replaceAll('../../.env', '../.env')
        .replaceAll('../../node_modules/', '../node_modules/');
    contentValid = isDeepStrictEqual(JSON.parse(bytes), expected);
    expectedChange = 'Only dev/test root env and Jest executable paths.';
  } else if (!unchanged && file.after === 'frontend/tsconfig.json') {
    const expected = JSON.parse(oldFile(file.before));
    expected.compilerOptions.paths['@ruteam/contracts'] = [
      '../packages/contracts/src/index.ts',
    ];
    contentValid = isDeepStrictEqual(JSON.parse(bytes), expected);
    expectedChange = 'Only root-relative contracts alias.';
  }
  return {
    before: file.before,
    after: file.after,
    sha256Before: file.sha256,
    sha256After: sha(bytes),
    mode,
    unchanged,
    expectedChange,
    valid: contentValid && mode === file.mode,
  };
});
const childDirs = (path) =>
  existsSync(resolve(root, path))
    ? readdirSync(resolve(root, path), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    : [];
const walk = (relative) =>
  existsSync(resolve(root, relative))
    ? readdirSync(resolve(root, relative), { withFileTypes: true }).flatMap(
        (entry) => {
          const path = `${relative}/${entry.name}`;
          if (entry.isDirectory())
            return entry.name === 'generated' ? [] : walk(path);
          return [path];
        },
      )
    : [];
const logicRoots = [
  'backend/src',
  'frontend/app',
  'frontend/src',
  'frontend/assets',
];
const expectedLogic = baseline.files
  .filter((file) =>
    logicRoots.some((prefix) => file.after.startsWith(`${prefix}/`)),
  )
  .map((file) => file.after)
  .sort();
const actualLogic = logicRoots.flatMap(walk).sort();
const relocate = (path) =>
  path
    .replace(/^apps\/api(?=\/|$)/, 'backend')
    .replace(/^apps\/client(?=\/|$)/, 'frontend');
const beforeLock = JSON.parse(oldFile('package-lock.json'));
const afterLock = JSON.parse(
  readFileSync(resolve(root, 'package-lock.json'), 'utf8'),
);
const graph = (lock, before) =>
  Object.fromEntries(
    Object.entries(lock.packages).map(([key, value]) => {
      const normalized = { ...value };
      if (before && key === '')
        normalized.workspaces = ['backend', 'frontend', 'packages/*'];
      if (before && value.link) normalized.resolved = relocate(value.resolved);
      return [before ? relocate(key) : key, normalized];
    }),
  );
const links = Object.fromEntries(
  ['api', 'client'].map((name) => {
    const path = resolve(root, 'node_modules/@ruteam', name);
    return [name, existsSync(path) ? realpathSync(path) : null];
  }),
);
const checks = {
  filesAndModesPreserved: rows.every((r) => r.valid),
  modulesPreserved: isDeepStrictEqual(
    childDirs('backend/src/modules'),
    baseline.modules,
  ),
  featuresPreserved: isDeepStrictEqual(
    childDirs('frontend/src/features'),
    baseline.features,
  ),
  exactSourceInventory: isDeepStrictEqual(actualLogic, expectedLogic),
  oldWorkspacesAbsent:
    !existsSync(resolve(root, 'apps/api')) &&
    !existsSync(resolve(root, 'apps/client')),
  dependencyGraphPreserved: isDeepStrictEqual(
    graph(beforeLock, true),
    graph(afterLock, false),
  ),
  apiLink: links.api === resolve(root, 'backend'),
  clientLink: links.client === resolve(root, 'frontend'),
};
const report = {
  base: baseline.base,
  checkedAt: new Date().toISOString(),
  checks,
  fileCount: rows.length,
  gitkeepCount: rows.filter((r) => r.after.endsWith('/.gitkeep')).length,
  files: rows,
};
writeFileSync(
  resolve(evidence, 'inventory-after.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      checks,
      fileCount: rows.length,
      gitkeepCount: report.gitkeepCount,
      invalidPaths: rows.filter((r) => !r.valid).map((r) => r.after),
    },
    null,
    2,
  ),
);
if (Object.values(checks).some((ok) => !ok)) process.exitCode = 1;
