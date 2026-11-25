# API v1 vigente

Contrato operativo del corte local del 25 de noviembre de 2026. Consultar
[definición de producto](../requirements/PRODUCT_DEFINITION.md) y Swagger en
`/api/v1/docs`. Las rutas de la API se muestran relativas a `/api/v1`.

## Identidad y vehículos

| Operación                                         | Reglas                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET /health                                       | Readiness PostgreSQL.                                                                            |
| GET /auth/access                                  | Informa disponibilidad institucional y de fixtures, sin datos privados.                          |
| POST /auth/demo/login                             | Sólo fixtures opt-in de desarrollo/test, cuerpo `{identity}`. Es un mecanismo local y explícito. |
| GET /auth/me, GET /me                             | Identidad de estudiante vigente y capacidades derivadas.                                         |
| PATCH /me/profile                                 | Nombre de presentación de la cuenta autenticada.                                                 |
| POST /auth/logout                                 | Revoca sesión, 204.                                                                              |
| GET /vehicles, POST /vehicles                     | Vehículos propios. Registro controla datos, capacidad y placa única.                             |
| GET /vehicles/catalog                             | Tipos y configuraciones de vehículo.                                                             |
| PATCH /vehicles/:id/soat                          | Renovación declarada por el propietario, `{soatExpiresAt}`.                                      |
| GET /driver-eligibility, POST /driver-eligibility | Licencia propia. Declaración mediante `{category, expiresAt}`.                                   |

La documentación pública temporal distingue `DECLARED`, `VERIFIED`,
`EXPIRED` y `UNVERIFIED`. El fixture puede usar declaraciones de desarrollo.
Producción requiere una verificación autorizada. Se retiraron `/admin/demo/*`,
cuentas administrativas operativas y los permisos de aprobación. Los usuarios
históricos incompatibles están deshabilitados y sus sesiones revocadas.

## Publicación y búsqueda

- `GET /campus/meeting-points`, `GET /campus/destinations` y `GET /trip-rules` consultan catálogos.
- `POST /trips/route-options` acepta origen, destino, puntos de paso, sentido y
  consentimiento para consultar el motor vial configurado. Devuelve alternativas.
- `POST /trips` requiere vehículo, salida, plazas, duración, reglas e
  `itinerary`; la forma anterior sin itinerario se retira. La geometría opcional
  debe corresponder al orden publicado. La vista selecciona, Nest valida.
- Un extremo se representa con `{campusPointId, label?, instructions?}`. El FK
  debe ser una referencia activa USC. Un nombre libre conserva las coordenadas
  aproximadas de la referencia. El extremo externo usa `{label, latitude,
longitude, instructions}` obtenido por selección en el mapa.
- `direction` admite `DESDE_USC` o `HACIA_USC`. El servidor lo deriva de los
  extremos y rechaza contradicciones, dos extremos externos, o internos ambos.
  En DESDE_USC se aborda en origen y las demás paradas son de descenso o de paso.
- `GET /trips/available` filtra dirección, `fromText`/`toText`, catálogo,
  franja, plazas y cursor. Búsqueda textual no acredita proximidad. Los filtros
  técnicos de proximidad por puntos se conservan. El marcador
  `near=latitud,longitud` filtra por geometría vial guardada con `radiusKm` sin
  generar un punto de abordaje.
- `GET /trips/my` mantiene lectura histórica del propietario, incluidos formatos anteriores.

## Participación y recorrido

| Operación                                         | Actor y efecto                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| POST /trips/:tripId/participations                | Estudiante, `{pickupId, dropoffId}`. 201 directo y reintento con el mismo identificador. Consume una sola plaza.                           |
| GET /trips/:tripId/participations                 | Propietario del viaje, consulta confirmaciones e historial.                                                                                |
| GET /reservations/my                              | Participaciones e historial del estudiante.                                                                                                |
| POST /participations/:id/cancel                   | Titular, retiro futuro antes de abordar. Libera plazas en la misma transacción.                                                            |
| POST /participations/:id/board                    | Conductor, presencia individual confirmada. Desde 30 min antes de salir hasta el final declarado.                                          |
| POST /trips/:tripId/transition                    | Conductor, `{action: START                                                                                                                 | FINISH                                                                     | CANCEL}`. Estado y capacidad coherentes. |
| GET /trips/:tripId/pickup-proposals               | El conductor ve las propuestas del viaje. Los demás ven sólo las propias.                                                                  |
| POST /trips/:tripId/pickup-proposals              | Estudiante distinto del conductor. Referencia pública, ubicación de mapa, indicaciones opcionales. Sólo hacia USC con geometría validable. |
| POST /trips/:tripId/pickup-proposals/:id/decision | Conductor, `{decision: ACCEPT                                                                                                              | REJECT}`. Incorpora una parada compatible sin cambiar geometría ni plazas. |

