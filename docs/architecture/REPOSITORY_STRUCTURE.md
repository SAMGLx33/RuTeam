# Estructura vigente del repositorio

Traslado local de 2026-11-14 en task/refactor-monorepo-structure. Base Fase 2 bab4e63,
no integrado en feature/dev/main. Una API Nest y una app React/Expo para web y móvil.
Inventarios exactos y excepciones en ARCH_REFACTOR_BASELINE/REVIEW y sus manifests.

```text
RuTeam/
├── backend/                 @ruteam/api, antes apps/api
│   ├── prisma/              schema, cuatro migraciones históricas y seed
│   ├── src/
│   │   ├── common/          guards, filtros, errores y placeholders transversales
│   │   ├── config/          environment.ts existente
│   │   ├── infrastructure/  Prisma, verificación, eventos/routing planificados
│   │   ├── modules/         módulos verticales existentes, sin reorganizar
│   │   ├── app.module.ts
│   │   ├── bootstrap.ts
│   │   └── main.ts
│   ├── test/                cinco suites Jest existentes
│   ├── prisma.config.ts
│   ├── jest.config.mjs
│   ├── tsconfig.json
│   ├── AGENTS.md
│   └── package.json
├── frontend/                @ruteam/client; project root Expo, antes apps/client
│   ├── app/                 _layout, index, grupos admin/driver/passenger/public
│   ├── src/
│   │   ├── features/        auth/admin/trips y placeholders futuros existentes
│   │   ├── components/      forms/ui/maps existente
│   │   ├── providers/       sesión actual
│   │   ├── services/        api/adaptadores de sesión y placeholders
│   │   └── …                config/hooks/theme/types/utils existentes
│   ├── assets/              .gitkeep conservado
│   ├── app.config.ts
│   ├── tsconfig.json
│   ├── .env.example          exclusivamente URL pública de ejemplo
│   ├── AGENTS.md
│   └── package.json
├── packages/contracts/      tipos compartidos, misma ubicación y contenido
├── tests/web/               Playwright; fixture Prisma sólo Node de pruebas
├── scripts/                 setup/env/smoke/BD; verificador de equivalencia
├── docs/
├── .github/workflows/ci.yml
├── AGENTS.md
├── package.json
└── package-lock.json
```

`apps/` desaparece sólo tras mover sus dos directorios completos y comprobar que queda
vacío. No existe app/ en raíz ni otra configuración Expo/web. node_modules, dist,
Prisma generated y .expo son outputs ignorados, no componentes versionados del árbol.

## MVC modular obligatorio del backend

Controlador (C) del módulo recibe solicitud/DTO, obtiene actor de sesión y delega al caso
de uso de application. Application orquesta dominio y persistencia; modelo (M) son las
entidades/políticas/estado de negocio. Prisma/repositories son infraestructura del modelo,
no reemplazan invariantes ni justifican consultas de negocio desde controllers.
Vista (V): React/React Native/Web en frontend; Nest sólo contratos HTTP/JSON.

Cada módulo conserva su estructura interna REAL de controllers, application, domain,
infrastructure/repositories, dto, tests y su module.ts si existe. common sólo es transversal.
No crear backend/src/backend, src/api, src/mvc o controllers/models/services globales.
No inventar domain en health ni mover membership.policy.ts para cuadrar un dibujo.
Preexistencia: health.controller.ts consulta SELECT1 para readiness y membership.policy.ts
vive directamente en domain; se preservan, sin convertir la migración en otro refactor.

Futuros archivos de vehículos se ubican en backend/src/modules/vehicles y la capa que
corresponda; viajes en trips. Un módulo nuevo exige alcance y coordinación de ownership.
Schema/seed/migraciones en backend/prisma; cualquier cambio futuro de esquema es aditivo
y requiere revisión humana de datos. Nunca editar migraciones aplicadas por mover carpetas.

## Expo Router y funcionalidades obligatorias del frontend

frontend/app sólo navegación/layout/entradas ligeras. Screens y presentación en sus
features actuales; componentes reutilizables en components, sesión en providers y red
/adaptadores en services. No mover vehículos fuera de features/trips en este traslado.
Los placeholders de features futuras conservan .gitkeep; no son funciones implementadas.
React solicita y presenta, Nest valida identidad, permisos, documentos y publicación.
Nunca importar Prisma/backend desde React ni duplicar reglas sensibles en contracts.
Futuros adaptadores .web/.native sólo cuando la plataforma lo exija, conservando interfaz.
No crear src/pages paralelo a Router, root app, frontend/frontend ni app nativa separada.

## Dependencias y agentes del equipo

backend controllers→application→domain/infrastructure; frontend ruta→feature/provider→
services/api→HTTP backend. Ambos consumen packages/contracts, sin cambiar firmas.
Cada agente de los seis integrantes lee AGENTS raíz/subárbol, coordinación y último
handoff antes de cambiar; prueba y documenta cada avance, incluso fallido/parcial.
Personas POR_ASIGNAR; esquema/lockfile/CI/contratos requieren coordinación explícita.
Antes de stage revisar privacidad/manifest; Git compartido sólo con autorización.

## Rutas, entorno y referencias históricas

Scripts públicos y nombres npm permanecen. backend usa ../.env y ../node_modules;
frontend alias de contratos usa ../packages. Prisma output relativo src/generated/prisma
permanece dentro de backend; frontend no lo consume. Test Node usa backend generated.

Root .env no cambia. app.config mantiene la carga anterior de dotenv hacia ../.env con
quiet y sin override; extra expone sólo apiUrl. Variables de proceso ya establecidas
prevalecen (incluida API3100 de Playwright). frontend/.env.example ofrece sólo variable
pública; no copiar DATABASE_URL/secretos. Ver SETUP para precedencia y LAN.

Handoffs, manifests y recibos de Fase 1/2 describen rutas anteriores con sus hashes de
entonces y se conservan como historia. Instrucciones vigentes usan backend/frontend;
planes futuros y enlaces navegables se actualizan sin cambiar RF/RNF. Cambiar carpetas
no implementa requisitos, no repara audit ni prueba Expo Go físico o integración remota.
