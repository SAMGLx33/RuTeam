# Propuesta de primer commit local de Fase 2 — NO ejecutada

Rama: `task/trips-publicacion`. HEAD/base feature: `e3841bc189ac1661210adf920cd3f8fb3db6a8ce`.
**Stage y commit requieren autorización humana expresa. Este documento no la concede.**
Dictamen y condiciones: [FASE2_REVIEW](FASE2_REVIEW.md). No promoción autorizada.

Mensaje propuesto:

```text
feat(trips): add demo vehicles, document reviews and USC trip publication
```

Agrupa el código existente de vehículos/publicación, pruebas, migraciones y documentación
con sus handoffs y auditoría; el plan de reservas es sólo diseño. No contiene producción
de Fase 3. Checkpoint f637499 conserva su revisión e historia separadas; no se copia su
handoff ni se declara integrado en este commit.

## Inventario exhaustivo que se propone incluir

Listado generado del diff contra feature MÁS todos los untracked no ignorados después
de añadir esta auditoría. M=modificado, D=eliminado, A=nuevo. Incluye las eliminaciones
.gitkeep sustituidas por contenido. [Manifest procesable](FASE2_COMMIT_MANIFEST.json).
No es un comando de stage ni confirma que cada archivo ya esté aprobado por el equipo.

### Modificados (28)

- `.gitignore`
- `.prettierignore`
- `AGENTS.md`
- `README.md`
- `apps/api/AGENTS.md`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/seed.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/filters/api-exception.filter.ts`
- `apps/api/src/modules/auth/application/auth.service.ts`
- `apps/api/src/modules/auth/infrastructure/repositories/auth.repository.ts`
- `apps/client/AGENTS.md`
- `apps/client/src/features/auth/profile-screen.tsx`
- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/MODULES.md`
- `docs/architecture/UML-CROSSWALK.md`
- `docs/coordination/CURRENT_STATUS.md`
- `docs/coordination/WORKSTREAMS.md`
- `docs/decisions/OPEN_DECISIONS.md`
- `docs/demo/DEMO_SCRIPT.md`
- `docs/demo/EVIDENCE.md`
- `docs/development/API.md`
- `docs/development/BRANCHING.md`
- `docs/development/PROGRESS.md`
- `docs/development/TEST_PLAN.md`
- `docs/requirements/TRACEABILITY.md`
- `packages/contracts/src/index.ts`
- `reference/README.md`

### Eliminados (16)

- `apps/api/src/common/errors/.gitkeep`
- `apps/api/src/modules/trips/application/.gitkeep`
- `apps/api/src/modules/trips/controllers/.gitkeep`
- `apps/api/src/modules/trips/domain/models/.gitkeep`
- `apps/api/src/modules/trips/dto/.gitkeep`
- `apps/api/src/modules/trips/infrastructure/repositories/.gitkeep`
- `apps/api/src/modules/vehicles/application/.gitkeep`
- `apps/api/src/modules/vehicles/controllers/.gitkeep`
- `apps/api/src/modules/vehicles/domain/policies/.gitkeep`
- `apps/api/src/modules/vehicles/dto/.gitkeep`
- `apps/api/src/modules/vehicles/infrastructure/repositories/.gitkeep`
- `apps/client/app/(admin)/.gitkeep`
- `apps/client/app/(driver)/.gitkeep`
- `apps/client/src/components/forms/.gitkeep`
- `apps/client/src/features/admin/.gitkeep`
- `apps/client/src/features/trips/.gitkeep`

### Nuevos (59)