El último cupo y las transiciones se serializan en PostgreSQL. Los endpoints de
solicitudes y aprobación ordinaria se retiraron. Las solicitudes anteriores se
leen como historial y nunca se convierten en confirmaciones. El flujo grupal
con consentimiento se mantiene en el backlog.

Errores comunes: 400 DTO, sentido o secuencia inválida, 401 sesión ausente o
expirada, 403 elegibilidad o titularidad, 404 recurso o ruta retirada, 409
duplicación incompatible, viaje cerrado o sin plazas, 429 límite y 503 dependencia
no disponible. Ejemplos y DTO tipados residen en los contratos y Swagger.

## Referencia histórica del corte anterior

El contenido siguiente describe el API anterior al 25 de noviembre. Sus rutas,
permisos y formatos incompatibles quedaron sustituidos por los descritos arriba.

# API v1 implementada

Base /api/v1; Swagger UI /api/v1/docs y JSON /api/v1/docs-json. DTOs validan y rechazan
campos desconocidos. Mutaciones exigen `x-ruteam-client: web|native`; Origin, si existe,
debe pertenecer a CORS_ORIGINS exactos. Para web fetch credentials include y cookie
HttpOnly SameSite Strict; native recibe token y usa Authorization Bearer. HTTP sólo demo.

| Método/ruta             | Entrada                        | Resultado                             | Acceso                     |
| ----------------------- | ------------------------------ | ------------------------------------- | -------------------------- |
| GET health              | —                              | 200 status/database/demo,503 BD caída | público                    |
| POST auth/demo/login    | identity ana/diego/laura/admin | 201 user/expiresAt, token sólo native | bandera demo;403 inactivo  |
| GET auth/me             | —                              | 200 CurrentUser                       | sesión + afiliación activa |
| POST auth/logout        | —                              | 204 revocación                        | sesión válida              |
| GET me                  | —                              | 200 CurrentUser                       | sesión + afiliación activa |
| PATCH me/profile        | displayName2–80 trim           | 200 displayName persistido            | dueño de sesión            |
| GET campus/destinations | —                              | 200 catálogo activo USC DEMO          | sesión + afiliación activa |

CurrentUser en packages/contracts. MEMBER/ADMIN asignado en seed; capabilities.driver
es sintético y no permite publicar sin validar vehículo en siguiente fase.
No se retornan hashes, sesiones o documentos. Auth/guard usa vigencia, no sólo email.
Errores400 DTO,401 sesión,403 acceso,404 no implementado,429 throttling; login20/min,
resto100/min por IP en memoria de la instancia. No hay registro libre/contraseñas.
Sesión opaca256bits, hash SHA256,1h máximo, revocación logout, SecureStore nativo.

WS: ningún gateway/evento implementado aún. Contrato futuro del prompt:
reservation.requested/decided, trip.started/position/stop.arrived/completed,
chat.send/message, notification.created. No emitirlos ni anunciar Socket.IO funcional.
Validar handshake y autorización por evento/sala e idempotencia cuando se implemente.

## Fase 2 — contratos implementados localmente

Todos exigen sesión y afiliación ACTIVA; x-ruteam-client/Origin conservados. Datos
únicamente DEMO. Sin cambio de /api/v1 ni de rutas auth/perfil existentes.

