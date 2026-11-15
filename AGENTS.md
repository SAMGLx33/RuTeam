# RuTeam — instrucciones permanentes para cualquier IA

Antes de trabajar, revisa `git status`, este archivo y el AGENTS.md del módulo,
`CONTRIBUTING.md`, `docs/coordination/CURRENT_STATUS.md`, `WORKSTREAMS.md`,
`MODULE_OWNERSHIP.md`, `docs/development/PROGRESS.md`, la matriz RF/RNF,
UML relevante y el handoff más reciente del módulo. Las rutas de coordinación son
relativas a `docs/coordination/`. No dependas de la memoria de un chat o plugin.

Programa en tu rama individual `task/*` desde `feature` actualizada; presenta PR a
`feature`. El integrador humano promociona a `dev` y luego `main`. No uses
`feature/*`: colisiona con la rama literal `feature`. No hagas push/merge sin
autorización. La excepción de fundación local en main ya fue solicitada en el
prompt maestro; no habilita nuevos cambios directos a ramas compartidas.

Al cerrar CADA avance: prueba, documenta código/decisiones/migraciones, genera un
handoff NUEVO en `docs/handoffs/`, enlázalo en PROGRESS y entrega traspaso. Editar
código sin actualizar la documentación constituye una tarea incompleta. Actualiza
WORKSTREAMS; CURRENT_STATUS sólo cambia por el integrador al validar `dev`.
No declares INTEGRADO un cambio no fusionado y comprobado en dev.

## Reglas

- Referencias en `reference/` o `referencias/`: leer ERS, rúbrica y las 36 páginas
  XML drawio antes de cambiar el modelo. Si faltan, anótalo: no inventes requisitos,
  prioridades, páginas UML o aprobaciones.
- Precedencia: producto explícito del prompt > UML compatible > ERS/rúbrica > guía > ADR.
- Stack: TypeScript strict, Nest monolito modular MVC, Prisma 7 + pg/PostgreSQL,
  una app Expo Router SDK 54 React Native/Web. No Vite/Vue/Next/Firebase/Supabase,
  pasarelas, microservicios ni servicios comerciales obligatorios.
- React presenta, Nest decide, repositorios Prisma persisten. Contratos públicos
  en packages/contracts y docs/development/API.md; no Prisma en cliente.
- Afiliación ACTIVA y vigente en cada acceso protegido; demo siempre rotulada.
  Provider USC oficial falla cerrado; no afirmar integración QR institucional.
- Próximas fases: destino sólo USC, capacidades de pasajeros (auto≤4, moto≤1),
  reservas grupales atómicas con PostgreSQL real, estados y costos sin lucro.
  No automatizar género, penalidades o cobros pendientes de aprobación.
- No tocar módulos ajenos ni schema/lockfile/app.module sin coordinación. No editar
  migraciones aplicadas: crear nuevas. Tests en BD independiente con sufijo _test.
- Prohibidos reset --hard, clean -fd, branch -D, force push, migrate reset compartido.
- No secretos, PII real, carnés, dumps, tokens ni outputs generados en Git.
- .gitkeep sólo en hojas planificadas vacías; quitarlo al agregar contenido útil.
- DoD: código + pruebas reales + contrato + trazabilidad + ADR si cambia decisión +
  nuevo handoff + PROGRESS en el mismo commit; si falta algo, PARCIAL.

## Continuidad de Fase 2

Fuentes privadas leídas en `docs/RuTeam_Referencias_Codex_PRIVADO/reference-private/`
(ubicación recibida) o `reference-private/` (ubicación esperada). Ambas están ignoradas.
No versionar el paquete, conversiones ni PII; sólo derivados en ERS_CATALOG/TRACEABILITY
y requirements/UML_CROSSWALK. IDs oficiales RF-001..030 y RNF-031..050 cotejados;
RF-001 sin prioridad unívoca en la matriz original. No inventarla.

Fase2 en task/trips-publicacion: registro/listado propios, documentos DEMO pendientes,
revisión ADMIN versionada, publicación/listado de viajes USC. No reservas ni transiciones
operativas todavía. Verificar código+tests+docs+handoff antes de cierre; este corte no
autoriza commit/push/PR/merge. Mantener los cambios revisables sin stage si no hay permiso.

## Estructura vigente tras traslado local — 2026-11-14

Workspaces backend (antes apps/api), frontend (antes apps/client) y packages/contracts.
Leer backend/AGENTS.md o frontend/AGENTS.md y docs/architecture/REPOSITORY_STRUCTURE.md
antes de cambiar el subárbol. Probar y documentar después de CADA avance, aunque falle
o quede parcial; nuevo handoff + PROGRESS obligatorios para los agentes de seis integrantes.
No replicar una plantilla ni reorganizar las capas internas por cambiar la ruta exterior.

Backend conserva MVC por módulo: controllers→application→domain/repositorios; common es
transversal y Prisma permanece en infraestructura/backend. La vista visual vive sólo en
frontend. Frontend conserva Expo Router app y src/features, components/providers/services.
No crear root app, backend/src/backend/api/mvc, capas MVC globales, frontend/frontend o
segundo frontend web. Capacidad de driver/passenger no desplaza autoridad Nest al cliente.
.gitkeep permanece en hojas planificadas vacías; no generar implementación ficticia.

Excepción de base autorizada: task/refactor-monorepo-structure parte de bab4e63 de Fase 2
porque feature todavía no la integra. No promover este refactor a feature antes de integrar
Fase 2 y revisar que su diff sólo contenga el traslado. No stage/commit/push/PR/merge aquí.
Las notas anteriores son cortes históricos; consultar PROGRESS/handoff y Git para estado.