- `apps/api/prisma/migrations/20261114014345_phase2_vehicle_publication/migration.sql`
- `apps/api/prisma/migrations/20261114015557_phase2_document_revisions/migration.sql`
- `apps/api/src/common/errors/domain-policy.error.ts`
- `apps/api/src/modules/trips/application/trips.service.ts`
- `apps/api/src/modules/trips/controllers/trips.controller.ts`
- `apps/api/src/modules/trips/domain/models/viaje.ts`
- `apps/api/src/modules/trips/dto/publish-trip.dto.ts`
- `apps/api/src/modules/trips/infrastructure/repositories/trips.repository.ts`
- `apps/api/src/modules/trips/trips.module.ts`
- `apps/api/src/modules/vehicles/application/vehicles.service.ts`
- `apps/api/src/modules/vehicles/controllers/vehicles.controller.ts`
- `apps/api/src/modules/vehicles/domain/policies/vehiculo.policy.ts`
- `apps/api/src/modules/vehicles/dto/vehicles.dto.ts`
- `apps/api/src/modules/vehicles/infrastructure/repositories/vehicles.repository.ts`
- `apps/api/src/modules/vehicles/vehicles.module.ts`
- `apps/api/test/phase2-policy.test.mjs`
- `apps/api/test/phase2.e2e.test.mjs`
- `apps/client/app/(admin)/document-reviews.tsx`
- `apps/client/app/(driver)/my-trips.tsx`
- `apps/client/app/(driver)/publish.tsx`
- `apps/client/app/(driver)/vehicles.tsx`
- `apps/client/src/components/forms/field.tsx`
- `apps/client/src/components/ui/protected-page.tsx`
- `apps/client/src/features/admin/document-reviews-screen.tsx`
- `apps/client/src/features/trips/my-trips-screen.tsx`
- `apps/client/src/features/trips/publish-screen.tsx`
- `apps/client/src/features/trips/vehicles-screen.tsx`
- `docs/development/DEPENDENCY_REVIEW.md`
- `docs/development/FASE3_RESERVAS_PLAN.md`
- `docs/handoffs/2026-11-13_task-trips-publicacion_auditoria-fase2-reservas-plan.md`
- `docs/handoffs/2026-11-13_task-trips-publicacion_fase2.md`
- `docs/requirements/ERS_CATALOG.md`
- `docs/requirements/UML_CROSSWALK.md`
- `docs/reviews/FASE2_COMMIT_MANIFEST.json`
- `docs/reviews/FASE2_COMMIT_PROPOSAL.md`
- `docs/reviews/FASE2_REVIEW.md`
- `docs/reviews/evidence/2026-11-13-fase2-audit/01-db-generate.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/02-db-migrate.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/03-db-seed.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/04-db-test-setup.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/05-typecheck.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/06-lint.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/07-jest.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/08-playwright.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/09-smoke.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/10-expo-doctor.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/11-diff-check.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/12-npm-audit.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/13-format-check.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/14-final-diff-check.txt`
- `docs/reviews/evidence/2026-11-13-fase2-audit/input-manifest.json`
- `docs/reviews/evidence/2026-11-13-fase2-audit/migration-checksums.json`
- `docs/reviews/evidence/2026-11-13-fase2-audit/npm-audit.json`
- `docs/reviews/evidence/2026-11-13-fase2-audit/privacy-and-scope.json`
- `docs/reviews/evidence/2026-11-13-fase2-audit/results.json`
- `docs/reviews/evidence/2026-11-13-fase2-audit/seed-idempotence.json`
- `docs/superpowers/plans/2026-11-13-phase2.md`
- `tests/package.json`
- `tests/web/publication.spec.ts`

Total: **103 rutas**; 78 preexistentes y 25 documentos/recibos nuevos de auditoría.
Las entradas de coordinación/API/trazabilidad ya existentes también contienen adiciones de
esta auditoría. El manifest enumera paths, sin hashes de sí mismo que se invalidarían al escribirlo.
La huella del sujeto de entrada se conserva separada en input-manifest.json.

## Exclusiones expresas

- `.env`, variantes con credenciales, tokens, claves, fotografías, carnés, PII y datos reales.
- `reference-private/**` y `docs/RuTeam_Referencias_Codex_PRIVADO/**`, originales y conversiones.
- `node_modules`, `dist`, `generated`, `.expo`, coverage, test-results, playwright-report,
  bundles, caches, bases/dumps y logs operativos sin depurar. No usar git add -f.
- Parches y herramientas de `/tmp` y artefactos externos del plugin de revisión; los recibos
  versionables derivados están expresamente listados arriba, como texto/JSON revisado.
- `package-lock.json`, `.env.example` y archivos fundacionales sin cambios no forman parte
  de este diff; no crear modificaciones para incorporarlos. No stage global con git add -A.

## Revisión y operación futura

1. Integrador POR_ASIGNAR revisa privacidad, manifest, condiciones audit, migraciones y contratos
   con revisores backend/datos/cliente/docs/QA POR_ASIGNAR. Leer los nuevos archivos completos.
2. Repetir `git status --short --branch`, `git diff --check`, `git diff --stat feature` y
   `git ls-files --others --exclude-standard`; cotejar contra manifest. Si cambia el conjunto,
   regenerar y revisar antes de autorizar. git diff solo omite contenido de nuevos archivos.
3. Obtener autorización explícita para stage y primer commit local de este conjunto concreto.
   Sólo después, stage por paths revisados del manifest (incluidas D), inspección de
   `git diff --cached --stat`, `git diff --cached --check` y diff completo, y commit autorizado.
4. Verificar SHA/estado y entregar handoff. Push, PR, merge y promoción requieren su propia
   autorización; no deducirlas de un commit local. Mantener checkpoint aislado hasta revisión.

Ninguno de los comandos de escritura Git anteriores se ejecutó en esta intervención.