| Método/ruta                                   | Entrada/salida                                                                               | Permiso                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| GET vehicles/catalog                          | colores/tipos/categorías DEMO                                                                | miembro activo                        |
| POST vehicles                                 | plate,type,passengerCapacity,brand,modelYear,color,soatExpiresAt →201 VehicleSummary PENDING | propietario desde sesión              |
| GET vehicles                                  | VehicleSummary[] propios                                                                     | propietario                           |
| GET driver-eligibility                        | DemoLicense o null                                                                           | propia                                |
| POST driver-eligibility                       | category CAR/MOTORCYCLE/BOTH,expiresAt →201 PENDING; incrementa revision                     | propia, sólo modo demo                |
| GET admin/demo/document-reviews               | pendientes SOAT/licencia; identificadores/revision y nombre sintético mínimo                 | ADMIN asignado                        |
| POST admin/demo/vehicles/:id/review           | decision APPROVED/REJECTED,revision →201; reviewer/time persistidos                          | ADMIN, sólo demo                      |
| POST admin/demo/driver-eligibility/:id/review | decision,revision →201 DemoLicense                                                           | ADMIN, sólo demo                      |
| GET trip-rules                                | catálogo activo de IDs/códigos/descripciones                                                 | miembro activo                        |
| POST trips                                    | PublishTripInput →201 TripSummary                                                            | conductor con licencia/vehículo aptos |
| GET trips/my                                  | TripSummary[] propios ordenados por salida                                                   | propio                                |

Fechas API ISO8601; frontend muestra Colombia y convierte fecha/hora local con offset−05:00.
Placa normalizada uppercase; CAR=AAA123, MOTORCYCLE=AAA12C. Capacidad sin conductor
CAR1..4, moto1; año>1990 y≤año actual+1, color del catálogo. Unicidad global de placa409.
Nuevo SOAT/registro y licencia quedan pendientes; nadie puede autodeclarar APPROVED desde
DTO. Revisión compara revision y estadoPENDING después de tomar bloqueo;409 si cambió
o ya fue revisada,400 si vencida. Usuario sinADMIN recibe403. No consulta SOAT/RUNT/USC.

PublishTripInput: vehicleId propio, destinationId USC activo, origin{label,latitude,longitude}
(objeto, nunca array), departureAt>ahora+30min, estimatedDurationMinutes5..360 DEMO,
offeredSeats1..capacidad, ruleIds[] válidos (DEFAULT si vacío), stops[]{position,label,lat,lon}
con1..10 posiciones consecutivas (0paradas permitido), providesHelmet boolean obligatorio
sólo moto. Nombres reales de coordenadas en origin/stops: latitude/longitude.
Entrada destino externo/campo status/occupiedSeats/driverId inyectado rechazada400;
vehículo ajeno403. SOAT/licencia aprobados, DEMO y vigentes hasta final del intervalo.
Solapamiento [salida,final) con PROGRAMADO/EN_CURSO del mismo conductor devuelve409.
Bloqueo SQL parametrizado de User y transacción Prisma incluyen viaje/paradas/reglas/
eventoPUBLISHED. Dos publicaciones simultáneas no pasan ambas.

TripSummary devuelve el ciclo PROGRAMADO/EN_CURSO/COMPLETADO/CANCELADO y la ocupación
derivada DISPONIBLE/LLENO. Trip.version se conserva internamente en BD para fases futuras;
no es un campo del contrato TripSummary ni de su respuesta HTTP actual. Esta fase sólo publica PROGRAMADO,0ocupados;
ninguna reserva/endpoints de recorrido. GETtrips general sigue404, no es búsqueda de matching.
Duración/origen/paradas son DEMO, sin distancia ni costo ni ETA de carretera fabricados.
Contratos de salida en packages/contracts; Swagger refleja los DTO de entrada.

## Rutas de repositorio — 2026-11-14

Controladores/aplicación/dominio/repositorios en backend/src/modules; UI en frontend.
packages/contracts conserva contenido y posición. No cambian /api/v1, DTOs, firmas,
estados, permisos o reglas por mover los workspaces. Pruebas de entorno en review del
refactor; una exportación no acredita disponibilidad PostgreSQL ni login real.

## Itinerarios, matching y reservas — 2026-11-24

Corte local de `task/driver-defined-routes`. Contratos TypeScript en `packages/contracts/src/routes.ts`. Todas las operaciones siguientes requieren sesión activa.

