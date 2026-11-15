# Progreso verificable e índice de handoffs

Fuente de estado integrado: ../coordination/CURRENT_STATUS.md. Este registro incluye
trabajo LOCAL y no equivale a aprobación o fusión en dev.

- 2026-11-13 — Fundación local en main: monorepo, Prisma/PostgreSQL, auth/perfil/campus,
  Expo web/nativo,27/27 Jest,2/2 Playwright,6/6 smoke, Doctor18/18. Físico y referencias
  pendientes; estado PARCIAL. [Handoff inicial](../handoffs/2026-11-13_main_foundation_vertical.md).
  [Evidencia](../demo/EVIDENCE.md). Sin push/PR/merge. SHA se registra tras crear commit.

Añadir entradas pequeñas y nuevas; no sobrescribir histórico ajeno. Cada avance, incluso
parcial, requiere handoff nuevo y documentación en el mismo commit.

- 2026-11-13 — task/trips-publicacion desde feature=e3841bc, checkpoint f637499 leído
  pero no integrado. Fuentes privadas cotejadas:50IDs/49prioridades y36pestañas UML.
  Vehículos/licencia/revisión DEMO versionada, publicación USC/paradas/reglas/intervalos
  y listados propios con71/71 Jest y4/4 E2E, Doctor18/18 y exports reales. No commit
  autorizado, PR, merge ni push; estadoPARCIAL. [Handoff Fase2](../handoffs/2026-11-13_task-trips-publicacion_fase2.md).
  [Evidencia vigente](../demo/EVIDENCE.md#continuidad-fase-2--2026-11-13-americabogota).

## 2026-11-13 — Auditoría de Fase 2 y diseño de reservas (sin integración)

Codex auditó el árbol existente `task/trips-publicacion`, HEAD `e3841bc`, sin stage,
commit ni cambios productivos. Los 78 paths iniciales coinciden con el parche anterior
(SHA256 en manifest); se corrigió únicamente una afirmación documental de API.md:
Trip.version es interno, no campo de TripSummary. Dictamen **APROBAR CON CONDICIONES**
para revisión del primer commit local; no aprobación de promoción.

Repetidos secuencialmente: generate/migrate/seed/test:setup/typecheck/lint aprobados;
Jest 71/71, Playwright 4/4, smoke 6/6, Doctor 18/18, diff --check aprobado. npm audit
FALLIDO: 40 alertas, cinco altas. Seeds idempotentes y checksums 4/4 en cada BD local.
Expo Go físico BLOQUEADO POR ENTORNO; exportaciones históricas no repetidas.

Informe, integración propuesta, checklist física y listado exhaustivo del commit:
[FASE2_REVIEW](../reviews/FASE2_REVIEW.md) y
[FASE2_COMMIT_PROPOSAL](../reviews/FASE2_COMMIT_PROPOSAL.md).
[FASE3_RESERVAS_PLAN](FASE3_RESERVAS_PLAN.md) es sólo diseño; RF-006 sigue pendiente.
[Handoff nuevo](../handoffs/2026-11-13_task-trips-publicacion_auditoria-fase2-reservas-plan.md).
Integrador/revisores/PO: POR_ASIGNAR. Checkpoint f637499 sigue aislado; no PR/merge/push.

## 2026-11-14 — Traslado estructural a backend/frontend

Rama task/refactor-monorepo-structure desde bab4e630784714f8fa58bcbf964ea5a48e37259a
(Fase 2 publicada, todavía NO integrada en feature=e3841bc). Codex movió workspaces
completos, sin modificar la arquitectura interna ni reglas:216 archivos originales,
133 .gitkeep, inventario/hash/permisos preservados. Lockfile1309 entradas equivalentes,
sin upgrades; npm ci aislado aprobado. Stage vacío, sin commit/push/PR/merge del refactor.

Typecheck/lint/formato/builds/Doctor18/18/exports web-Android-iOS aprobados. npm test real:
28 pasan/43 fallan/71 por PostgreSQL55432 ausente desde baseline. Migrate/seed/test:setup y
smoke fallan por entorno; E2E bloqueado. API/web responden, health503, auth/me401/login500;
no login funcional aprobado. Audit40/5altas, Expo Go físico NO VERIFICADO. Estado PARCIAL.

[Baseline](../reviews/ARCH_REFACTOR_BASELINE.md), [plan](../reviews/ARCH_REFACTOR_PLAN.md),
[revisión/condiciones](../reviews/ARCH_REFACTOR_REVIEW.md),
[estructura obligatoria](../architecture/REPOSITORY_STRUCTURE.md) y
[handoff nuevo](../handoffs/2026-11-14_task-refactor-monorepo-structure.md).
Responsables/revisores POR_ASIGNAR. Primero entorno y pruebas, después autorización Git;
PR estructural a feature sólo tras integrar Fase 2. No reservas ni nueva migración.

## 2026-11-14 — PostgreSQL persistente y validación funcional completa

Usuario autorizó crear desde cero el entorno de desarrollo/pruebas sustituyendo al
clúster temporal desaparecido. Nuevo PostgreSQL18 real en .local-data/postgresql-18
fuera del checkout,127.0.0.1:55432; ruteam/ruteam_test separadas. .env intacto y5432 sin usar.
Cuatro migraciones por base con checksums4/4; seed idempotente en12tablas por base.

Nueva ejecución:71/71 Jest,4/4 Playwright,6/6 smoke, Doctor18/18, typecheck/lint/formato,
buildAPI/web y equivalencia216/133 aprobados. Concurrencia201/409 y conteo +1 observados
sobre PostgreSQL_test. Web8081 autentica y persiste perfil después de recargar; health200/up.
Se corrigió caché de manifiesto Expo mediante --clear en dev:web/dev:client y E2E8082:
conserva variables y aislamiento API3100/BD_test. Primer falloE2E4/4 documentado, no ocultado.

[Diagnóstico](../reviews/POSTGRESQL_RECOVERY_DIAGNOSIS.md),
[validación/evidencias](../reviews/POSTGRESQL_RECOVERY_VALIDATION.md) y
[handoff](../handoffs/2026-11-14_task-refactor-monorepo-structure_recuperacion-postgresql.md).
Rama task/refactor-monorepo-structure, HEAD bab4e63; sin stage/commit/PR/push/merge.
Fase2 aún no integrada en feature. Local validado, no integrado; físico/CI/audit pendientes.
