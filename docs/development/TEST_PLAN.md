# Pruebas

`npm run db:test:setup` prepara migraciones+seed sin borrar datos. Usa base distinta
con sufijo _test. Jest y Playwright requieren esa separación; no ejecutar ambos a la
vez en la misma base. No se utilizan mocks de Prisma para las pruebas HTTP.

- `npm test`: compila API y ejecuta Jest ESM/Supertest con PostgreSQL real; política
  de vigencia, login activo/inactivo, sesión/hash/revocación/expiración, afiliación
  cambiada, DTOperfil, cookie web/CSRF, modo demo apagado, catálogo y404 futuro.
- `npm run test:e2e`: Chromium escritorio e iPhone13 viewport (web). Dos contextos,
  error inactivo, auth/me200, guardado/recarga PostgreSQL, catálogo ylogout.
  Inicia API3100/Expo8082; no usa servidores existentes. Browser plugin no disponible.
- `npm run smoke`: seis aserciones HTTP sobre API configurada; no imprime token.
- `npm run lint`, `npm run typecheck`: verificaciones estáticas, no ejecuciones de negocio.
- `npm run build:web`; export Android/iOS en EVIDENCE: bundle, no prueba física.
- `npm exec -w @ruteam/client -- expo install --check` y `npx expo-doctor frontend`;
  no aplicar fixes o upgrades automáticamente durante el refactor de rutas.

Pendientes: Expo Go físico versión/dispositivo, cámara/GPS/SecureStore, Windows,
concurrencia cupos (módulo aún no implementado), pruebas de carga/RNF/seguridad
productiva. No añadir tests que sólo comprueben carpetas o reproduzcan implementación.
CI ejecuta mismos comandos; workflow creado no significa ejecución remota ya probada.

## Extensión Fase 2

phase2.e2e.test.mjs usa PostgreSQL real y limpia sólo UUIDs creados por esa suite; no
reset ni borrado global. Cubre placa409, capacidad/tipo/año/color, permisos, documentos
pendientes/vencidos, destino ajeno/deshabilitado, fechas, reglas, paradas, DTO origenarray,
versión de revisión y simultaneidad de publicaciones. Políticas en phase2-policy.
publication.spec.ts prueba en dos viewports: registro→revisión admin en segundo contexto
→rechazo fecha pasada→publicaciónUSC con2recogidas→listado persistido tras recarga.
Fixtures Node de E2E usan Prisma y BD_test; tests/package.json habilita ESM (Prisma usa
import.meta), sin alterar el frontend ni crear servicios de test accesibles públicamente.
Ejecutar Jest y Playwright SECUENCIALMENTE sobre esa BD. No prueba de reservas aún.

## Traslado backend/frontend

Se conservan las suites y sus criterios; sólo publication.spec.ts cambia import del
Prisma generado al nuevo backend. Verificar con node scripts/verify-workspace-move.mjs:
inventario/hash/permisos/.gitkeep y grafo npm; es comprobación de esta migración contra
su snapshot, no un gate permanente para impedir futuros cambios de código autorizados.
Jest usa ../.env/../node_modules desde backend; contratos frontend ../packages.
Errores por BD55432 inexistente se registran como entorno previo, sin ocultarlos ni marcar
HTTP aprobado. Pruebas puras se pueden ejecutar por separado; no equivalen a las71 totales.

## Itinerario definido por conductor

- `driver-route-policy.test.mjs` cubre pares autorizados, dirección, distancia, inmutabilidad y formato/alineación GeoJSON.
- `driver-routes.e2e.test.mjs` usa PostgreSQL aislado, catálogo por nivel, USC↔Floralia, autorización, matching temporal/geométrico, grupo activo, atribución de cupos concurrente, cancelación y transiciones. `phase2.e2e.test.mjs` conserva cobertura de licencia, capacidad, fechas, solapamiento y compatibilidad del POST histórico.
- `osrm-routing.test.mjs` usa HTTP local con respuesta sintética y verifica error sin motor y descarte de geometrías invertidas. Un motor con datos viales reales y un proveedor de teselas desplegados requieren sus propias pruebas.
- `publication.spec.ts` abre sesiones de conductor, administración y pasajero. Valida datos del vehículo, publicación, GeoJSON, parada de sólo paso, solicitud y aceptación en escritorio y viewport móvil. La configuración actual usa Playwright por disponibilidad de herramientas. Teléfono físico y prueba del catálogo certificado siguen pendientes.
