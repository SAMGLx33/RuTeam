# Cliente compartido Expo

Leer ../AGENTS.md y handoff vigente. Una app Expo Router SDK 54, React 19.1,
RN 0.81.5 y Web. No frontend paralelo. Rutas y controles comunes; adaptadores
.web/.native sólo cuando son necesarios. No mover autoridad del backend al cliente.

TanStack Query para remoto; Context sesión. Formularios RHF/Zod sólo para UX,
servidor valida todo. Sesión web en cookie HttpOnly; móvil expo-secure-store;
jamás AsyncStorage para tokens. URL API configurable, localhost no es computador
en teléfono. No loguear credenciales. UI muestra estados loading/error/empty/success.

Ruta compartida: vista Expo de geometría GeoJSON y teselas raster opcionales según
ADR 0002. Cámara y GPS foreground siguen previstos para su fase. No simular pruebas físicas, pagos o afiliación oficial.
Verificar typecheck, lint, expo install --check, expo-doctor, export y Playwright;
Expo Go físico debe etiquetarse NO VERIFICADO hasta probar dispositivo real y versión.
Actualizar docs y nuevo handoff en cada avance.

## Rutas Fase 2

/vehicles, /publish, /my-trips y /document-reviews comparten componentes React Native/Web.
ProtectedPage orienta navegación; backend sigue siendo autoridad. Las categorías CAR/
MOTORCYCLE/BOTH son sintéticas de licencia, no categorías oficiales verificadas.
Ubicaciones/duración y vigencias DEMO se rotulan; no mapa/GPS/background real. No convertir
coordenada vacía en cero. RHF useWatch para campos reactivos; validación final en DTO/servicio.
Revisión admin envía revisión exacta de la tarjeta y maneja409 al cambiar el documento.
E2E corre Node/Prisma en fixture de pruebas, nunca Prisma dentro del código React.

## Estructura obligatoria y responsabilidades

Workspace Expo único, antes apps/client. Antes de cambiar: AGENTS raíz y este archivo,
coordination/ownership y handoff. Después de CADA avance: probar, documentar resultado
real aunque sea parcial/fallido, actualizar PROGRESS y crear handoff nuevo. Esta regla
rige para los agentes de los seis integrantes; personas y revisores POR_ASIGNAR.

- frontend/app es Expo Router: rutas/layouts/composición ligera, no reglas de negocio.
- frontend/src/features conserva auth/admin/trips y futuros placeholders actuales;
  screens y estado de presentación permanecen en esas ubicaciones. VehiclesScreen está
  actualmente en features/trips: no moverlo por preferencia de otro agente.
- src/components es UI reutilizable; providers, services, hooks y utilidades siguen en
  sus ubicaciones existentes. No duplicar shared, src/pages o una segunda app web.
- React presenta y solicita; API Nest autoriza identidad, documentos, cupos y publicación.
  Nunca importar Prisma/SQL/backend en React. packages/contracts comparte tipos públicos.
- .web/.native sólo para necesidades reales, con la misma interfaz. No duplicar features.
- No crear frontend/frontend, frontend/app/src o carpetas MVC globales ni root app/.

Ejemplos FUTUROS aprobados: ruta ligera en app/(driver), screen dentro de src/features
correspondiente y cliente HTTP en src/services/api. No agregar nuevos módulos en este
traslado. Leer REPOSITORY_STRUCTURE para dependencias, entorno y validaciones.
EXPO_PUBLIC_API_URL es público, no credencial. Mantener compatibilidad actual de root
.env vía app.config.ts; no copiar secretos a frontend/.env ni a extra. Usar variables
expresas de proceso para override; Playwright impone API3100. Frontend .env.example sólo
ofrece URL pública. Revisar compatibilidad con expo install --check; no aplicar --fix
ni actualizaciones automáticas durante un refactor de rutas. Expo Go físico NO VERIFICADO.

## Itinerarios y reservas — 2026-11-24

/publish permite seleccionar extremos y paradas autorizadas, ordenar, importar
GeoJSON o elegir una alternativa del motor configurado y confirmar el resumen.
/search-trips consulta matching de Nest y /my-reservations consulta participación
del actor. /my-trips gestiona solicitudes y transiciones del propietario. Las
coordenadas publicadas son puntos públicos confirmados. La app muestra cuando
falta geometría vial. No inferir validación física a partir de export o Playwright.