| Método/ruta                             | Entrada y resultado                                                                                                                                                           | Autoridad                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| GET campus/meeting-points               | 200 `CampusMeetingPoint[]`. Referencia general, puntos concretos, tipo, nivel, acceso, coordenadas opcionales y señal DEMO                                                    | Miembro activo                                   |
| POST trips/route-options                | 200 `RouteOption[]` con las alternativas, distancia y duración del proveedor. 503 sin motor; 422 sin ruta válida; 502 fallo del motor                                         | Conductor activo con licencia aprobada           |
| POST trips                              | `PublishTripInput` → 201 `TripSummary`. Para nuevos itinerarios, enviar `itinerary` en lugar de los tres campos previos `origin`, `destinationId` y `stops` de nivel superior | Conductor con vehículo propio y documentos aptos |
| GET trips/my                            | 200 viajes propios. `itinerary: null` en registros históricos. IDs, extremos, geometría y permisos de paradas en itinerarios nuevos                                           | Conductor propietario                            |
| GET trips/available                     | 200 `TripSearchPage`. Filtros `from`, `to`, `after`, `before`, `seats`, `radiusKm`, `cursor`                                                                                  | Miembro activo                                   |
| POST trips/:tripId/reservation-requests | `{ memberIds, pickupId, dropoffId }` → 201 `ReservationView` pendiente. Cupos derivados de IDs distintos                                                                      | Solicitante incluido explícitamente en el grupo  |
| GET trips/:tripId/reservation-requests  | 200 hasta 50 solicitudes del viaje, pendientes primero                                                                                                                        | Conductor propietario                            |
| POST reservation-requests/:id/decision  | `{ decision: "ACCEPT" \| "REJECT" }` → 200. Aceptación toma todas las plazas conjuntamente                                                                                    | Conductor propietario                            |
| POST reservation-requests/:id/cancel    | 200. Retiro de solicitud pendiente                                                                                                                                            | Solicitante                                      |
| GET reservations/my                     | 200 hasta 50 solicitudes/reservas donde participa el actor, más recientes primero                                                                                             | Miembro del grupo                                |
| POST trips/:tripId/transition           | `{ action: "START" \| "FINISH" \| "CANCEL" }` → 200 con `id`, `status`, `occupiedSeats`                                                                                       | Conductor propietario                            |

Cada punto recibe `{campusPointId, instructions?}` o `{label, latitude, longitude, instructions, campusReference?}`. Para referencia interna personalizada, `campusReference` sólo permite `USC`. `itinerary` requiere `origin`, `destination`, `stops`, `description` y `publicMeetingPoints: true`. Cada intermedio incluye `access` (`PICKUP`, `DROPOFF`, `BOTH`, `WAYPOINT`). El orden del arreglo determina el de recorrido. `geometry` opcional recibe hasta 500 pares GeoJSON. El API valida la alineación con los puntos. `route-options` recibe únicamente `origin`, `destination`, `stops` y `publicMeetingPoints`. Ninguna sugerencia por sí sola modifica la publicación.

Los selectores `from`/`to` aceptan `USC`, UUID de punto institucional o `latitud,longitud`. Con coordenadas se exige radio explícito mayor que 0 y menor que 4 km. `after` es inclusivo, `before` exclusivo y la salida siempre futura. Cada resultado incluye su mejor par autorizado en orden de viaje, datos mínimos y geometría compartida. Orden de resultados por salida e ID. Límite de 20 coincidencias y hasta 200 candidatos por consulta. Si hay siguiente cursor, pueden quedar coincidencias aun con una página vacía.

Reservas por viaje completo. Un grupo de 1–4 afiliaciones activas, sin el conductor, usa un único par. Pendientes no consumen cupos. Un participante sólo puede estar en una solicitud activa por viaje. 400 si el par es inválido, 403 por afiliación o autoridad, 404 si falta el recurso y 409 si no hay disponibilidad, la solicitud está duplicada o el estado impide la operación. Repetir una decisión ya aplicada devuelve el resultado actual sin consumir plazas adicionales. Una repetición de creación con los mismos miembros obtiene 409.

La ocupación y los cambios de estado se confirman con PostgreSQL. Sólo se permite `PROGRAMADO → EN_CURSO → COMPLETADO` y `PROGRAMADO → CANCELADO`. Retiro de confirmadas por pasajeros, abordaje verificado, notificaciones, chat y compensaciones conservan sus decisiones pendientes.

La lista de reservas conserva coordenadas e indicaciones de abordaje y descenso para cada participante, incluso cuando el viaje se llena o sale del buscador. El cursor del buscador no expone datos de candidatos excluidos. Tras reiniciar el proceso, se debe iniciar una búsqueda nueva. Los listados de reservas están limitados al corte DEMO de 50 filas por consulta.
