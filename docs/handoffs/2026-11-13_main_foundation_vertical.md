# Handoff — fundación / primer flujo vertical

- Fecha real: 2026-11-13, America/Bogota.
- Responsable humano: POR_ASIGNAR (no asumir autor Git como dueño de todos los módulos).
- Agente: Codex, sesión de fundación.
- Rama: main, excepción de setup autorizada por prompt maestro.
- Commit existente al escribir: 7967674 (README); fundación a crear después de revisión.
  El SHA de un commit no puede escribirse dentro de sí mismo: ver checkpoint posterior
  y git log. No inventar SHA.
- Estado: PARCIAL, sin integración revisada en dev.
- RF/RNF/HU/UML: prompt maestro; referencias ausentes.30RF/20RNF sin cotejo; excepción
  RNF-047 conocida por prompt. HU-A acceso y HU-P perfil en ACCEPTANCE.

## Contexto leído y decisiones respetadas

Prompt maestro completo; README e historia remota existentes. No hubo ERS, PDF, drawio
ni guías en disco; no se declaran leídos. Precedencia e invariantes en AGENTS/ADR0001.
Checkout real /home/darik/RuTeam/RuTeam, no la carpeta envolvente protegida.
Stack Nest11, Prisma 7, PostgreSQL, app única Expo 54. Sin push/merge/cloud.

## Objetivo y criterios de aceptación

Flujo real API+BD+cliente: login activo/rechazo inactivo → auth/me → perfil editable persistido
→ logout; catálogo USC DEMO para comenzar Fase 2. Primer hito completo NO declarado por
falta Expo Go físico y referencias. Fundaciones ejecutables, no sólo directorios.

## Cambios implementados (archivos/rutas/métodos)

- package/lock/workspaces, ESLint/Prettier/tsconfigs, compose/.env.example, CI.
- apps/api/src/modules/auth: controller.login/me/logout, AuthService.loginDemo/
  authenticate/currentUser/logout y AuthRepository Prisma.
- common/guards: origen/cabecera, SessionGuard afiliación y SessionRevocationGuard
  limitado a revocación propia; filtro errores y ValidationPipe global.
- infrastructure: PrismaService/config validada; provider demo consulta membresía;
  OfficialUscVerificationProvider devuelve503, sin llamada institucional.
- profiles: update propio y DTO estricto; campus: lectura catálogo activoUSC.
- health: readiness SELECT1 real; bootstrap/main/Swagger.
- apps/client: Router _layout/index, sesión TanStackQuery+Context, login/perfil,
  RHF/Zod, API con errores/timeout, adaptadores .web/.native para cookie/SecureStore,
  theme/UI y catálogo. Ningún frontend paralelo.
- packages/contracts/src/index.ts, scripts setup/test-db/check-env/smoke,
  tests/web/auth.spec.ts y pruebas api/test.
- Gobernanza y documentación en docs; hojas futuras .gitkeep, no módulos falsos.

## Contratos API/WS y dependencias entre módulos

GET health/auth/me/me/campus/destinations; POST auth/demo/login y auth/logout;
PATCH me/profile. Base/api/v1. Ver API.md y contratos TS. Mutaciones cabecera
x-ruteam-client; Origin allowlist. Web cookie HttpOnly, nativeBearer. Logout requiere
sesión válida, permite baja institucional sólo para revocar; datos requieren ACTIVE.
No gateway ni eventos WS implementados. Consumidores futuros deben respetar guards.

## Esquema Prisma, migraciones y seed

Prisma 7.10.1 con prisma.config.ts explícito, generator prisma-client ESM y adapter-pg;
src/generated ignorado. UUID/timestamptz y Decimal coordenadas. User/Profile/Membership/
AuthSession/VerificationAttempt/CampusDestination. Migraciones 20261114003554_foundation
(UTC) y 20261114004000_domain_constraints aplicadas a desarrollo y test.
Seed idempotente no borra/actualiza existentes: ana/diego/admin activos, laura inactiva;
correos @demo.ruteam.invalid, sin contraseñas; vigencia sintética 2030-12-31.
Diego capacidad conductor demo no equivale a vehículo/licencia/SOAT habilitados.
BD temporal /tmp/ruteam-pg-20261113,127.0.0.1:55432, rol ruteam; bases ruteam/ruteam_test.
No tocar bases ajenas ni usar reset. Migraciones comprobadas de verdad, no dbmock.

