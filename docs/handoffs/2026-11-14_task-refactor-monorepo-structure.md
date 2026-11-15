# Handoff — traslado estructural a backend/frontend

- Fecha: 2026-11-14, America/Bogota. Agente: Codex.
- Responsable humano, integrador, PO y revisores: POR_ASIGNAR.
- Rama: task/refactor-monorepo-structure.
- HEAD/base: bab4e630784714f8fa58bcbf964ea5a48e37259a.
- Base publicada: origin/task/trips-publicacion coincide después del fetch real.
- Estado: PARCIAL POR ENTORNO; estructura verificada, integración no aprobada.
- Modelo/esfuerzo recomendado para siguiente agente: GPT-6 High, según prompt.
  No se cambió configuración de modelo/esfuerzo ni se infiere una versión no expuesta.

## Objetivo, fuentes y requisitos

Mover los dos workspaces completos, sin reorganizar sus capas ni cambiar comportamiento.
Leídos AGENTS aplicables, CONTRIBUTING, coordinación/ownership/progreso/decisiones,
handoffs, revisión/propuesta Fase 2, scripts, contratos y configuración. Fuentes privadas
ERS/UML no cambiadas ni copiadas: no se modifica el modelo ni criterios de aceptación.
RF/RNF conservan estados; sólo cambian referencias de rutas. No implementación de Fase 3.

## Cambios exactos y responsabilidades

apps/api→backend (177 archivos), apps/client→frontend (39); 133 `.gitkeep` conservados.
Mismos sufijos de módulos Nest, rutas/features/componentes/adaptadores Expo y contratos.
Sin app raíz, plantillas o frontend paralelo. Backend conserva controllers→application→
domain/repositorios; frontend presenta mediante Router/features/providers/services.

Siete excepciones dentro de los workspaces: AGENTS de ambos; scripts root-env/Jest de
backend/package.json; dotenv de prisma.config.ts/seed.ts; dotenv de frontend/app.config.ts;
alias contracts de frontend/tsconfig.json. El negocio del seed permanece idéntico.
Único archivo adicional: frontend/.env.example, sólo URL pública sin credenciales.

Raíz: workspaces de package.json/lockfile y enlaces npm; glob ESLint; ignore generated;
import Prisma del fixture Node Playwright; CI con formato y Doctor frontend. AGENTS,
arquitectura, SETUP/API/TEST_PLAN/BRANCHING, ownership/coordinación/trazabilidad/evidencias
y PROGRESS actualizados. Handoffs históricos preservados. Inventario completo al cierre:
[final-checks.json](../reviews/evidence/2026-11-14-arch-refactor/final-checks.json).

## Dominio, API, Prisma y versiones

Sin cambios de endpoints, DTOs, firmas, estados o autoridad Nest. Cuatro migraciones SQL
y schema idénticos; no migración nueva, reset, db push, eliminación o recreación de BD.
Prisma generado en backend/src/generated permanece ignorado. No Prisma en React; sólo
el fixture Node de pruebas importa el cliente generado.

Node22.22.3/npm12.2.2/Nest11.2.10/Prisma7.10.1/Expo54.0.38/Router6.0.24/React19.1/
RN0.81.5/TS5.9.3. Sin upgrades. Lockfile: 1309 entradas totalmente equivalentes después
de remapear rutas. npm ci aislado exit0 (1238 paquetes), sólo metadatos, sin secretos/scripts.

## Entorno y pruebas reales

.env raíz sin cambios; scripts/dotenv usan ../.env desde los workspaces. Variables de
proceso prevalecen: URL pública default3000 y override Playwright3100 observados. Extra
público contiene apiUrl y configuración router, sin credenciales.

ANTES del traslado faltaban el clúster configurado55432 y /tmp/ruteam-pg-20261113.
PostgreSQL del sistema5432 es ajeno y no se tocó. No se reinició/creó ninguna base ni se
modificó .env para ocultar el bloqueo. Responsable debe restaurar/proveer entorno autorizado.

