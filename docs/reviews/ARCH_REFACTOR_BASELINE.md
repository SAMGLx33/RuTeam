# Baseline del refactor de estructura — 2026-11-14

Agente Codex; responsables humanos POR_ASIGNAR. Fecha/zona: 2026-11-14 America/Bogota.
Preflight en /home/darik/RuTeam/RuTeam, igual a git rev-parse --show-toplevel.
Árbol inicialmente limpio, stage vacío; checkout original task/trips-publicacion.
Fetch origin ejecutado correctamente con acceso de red autorizado, después de fallo DNS
bajo sandbox. Base local/publicada: `bab4e630784714f8fa58bcbf964ea5a48e37259a` (origin/task/trips-publicacion coincide).
feature/main/dev=e3841bc; task/docs-foundation-checkpoint=f637499 no integrado.
No existe origin/feature tras fetch. merge-base --is-ancestor task/trips-publicacion feature
exit1: Fase 2 NO integrada. Rama nueva task/refactor-monorepo-structure desde Fase 2;
se requiere integrar primero Fase 2 para un PR posterior de refactor limpio hacia feature.
No stage, commit, push, PR o merge autorizados/ejecutados.

## Inventario anterior al movimiento

Manifest completo de rutas relativas, SHA256, bytes y permisos:
[inventory-before.json](evidence/2026-11-14-arch-refactor/inventory-before.json).
Incluye TODOS los archivos rastreados de los workspaces y los .gitkeep/AGENTS; no originales
privados ni contenido de entorno. Los directorios completos se mueven incluyendo ocultos;
outputs ignorados se regeneran y no forman parte de los checksums de código.

- apps/api: 177 archivos rastreados; 119 .gitkeep.
- apps/client: 39 archivos rastreados; 14 .gitkeep.

Módulos Nest: administration, auth, boarding, campus, chat, compensations, costs, health, institutional-membership, matching, profiles, ratings, reservations, ride-execution, safety, trips, users, vehicles.

Features cliente: admin, auth, chat, ratings, reservations, ride, trips.

## Versiones observadas

Node22.22.3; npm12.2.2; Nest11.2.10; Prisma7.10.1; Expo54.0.38;
Expo Router6.0.24; React19.1.0; RN0.81.5; TS5.9.3; Playwright1.65.1.
No cambios de versiones autorizados. Lockfile se cotejará por versiones, integridad y
resolución de todos los paquetes además de enlaces locales.

## Configuración y procesos previos

Sin API en3000 ni Expo8081 ni servicios de test3100/8082. PostgreSQL del sistema en5432
es ajeno a la configuración del proyecto. .env apunta a127.0.0.1:55432, bases ruteam y
ruteam_test; no hay listener y /tmp/ruteam-pg-20261113 desapareció. No recrear ni resetear
esas bases ni modificar .env. Navegador Chromium previo /tmp/ruteam-playwright también
ausente. Estas son condiciones anteriores a la migración, no regresiones de rutas.

Expo carga dotenv ../../.env desde apps/client/app.config.ts sin override, y extra.apiUrl
lee EXPO_PUBLIC_API_URL. Valor público observado http://localhost:3000/api/v1; CORS permite
localhost/127.0.0.1:8081. Variables de Playwright para3100 prevalecen. El cliente no lee
DATABASE_URL, pero la config de Expo carga el entorno raíz existente. Se conservará esa
compatibilidad explicando precedencia y proponiendo env público separado sin copiar secretos.

Rutas dependientes: package.json root/workspaces; backend package scripts, prisma.config y
seed (../../.env); frontend tsconfig (../../packages) y app.config; tests/web/publication
importa generated Prisma; ESLint apps/client; gitignore generated. Scripts raíz, Playwright,
Jest y CI usan nombres de workspace o paths internos que deben conservar significado.
No Dockerfile; compose.yaml configura únicamente PostgreSQL, sin ruta a workspaces.

## Resultados previos

Se incorporan resultados observados en baseline.json y resumen de revisión al terminar
las ejecuciones. No se reutilizan como resultados nuevos los conteos de Fase 2.

Resultados reales antes de mover: typecheck/lint/build:api/build:web exit0; tres suites
puras20/20, Doctor18/18. Smoke exit1 porque API3000 no estaba iniciada; suites HTTP y
E2E no iniciadas por PostgreSQL55432 ausente. No es baseline71/71.
Browser Playwright (plugin Browser no disponible): escritorio1280x900 y móvilweb390x844,
UI significativa, sin pageerror ni overflow. GETauth/me y POSTlogin intentan localhost3000;
ECONNREFUSED y mensaje de conexión observados. No se reproduce aquí la condición histórica
reportada de health200 con UI fallida, porque en este preflight ni API ni BD estaban activos.
Capturas sintéticas fuera de Git con rutas en browser-baseline.json, no contienen datos reales.
Un primer intento del script de observación tuvo selector ambiguo de dos alertas; se
corrigió sólo el selector del script externo y se repitió, sin modificar la app.
