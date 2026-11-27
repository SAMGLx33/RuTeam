# RuTeam · continuidad operativa

26/11/2026, America/Bogota. Rama `task/driver-defined-routes`, base
`5af65f2d1c11f3b6091af21605a3eab21a50e163`. Revisión local de Codex. Responsables
humanos POR_ASIGNAR. Las modificaciones de la transformación del 25/11 se
conservaron. El estado compartido queda a cargo de Integración.

## Punto de control y entregas

| Frente                    | Resultado observado                                                                                                                                                            | Límite                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Regresión inicial         | 161 Jest en 17 suites de backend y cuatro casos Playwright repetidos en copia aislada                                                                                          | PostgreSQL local y fixtures controlados                                                                     |
| Identidad y correo        | Nest, PostgreSQL y SMTP Mailpit confirmaron registro, enlace de confirmación, recuperación, uso único, revocación y separación de elegibilidad                                 | La recepción por un proveedor externo y la afiliación USC oficial requieren sus respectivos operadores      |
| Cartografía               | Búsqueda autenticada con selección explícita, degradación por fallo externo y persistencia de coordenadas y geometría. Sedes USC con procedencia y lugares interiores de texto | Las sedes oficiales se cargaron con dirección. Sus coordenadas de embarque aún requieren verificación       |
| Movilidad                 | Se usa la sede y la hora estimada de recogida para coincidencia directa y la geometría para potencial. El feed y los avisos leen resultados de PostgreSQL                      | En puntos intermedios sin estimación se conserva una hora desconocida                                       |
| Viajes                    | Llegada en orden, abordaje actual, ausencias explícitas y cierre del titular. La plaza sigue siendo del viaje completo                                                         | Prueba HTTP del abordaje intermedio. Dispositivo físico pendiente                                           |
| Comunicación              | Conversación persistente por viaje, permisos de conductor y participantes, paginación, reintentos, lectura, aviso y vencimiento                                                | Consulta periódica, sin notificaciones push. La política de retención institucional sigue abierta           |
| Reputación y complementos | Diseño RF-010 trazado y pendientes de grupos, compensación y seguridad documentados                                                                                            | Producto debe aclarar escala, fórmula y direcciones que admite para RF-010. No se publicaron calificaciones |

Hallazgos corregidos en la regresión. La aparición de sedes reales dejó inválida
la suposición de que la primera sede del catálogo pertenecía al punto de
encuentro de la prueba. Los fixtures ahora resuelven la sede mediante la
referencia del punto. ESLint identificó dos expresiones de acceso dinámico
ambiguas en helpers de Supertest. El acceso explícito conserva el mismo cliente y
la misma petición. El cliente PostgreSQL emite una advertencia de deprecación
observada en las pruebas. Se registró sin alterar las versiones del stack.

