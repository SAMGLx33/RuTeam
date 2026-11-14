# RuTeam

MVP académico local de carpooling hacia la Universidad Santiago de Cali. Monorepo
TypeScript: NestJS + Prisma7/PostgreSQL + **una app Expo Router SDK54** para web y móvil.

**ENTORNO DE DEMOSTRACIÓN; VINCULACIÓN SIMULADA.** Sólo identidades sintéticas;
no integración oficial USC, cobros reales ni despliegue. Estado: primer flujo local
implementado; validación en Expo Go físico y cotejo ERS/UML pendientes.

## Arranque

Desde la raíz que contiene este README y package.json (en esta sesión:
`/home/darik/RuTeam/RuTeam`). Node22.12–22.x, npm10+, PostgreSQL local o Compose.

```bash
npm ci
cp .env.example .env
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

Funciona: login/rechazo, lectura auth/me, perfil propio persistido, logout revocable,
verificación en cada acceso y catálogo USC DEMO. Viajes/vehículos/reservas/QR/chat/
costos/admin son siguientes fases, no funciones implementadas.

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
npx expo-doctor apps/client
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
[TRACEABILITY](docs/requirements/TRACEABILITY.md) conserva30+20 posiciones sin inventar
la ERS ausente; [OPEN_DECISIONS](docs/decisions/OPEN_DECISIONS.md) registra bloqueos.
