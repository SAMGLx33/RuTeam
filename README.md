# RuTeam

MVP académico local de carpooling hacia la Universidad Santiago de Cali. Monorepo
TypeScript: NestJS + Prisma7/PostgreSQL + **una app Expo Router SDK54** para web y móvil.

**ENTORNO DE DEMOSTRACIÓN; VINCULACIÓN SIMULADA.** Sólo identidades sintéticas;
no integración oficial USC, cobros reales ni despliegue. Estado: primer flujo local
implementado; Fase 2 local publicada, sin integración en feature/dev; Expo Go físico pendiente.

## Arranque

Desde la raíz que contiene este README y package.json (en esta sesión:
`/home/darik/RuTeam/RuTeam`). Node22.12–22.x, npm10+, PostgreSQL local o Compose.

```bash
npm ci
test -f .env || cp .env.example .env
# Configurar DATABASE_URL y TEST_DATABASE_URL; iniciar PostgreSQL antes de continuar.
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
# En otra terminal:
npm run dev:web
# Para Expo Go, en lugar de dev:web:
npm run dev:client
```

Web http://localhost:8081; API http://localhost:3000/api/v1/health;
Swagger http://localhost:3000/api/v1/docs. `node scripts/setup.mjs` ejecuta
configuración/migración/seed tras instalar dependencias e iniciar PostgreSQL.
[SETUP](docs/development/SETUP.md) incluye PostgreSQL sin Docker, Compose, Windows,
VM NAT/puente y teléfono por WiFi. No usar localhost del teléfono para la API.

## Identidades demo

| Selección      | Afiliación simulada | Estamento / capacidad                    |
| -------------- | ------------------- | ---------------------------------------- |
| Ana            | ACTIVA              | Estudiante / pasajera                    |
| Diego          | ACTIVA              | Docente / conductor demo                 |
| Laura          | INACTIVA, acceso403 | Trabajadora                              |
| Administración | ACTIVA              | Administrativo / ADMIN asignado por seed |

Correos `ana|diego|laura|admin@demo.ruteam.invalid`; sin contraseñas ni datos reales.
No hay registro libre ni otorgamiento de ADMIN desde el cliente. El login sólo existe
con DEMO_MODE=true, VERIFICATION_PROVIDER=demo y entorno no productivo.

Funciona en Fase 1/2: login/rechazo, auth/me, perfil propio, logout, catálogo USC DEMO,
vehículos/licencia, revisión administrativa versionada y publicación/listado propios.
Reservas/QR/chat/costos y dashboard administrativo general siguen pendientes.

## Verificación

```bash
npm run db:test:setup
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
# Con API iniciada:
npm run smoke
npx expo-doctor frontend
```

Playwright inicia API3100 + Expo8082 y usa exclusivamente TEST_DATABASE_URL.
No ejecutar Jest y navegador simultáneamente contra la misma BD de test.
[TEST_PLAN](docs/development/TEST_PLAN.md) y [EVIDENCE](docs/demo/EVIDENCE.md) separan
pruebas ejecutadas de límites. Export nativo/Doctor no sustituyen teléfono real.

## Equipo y continuidad

Leer [AGENTS](AGENTS.md), [CONTRIBUTING](CONTRIBUTING.md),
[estado integrado](docs/coordination/CURRENT_STATUS.md),
[PROGRESS e índice de handoffs](docs/development/PROGRESS.md) antes de editar.
`task/* → feature → dev → main`, sin push/merge automático. Se preserva el commit
remoto inicial7967674. La fundación local no equivale a integración revisada en dev.
[TRACEABILITY](docs/requirements/TRACEABILITY.md) coteja50IDs/49prioridades de las fuentes
privadas sin publicar originales; [OPEN_DECISIONS](docs/decisions/OPEN_DECISIONS.md) registra bloqueos.

## Continuidad local — Fase 2

Rama task/trips-publicacion: vehículos/licencia DEMO, revisión ADMIN versionada, publicación
hacia USC con recogidas ordenadas, listado propio. Migrar/seed con los mismos comandos
antes de arrancar; Diego tiene vehículoDEM123 y licencia sintética revisados en seed.
Un vehículo nuevo quedaPENDING: Administración revisa desde «Revisar documentos DEMO».
Nada consulta fuentes oficiales. Desde perfil: «Vehículos y licencia DEMO», «Publicar viaje
hacia USC», «Mis viajes publicados». Mapas/GPS/routing/reservas/costos siguen pendientes.
Fuentes oficiales del proyecto cotejadas en ERS_CATALOG/TRACEABILITY/UML_CROSSWALK;
fuentes originales privadas ignoradas. Ver último PROGRESS/handoff para evidencia actual.
Sin commit autorizado, PR, merge ni push en esta intervención; no integrado en dev.

## Estructura local vigente — 2026-11-14

backend = @ruteam/api; frontend = @ruteam/client (Expo web y móvil); packages/contracts
permanece. No app/ en raíz ni frontend paralelo. [Árbol y responsabilidades](docs/architecture/REPOSITORY_STRUCTURE.md).
Los scripts públicos anteriores no cambian. Fase 2 tiene commit publicado bab4e63, aún
fuera de feature; refactor en task/refactor-monorepo-structure depende de integrarla primero.
Las notas de falta de commit anteriores describen el corte histórico de Fase 2.

En este entorno .env aún apunta al clúster temporal55432 desaparecido: no basta iniciar
web para tener login funcional. Ver ARCH_REFACTOR_REVIEW y SETUP, sin crear/reseter bases
ni sustituir el mensaje de error por éxito ficticio. Refactor sin stage/commit/push/PR/merge.

## Entorno recuperado — 2026-11-14

PostgreSQL persistente real de desarrollo/test operativo en55432, con las mismas variables
locales.71/71 Jest,4/4 E2E y6/6 smoke actuales; configuración de caché de arranque corregida.
Las notas anteriores sobre clúster ausente describen el diagnóstico histórico.
[Procedimiento vigente](docs/development/SETUP.md#entorno-persistente-vigente--recuperación-autorizada-2026-11-14)
y [resultados](docs/reviews/POSTGRESQL_RECOVERY_VALIDATION.md). Sin integración/commit del refactor.