Baseline real: typecheck/lint/build API/build web exit0; tres suites puras20/20; Doctor18/18.
Smoke falló por API ausente; HTTP/E2E bloqueados por BD. Browser mostró error de conexión.
Posterior: check:env/db:generate/typecheck/lint/formato/builds/Doctor18/18/exports Android e
iOS exit0. Verificador216 archivos/133gitkeep/grafo y diff check aprobados.

`npm test` REAL falla: 28 aprobadas,43 fallidas,71 totales; 3 suites pasan y2 fallan por
conexión BD ausente. db:migrate/db:seed/db:test:setup fallan por55432. No comprobación viva
de idempotencia o checksums `_prisma_migrations`. E2E4 y concurrencia publicaciones201/409
no repetidos. Audit exit1:40 alertas (1 baja,34 moderadas,5 altas,0 críticas); sin fixes.

API3000 y web8081 propios iniciados desde los nuevos workspaces quedan para inspección:
web200, Swagger200/16 rutas, auth/me401 sin sesión, health503; login500 por falta de BD.
CORS/URL reales observados. `npm run dev:client` sirvió manifiesto Android200/SDK54
en Metro LAN8081; se cerró esa instancia propia y se restauró una única web. Sin teléfono. Playwright desktop1280x900/móvilweb390x844: sin pageerror,
overflow u overlay; error HTTP visible no significa login aprobado. No se reprodujo la
condición histórica health200+errorUI; no afirmar corrección funcional de ese caso.

Evidencia derivada duradera en docs/reviews/evidence/2026-11-14-arch-refactor; no logs crudos
nuevos en Git. Capturas sintéticas fuera de Git en
/home/darik/RuTeam/review-artifacts/2026-11-14-architecture.
Expo Go físico/LAN/SecureStore nativo, Windows, CI remoto, carga y restauración NO VERIFICADOS.

## Revisión, riesgos y Git

Revisor independiente sólo lectura: ningún hallazgo atribuible al movimiento; cotejó
216 archivos,133gitkeep y todos los campos de1309 entradas lock. No ejecutó suites.
Deuda MVC previa (readiness Prisma directo en health y ubicación membership.policy) y
limitación dotenv/CWD preservadas/documentadas; resolverlas sería otra tarea funcional.
[Review completo](../reviews/ARCH_REFACTOR_REVIEW.md) contiene disposiciones y condiciones.

APROBAR CON CONDICIONES la revisión estructural; no promover con validación funcional
bloqueada y riesgos audit/plataforma abiertos. feature/main/dev=e3841bc; Fase2 NO es
ancestro de feature. f637499 sigue aislado. Integrar primero Fase2 y revisar después el
diff del refactor contra feature. Sin stage, commit, push, PR, merge o rebase aquí.

## Reproducción y siguiente paso específico

```bash
cd /home/darik/RuTeam/RuTeam
git status --short --branch
git diff --check
git ls-files --others --exclude-standard
node scripts/verify-workspace-move.mjs
npm run typecheck
npm run lint
npm run format:check
npm run build:api
npm run build:web
npx expo-doctor frontend
```

Con DEMO y test disponibles en configuración autorizada: db:migrate, db:seed, db:test:setup;
verificar idempotencia/checksums y ejecutar `npm test`, `npm run test:e2e`, `npm run smoke`
SECUENCIALMENTE. Confirmar health con database=up y login/perfil/registro/revisión/publicación
reales en navegador. No reset, ni copiar .env sobre uno existente. Inspeccionar puertos
antes de iniciar procesos; no duplicar ni terminar los ajenos.

Persona responsable: asignar revisores, proporcionar entorno y resolver condiciones;
autorizar por separado commit local, push y PR. PR a feature sólo después de integrar
Fase2. Mensaje futuro propuesto, NO ejecutado:

```text
refactor(architecture): reorganize RuTeam into backend and frontend workspaces
```

Stage vacío; los216 movimientos físicos figuran como D antiguas y destinos no seguidos
hasta el stage autorizado. No son216 renames indexados ni un merge ya integrado.
