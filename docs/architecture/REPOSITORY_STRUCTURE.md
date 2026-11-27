# Estructura vigente del repositorio

Un monorepo, una API Nest y una app Expo React Native/Web. Las rutas externas
backend/frontend se conservan desde el traslado14/11. La redefinición25/11 adapta
negocio y no autoriza reconstrucción, segundo frontend ni reorganización indiscriminada.

```text
RuTeam/
├── backend/                 @ruteam/api
│   ├── prisma/              schema, migraciones incrementales y seed aislado
│   ├── src/
│   │   ├── common/          capacidades transversales
│   │   ├── config/          validación de entorno
│   │   ├── infrastructure/  Prisma y adaptadores de proveedores
│   │   ├── modules/         MVC por dominio
│   │   ├── app.module.ts
│   │   ├── bootstrap.ts
│   │   └── main.ts
│   ├── test/                dominio/HTTP/PostgreSQL
│   └── prisma.config.ts
├── frontend/                @ruteam/client, único project root Expo
│   ├── app/                 Expo Router: navegación/layouts ligeros
│   ├── src/
│   │   ├── features/        screens y presentación por funcionalidad
│   │   ├── components/      UI/formularios/mapas reutilizables
│   │   ├── providers/       estado de sesión
│   │   └── services/        API y adaptadores de sesión
│   ├── app.config.ts
│   └── .env.example         sólo configuración pública
├── packages/contracts/      contratos públicos coherentes
├── tests/web/               Playwright; Prisma sólo en fixtures Node
├── scripts/                 entorno/setup/smoke/test DB
├── docs/                    definición, API, trazabilidad y evidencias
└── package.json             npm workspaces y comandos públicos
```

El árbol describe responsabilidades, no inventario exhaustivo ni evidencia de cada
función. Una carpeta planificada vacía no equivale a implementación. No mantener rutas
ADMIN operativas por su preexistencia. .gitkeep sólo en hojas planificadas vacías útiles.

## MVC y dependencias

backend/src/modules/<dominio>/controllers recibe HTTP/DTO/actor y delega a application;
application coordina domain e infrastructure/repositories. Modelo incluye entidades,
políticas, casos de uso y persistencia; vista visual vive en frontend. No reglas de
negocio en controllers ni Prisma en React. health readiness y políticas existentes
no se mueven sólo para simular capas. common no absorbe módulos.

frontend/app compone rutas; src/features conserva las pantallas, providers estado y
services red. React presenta; Nest decide permisos, documentos, modalidades, paradas y
cupos. Ambos consumen packages/contracts; no src/pages paralelo a Expo Router,
backend/src/backend/api/mvc, frontend/frontend, root app ni app web adicional.

## Entorno, coordinación y antecedentes

Scripts públicos dev:api/dev:web/dev:client y db:* conservan nombres npm. backend usa
../.env/../node_modules; Prisma genera src/generated/prisma ignorado. frontend carga
../.env sin override y usa ../packages; sólo configuración pública en extra/EXPO_PUBLIC.
Playwright impone API3100/Expo8082 y BD_test separada, suites secuenciales.

AGENTS raíz/módulo, PRODUCT_DEFINITION, ownership, PROGRESS/handoff antes de cada avance.
Schema/migraciones/seed/contratos/lockfile/app.module/config: un integrador coordinado.
Documentar y probar incluso fallo/parcial, sin Git compartido automático. Dueños humanos
POR_ASIGNAR. Versiones viejas de estructura/rutas y sus inventarios exactos se conservan
en [guías históricas](../history/2026-11-24-guides.md) y reviews/handoffs del traslado;
no usar esos snapshots para inferir ramas, migraciones o cobertura del corte actual.
