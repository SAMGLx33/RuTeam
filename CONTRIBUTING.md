# Contribuir

Leer [SETUP](docs/development/SETUP.md), [AGENTS](AGENTS.md) y coordinación antes
de editar. Responsables humanos pendientes de asignación; no adjudicarlos a una IA.

Flujo obligatorio: `task/<area>-<tarea> → feature → dev → main`. Consultar
[BRANCHING](docs/development/BRANCHING.md). Reutilizar rama de tarea al retomar.
Ramas compartidas sin rebase/reset/force push. Integración sólo por responsable
humano y con autorización. Resolver conflictos preservando ambos cambios y pruebas.

TypeScript strict, sin any injustificado. Conventional Commits: feat/fix/test/docs/
chore/refactor, RF sólo con correspondencia oficial verificada. No inventar IDs.
Mantener cambios acotados y contratos compatibles. Revisar conjuntamente schema,
migraciones, lockfile, app.module, .env.example y packages/contracts.

Cada PR incluye motivo, pruebas con resultados reales, migración/seed cuando aplica,
trazabilidad/ADR, handoff NUEVO y entrada breve PROGRESS. Revisión cruzada por módulo;
comprobar API+PostgreSQL+UI. Un build no sustituye ejecución. No declarar Fase 1
completa si falta validación Expo Go físico. Seguridad y CI no se presumen habilitados
en GitHub por existir YAML o una plantilla. No publicar originales sin autorización.