## Pruebas realmente ejecutadas (comandos/resultados)

EVIDENCE.md contiene versiones exactas y comandos. npm test: 27/27, 3 suites; typecheck/lint
sin errores; smoke: 6/6; Playwright: 2/2 escritorio/móvil web y dos contextos;
Expo Doctor: 18/18, install --fix al día; export web y Android/iOS correctos.
Regresiones RED→GREEN: auth 404 → 201; logout tras baja 403 → 204; logout web con UI obsoleta corregido
manteniendo query observado y retirando otros caches. Prisma actualizado 7.9.1 → 7.10.1
por auditoría; alertas 44 → 40 (5 altas), sin --force. No audit limpio.

## Verificación web y Expo Go

Web probada con Chromium 1280x720 e iPhone 13 web 390x664. Capturas reales en/tmp,
revisadas visualmente. API health/OpenAPI200; smokeAPI 3000. Expo Go físico NO VERIFICADO,
versión del teléfono desconocida. Bundles no prueban cámara/GPS/SecureStore real.
Windows receta no ejecutada. SDK54 requiere iOS 15.1+, excepción iOS 14 documentada.

## Bloqueos, riesgos, decisiones y trabajo NO realizado

ERS/UML/rúbrica faltan; QR USC oficial bloqueado; normas moto/género y penalidades no
activas; costos ninguna estrategia implementada hasta decisión PO.40 alertas npm
remanentes en cadena del stack/herramientas. Expo Go físico pendiente.
Vehículos/publicación/matching/reservas/concurrencia/QR interno/GPS/mapas/chat/costos/
ratings/SOS/admin no implementados; endpoints futuros404. No datos ni dinero reales.
Sin publicación, PR, merge o protecciones GitHub verificadas. Servicios en/tmp son
reproducibles, no infraestructura persistente de equipo.

## Reproducción local (pasos exactos)

Leer SETUP. `npm ci` → configurar `.env` → iniciar PostgreSQL → `db:generate` → `db:migrate` → `db:seed`.
Dos terminales: `npm run dev:api` y `npm run dev:web`; localhost:3000/8081.
Pruebas: `npm run db:test:setup` → `npm test` → `npm run test:e2e` (Chromium instalado).
Smoke con API iniciada. Para teléfono:URL LAN accesible, CORS origen permitido y versión
Expo Go54 confirmada. VM 10.0.2.15 parece NAT; comprobar puente/forward, no asumir acceso WiFi.
Si /tmp cluster existe usar pg_ctl start, no repetir initdb; URLs reales en.env ignorado.

## Integración: frentes impactados y revisor

Todos deben leer AGENTS/CONTRIBUTING/coordination/PROGRESS antes de trabajar.
Identidad revisa guards/sesión, frontend revisa adaptadores, dueñoBD revisa schema/
migraciones/seed; integrador revisa lockfile/app.module yCI. ResponsablesPOR_ASIGNAR.
Revisión independiente de sólo lectura concluida: sin hallazgos importantes remanentes
en Fase 0/1 tras corregir revocación y caché. No repitió suites ni modificó archivos.
No marcar INTEGRADO por crear referencias de rama. Sin PR ni autorización de push.

## Próximo paso para la siguiente IA

1. Leer este handoff, EVIDENCE, OPEN_DECISIONS y checkpoint posterior si existe.
2. `git status` y `git branch -vv`; desde feature crear/reusar task/trips-publicacion.
3. Recibir/cotejar referencias antes de ampliar modelo; verificar teléfonoExpo Go54.
4. Extender Fase 2: Vehicle/Document/Eligibility, destinoUSC, publicación/paradas/horarios;
   probar rechazo docs vencidos/capacidad/destino externo y choques. Antes de reservas,
   definir prueba PostgreSQL simultánea del último cupo. No tocar módulos ajenos sin coordinación.
5. Cada avance requiere código + tests + contrato + trazabilidad+handoff nuevo+PROGRESS.

Servicios al entregar: PostgreSQL temporal55432, API3000 y Metro web8081 iniciados para revisión.
Pueden detenerse desde sus terminales; PostgreSQL con pg_ctl descrito en SETUP.