Ensayo externo a través de Nest y PostgreSQL. Una búsqueda del Estadio Olímpico
Pascual Guerrero obtuvo HTTP 200 de la API a través de Photon. Con esas
coordenadas, otra parada pública y una entrada USC de prueba, OSRM FOSSGIS
calculó una ruta que la API devolvió con HTTP 200. Se publicó con HTTP 201 y se
cotejó en PostgreSQL la misma geometría de 13 puntos y tres estimaciones de parada.
El motor informó 4.927 m, dos tramos de 257 y 332 s y 10 minutos redondeados.
Se borró el viaje de ensayo tras el cotejo. Una sola tesela pública OSM de Cali
respondió HTTP 200 y fue validada como PNG de 256 × 256. Las capturas de
Playwright usan teselas controladas. Queda pendiente elegir y autorizar el
operador para una operación sostenida. [Photon](https://github.com/komoot/photon),
[condiciones de FOSSGIS](https://routing.openstreetmap.de/about.html),
[política de teselas de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/),
[sedes USC](https://www.usc.edu.co/preguntas-frecuentes/).

## PostgreSQL y preservación

PostgreSQL 18.6 en 55432. Antes de migrar `ruteam`, se generó un respaldo privado
`pg_dump -Fc` (70.556 bytes, permiso 600) y `pg_restore -l` leyó 147 objetos
del catálogo del respaldo. La restauración completa queda sin ensayar. Desarrollo,
pruebas aisladas y el respaldo permanecen en el equipo. La configuración
`.env` y las diez migraciones existentes se conservaron.

| Migración aditiva                          | Alcance                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `20261125235000_campus_and_stop_estimates` | Sede de catálogo, fuente, asociación histórica únicamente para fixtures identificados y estimación de segundos por parada |
| `20261125235900_trip_stop_progress`        | Instantes de inicio y cierre, llegada por parada y ausencia explícita                                                     |
| `20261126001000_trip_chat`                 | Mensaje, recibo de lectura, caducidad e integración con avisos                                                            |

La validación aislada aplicó las 13 migraciones en `ruteam_continuity_test`.
Desarrollo recibió las tres nuevas tras la comprobación del respaldo. El
cotejo de SHA-256 verificó 13/13 en desarrollo y 13/13 en continuidad. En la base
estándar se cotejaron 10/10 antes y 13/13 después de actualizarla. El registro conserva el
checksum exacto por migración. Los seeds de regresión se reservaron para
bases de prueba. El respaldo queda fuera de Git.

## Verificación

Node 22.22.3, npm 12.2.2, PostgreSQL 18.6, Expo SDK 54. Se ejecutaron secuencialmente
las pruebas que escriben en la misma base. El corte final repitió Jest y Playwright en el árbol real
contra `ruteam_test`. El entorno de Playwright usó Chromium
desktop y mobile-web sobre Expo y Nest locales. No había dispositivo conectado.

| Comando                                                                                                                   | Estado y resultado                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check:env`                                                                                                       | Aprobado. Node 22.22.3, Git 2.53.0 y psql 18.6 al incluir el binario PostgreSQL del equipo                                               |
| `npm run db:generate`                                                                                                     | Aprobado. Cliente Prisma regenerado                                                                                                      |
| `npm run db:migrate` y cotejo de checksums                                                                                | Aprobados. Base local y de prueba según tabla anterior                                                                                   |
| `npm run db:test:setup`                                                                                                   | Aprobado en la base aislada y en la estándar. Migraciones y seed idempotente                                                             |
| `npm run typecheck`, `npm run lint`, `npm run format:check`                                                               | Aprobados en la comprobación final. TypeScript se repitió después de generar Prisma                                                      |
| `npm test`                                                                                                                | 184/184, 23 suites. Incluye HTTP, PostgreSQL, permisos, última plaza y degradación de geocodificación                                    |
| `npm run test:e2e`                                                                                                        | 4/4, dos recorridos para cada viewport. Repite login, permisos, perfil, publicación, ruta controlada, avisos, chat y confirmación/retiro |
| `npm run smoke`                                                                                                           | 6/6 contra instancia efímera de Nest y la BD de continuidad                                                                              |
| `node --env-file=.env scripts/smoke-mailpit.mjs`                                                                          | Aprobado con contenedor Mailpit 1.34.0, SMTP real local y BD independiente. Sólo identidades sintéticas                                  |
| `npm run build:api`, `npm run build:web`                                                                                  | Aprobados                                                                                                                                |
| `npx expo-doctor frontend`                                                                                                | 18/18 tras habilitar acceso a registro y Expo. El primer intento falló por DNS restringido                                               |
| `npm exec -w @ruteam/client -- expo export --platform android --platform ios --output-dir ../../export-continuity-native` | Android e iOS exportados. Pantallas nativas sin ejecutar en teléfono                                                                     |
| `git diff --check`                                                                                                        | Aprobado en el árbol de trabajo                                                                                                          |
| Expo Go en teléfono                                                                                                       | Bloqueado por entorno                                                                                                                    |

El directorio local `/home/darik/RuTeam/.local-data/continuidad-2026-11-25/`
conserva el parche inicial, manifiestos SHA-256, logs, inventario del incremento
y capturas Playwright de geocodificación, mapa, vista previa, feed, chat y avisos.
Las capturas se limitaron a fixtures sintéticos. El informe de auditoría documenta
42 entradas (34 moderadas y ocho altas), 20 con `--omit=dev` (12 y ocho) y seis
paquetes con avisos propios, sin diferencias en el lockfile. [Auditoría de dependencias](PRODUCT_CONTINUITY_DEPENDENCIES.md).

## Recorridos y arquitectura

1. Registro, login y elegibilidad comprobados en HTTP y navegador, y verificación
   y recuperación también con Mailpit. Las preferencias se ejercitaron en web.
2. Conductor habilitado publica desde USC hacia destino externo con vista previa,
   búsqueda de lugar y persistencia. Ensayo HTTP adicional con Photon y OSRM
   reales y PostgreSQL de continuidad.
3. Coincidencia, notificación, feed, detalle y confirmación probados con Nest,
   PostgreSQL y dos sesiones web.
4. Propuesta, aceptación, confirmación y abordaje intermedio ejercitados en HTTP
   sobre PostgreSQL. La cobertura no exige un único recorrido Playwright.
5. El chat, inicio y finalización tienen pruebas web o HTTP según el paso. El
   circuito hasta calificación sigue pendiente de la decisión RF-010.
6. Restricciones por vencimiento y validación de vigencia ejercitadas en backend.
   Renovación con proveedor autorizado pendiente.
7. Retiro y disponibilidad validados por HTTP y navegador. Los avisos y el
   historial se ejercitaron según actor en sus pruebas respectivas.

MVC. Controllers de Nest validan DTO y sesión y delegan; aplicación coordina
políticas del dominio y repositorios. Prisma permanece bajo infraestructura.
Chat usa bloqueos en orden conductor → viaje y Mobility accede a proyecciones de
ruta y preferencias. Expo Router mantiene la navegación en `frontend/app` y la UI
compartida en `frontend/src`, con los contratos en `packages/contracts`. La
consulta Photon, las alternativas de ruta, el abordaje y las mutaciones de chat
pasan por Nest. Ver [arquitectura](../architecture/OVERVIEW.md),
[API](../development/API.md), [trazabilidad](../requirements/TRACEABILITY.md) y
[decisiones](../decisions/OPEN_DECISIONS.md).

## Continuidad del equipo

- **Integración y QA, POR_ASIGNAR.** Revisar este corte y repetir el flujo en un
  teléfono Expo Go conectado a la LAN. Desde raíz, iniciar `npm run dev:api` y
  `npm run dev:client` tras comprobar los puertos y usar la IP LAN para la API.
- **Producto, POR_ASIGNAR.** Aclarar escala, fórmula y quién califica a quién en
  RF-010. Continuar con el [diseño de reputación](../development/PLAN_CALIFICACIONES_RF010.md).
- **Identidad y Cartografía, POR_ASIGNAR.** Coordinar autorización de acreditación,
  envío de correo externo y verificación de las coordenadas de embarque. Para
  correo local seguir [Mailpit](../development/MAILPIT.md).

Handoffs por módulo. [SMTP](../handoffs/2026-11-25_continuidad-smtp-mailpit.md),
[geocodificación](../handoffs/2026-11-25_continuidad-geocoding.md),
[cartografía y horarios](../handoffs/2026-11-26_continuidad-cartografia-y-horarios.md),
[progreso](../handoffs/2026-11-26_continuidad-progreso-y-abordaje.md),
[chat](../handoffs/2026-11-26_continuidad-chat-y-notificaciones.md) y
[consolidación](../handoffs/2026-11-26_driver-defined-routes_continuidad-operativa.md).
