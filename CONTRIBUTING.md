# Contribuir

Leer [PRODUCT_DEFINITION](docs/requirements/PRODUCT_DEFINITION.md),
[SETUP](docs/development/SETUP.md), [AGENTS](AGENTS.md) y coordinación antes
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

## Estructura y agentes

Leer AGENTS raíz y backend/AGENTS.md o frontend/AGENTS.md, REPOSITORY_STRUCTURE,
coordination/ownership y handoff vigente. Probar/documentar cada avance, incluso parcial
o fallido. Backend MVC por módulo; frontend único Expo Router + src/features. No mover
capas internas ni crear aplicaciones paralelas. Personas POR_ASIGNAR.
La excepción de base del refactor14/11 fue histórica; consultar Git/PROGRESS antes de
retomar una rama. No autoriza nuevas tareas fuera de la secuencia vigente. La redefinición
del 25/11 se continúa en la task pertinente sin Git writes automáticos.
