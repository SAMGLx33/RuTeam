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
