# API v1 vigente

Contrato operativo vigente. Consultar
[definición de producto](../requirements/PRODUCT_DEFINITION.md) y Swagger en
`/api/v1/docs`. Las rutas de la API se muestran relativas a `/api/v1`.

## Identidad y vehículos

| Operación                                         | Reglas                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| GET /health                                       | Readiness PostgreSQL.                                                                     |
| GET /auth/access                                  | Informa disponibilidad institucional y `accountEmailAvailable`, sin datos privados.       |
| POST /auth/demo/login                             | Sólo `NODE_ENV=test` y proveedor sintético habilitado. Fuera de ese entorno devuelve 404. |
| GET /auth/me, GET /me                             | Identidad de estudiante vigente y capacidades derivadas.                                  |
| PATCH /me/profile                                 | Nombre de presentación de la cuenta autenticada.                                          |
| POST /auth/logout                                 | Revoca sesión, 204.                                                                       |
| GET /vehicles, POST /vehicles                     | Vehículos propios. Registro controla datos, capacidad y placa única.                      |
| GET /vehicles/catalog                             | Tipos y configuraciones de vehículo.                                                      |
| PATCH /vehicles/:id/soat                          | Renovación declarada por el propietario, `{soatExpiresAt}`.                               |
| GET /driver-eligibility, POST /driver-eligibility | Licencia propia. Declaración mediante `{category, expiresAt}`.                            |

La documentación pública temporal distingue `DECLARED`, `VERIFIED`,
`EXPIRED` y `UNVERIFIED`. El modo académico admite declaraciones ordinarias vigentes.
El modo oficial exige una verificación autorizada. Se retiraron `/admin/demo/*`,
cuentas administrativas operativas y los permisos de aprobación. Los usuarios
históricos incompatibles están deshabilitados y sus sesiones revocadas.

## Cuentas y onboarding

| Operación                   | Entrada y resultado                                                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST /auth/register         | `{name,email,password,usagePreference}`. Correo USC normalizado; 202 genérico con `institutionalAccess` y `emailDeliveryAvailable`. El acceso académico funciona sin SMTP. |
| POST /auth/login            | `{email,password}`; 200 con `account,expiresAt`, cookie web o token sólo nativo. Credenciales inválidas devuelven 401 sin distinguir cuenta inexistente.                   |
| GET /auth/account           | `Account` privado para una sesión de cuenta, incluso pendiente o no elegible.                                                                                              |
| PATCH /auth/onboarding      | `{step,usagePreference?,complete?}`; permite avanzar de 0 a 4 y retomar. Completar requiere la política de acceso vigente. Devuelve `Account`.                             |
| POST /auth/email/request    | `{email}`; 202 genérico, 503 si el transporte no está configurado.                                                                                                         |
| POST /auth/email/confirm    | `{token,password}`; el dueño del buzón elige su contraseña, confirma correo y revoca sesiones/enlaces anteriores. 200 o 400 por enlace inválido, vencido o consumido.      |
| POST /auth/password/request | `{email}`; 202 genérico, 503 sin correo disponible.                                                                                                                        |
| POST /auth/password/reset   | `{token,password}`; 200 revoca las sesiones anteriores, 400 por enlace inválido, vencido o consumido.                                                                      |

`Account` expone correo propio, nombre, preferencia, avance, comprobación de correo, estado
institucional y capacidades `passenger`, `driverAccess` y `driver`. Un guard de sesión de
cuenta permite terminar el acceso o consultar ese estado. El guard de producto vuelve a
validar el modo institucional y el estado de la cuenta. Viajes y vehículos aplican sus permisos
por recurso. Login limita a 10/min por IP, registro y solicitudes de enlace a 6/min.
Cada propósito de enlace por cuenta admite uno nuevo por minuto y hasta diez por hora.
Enlaces con vencimientos 30 min (confirmación) y 15 min (recuperación), de uso único.
CORS, cabecera de cliente y expiración de cookie siguen vigentes.

## Movilidad, feed y notificaciones

| Operación                        | Entrada y resultado                                                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /mobility/preferences        | Preferencias privadas del actor vigente.                                                                                                                    |
| POST /mobility/preferences       | Crea una preferencia completa, 201.                                                                                                                         |
| PATCH /mobility/preferences/:id  | Reemplaza la configuración propia, 200. 404 para ID ajeno.                                                                                                  |
| DELETE /mobility/preferences/:id | Elimina la preferencia propia, 204.                                                                                                                         |
| GET /trips/feed                  | `tab=FOR_YOU\|ALL\|DESDE_USC\|HACIA_USC` y cursor opaco opcional. Devuelve tarjetas resumidas, sin coordenadas del trayecto ni zona privada del estudiante. |
| GET /trips/:id                   | Detalle del viaje futuro, del propietario, de una participación histórica o de una notificación propia. Estado y plazas vigentes.                           |
| GET /notifications               | Avisos internos propios, paginados por `cursor`. Cada aviso refleja disponibilidad actual del viaje.                                                        |
| POST /notifications/:id/read     | Marca aviso propio leído, 200 e idempotente; 404 para ID ajeno.                                                                                             |

Los contratos `MobilityPreferenceInput`, `TripFeedPage`, `TripDetail` y
`NotificationPage` describen las respuestas compartidas. Crear y editar requieren campus
de catálogo, sentido, días ISO, franja de salida en Colombia, zona habitual, radio, tipos
de vehículo y opciones de activación y avisos. Las coordenadas son opcionales por par
y las obtiene el mapa. Sin marcador, la preferencia se guarda pero no produce coincidencia
geográfica. Un detalle potencial no declara una parada autorizada.

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
| POST /participations/:id/cancel                   | Titular, retiro antes de abordar en viaje programado. Libera plazas en la misma transacción.                                               |
| POST /participations/:id/board                    | Conductor, presencia individual confirmada. Desde 30 min antes de salir hasta el final declarado.                                          |
| POST /trips/:tripId/transition                    | Conductor, acción `START`, `FINISH`, `CANCEL` o `INTERRUPT`. Estado y capacidad coherentes.                                                |
| GET /trips/:tripId/pickup-proposals               | El conductor ve las propuestas del viaje. Los demás ven sólo las propias.                                                                  |
| POST /trips/:tripId/pickup-proposals              | Estudiante distinto del conductor. Referencia pública, ubicación de mapa, indicaciones opcionales. Sólo hacia USC con geometría validable. |
| POST /trips/:tripId/pickup-proposals/:id/decision | Conductor, `{decision: ACCEPT                                                                                                              | REJECT}`. Incorpora una parada compatible sin cambiar geometría ni plazas. |

El último cupo y las transiciones se serializan en PostgreSQL. Los endpoints de
solicitudes y aprobación ordinaria se retiraron. Las solicitudes anteriores se
leen como historial. El flujo grupal vigente reúne consentimientos y confirma las plazas individuales de manera atómica.

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

## Continuidad operativa del 26/11/2026

| Operación                               | Contrato                                                                                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST /geocoding/search                  | `{query}` explícita de estudiante vigente. Devuelve `{items,attribution}`. 503 sin proveedor configurado y 502 ante fallo de éste.                   |
| GET /campus/meeting-points              | Puntos con `campusSiteId` y `sourceUrl` opcionales. Las sedes generales pueden carecer de coordenadas.                                               |
| POST /trips/route-options               | OSRM devuelve geometría y, cuando entrega tramos fiables, `legDurationsSeconds` y una `routingSelection` firmada.                                    |
| POST /trips                             | El `itinerary.routingSelection` opcional comprueba actor, puntos, geometría, duración y expiración. Persiste offsets por parada derivados del motor. |
| GET /trips/feed                         | Recomienda por sede y horario de recogida cuando hay estimación. La recomendación directa devuelve `pickupEstimatedAt`.                              |
| POST /trips/:tripId/stops/:stopId/reach | Conductor propietario, sólo en curso. Marca la siguiente parada en orden y repite sin duplicado.                                                     |
| POST /participations/:id/no-show        | Propietario, ausencia de una participación confirmada y no abordada en la parada alcanzada. Devuelve 200.                                            |
| POST /participations/:id/board          | El abordaje intermedio exige llegada registrada a la parada correspondiente. No ocupa otra plaza.                                                    |
| GET /chat/conversations                 | Lista las conversaciones que puede consultar el estudiante, con cursor opaco.                                                                        |
| GET /trips/:tripId/chat                 | Historial paginado y estado de acceso.                                                                                                               |
| POST /trips/:tripId/chat/messages       | `{clientMessageId,body}`. Persiste transaccionalmente. Un UUID repetido con texto distinto devuelve 409.                                             |
| POST /trips/:tripId/chat/read           | `{messageId}`. Avanza el cursor de lectura propio. 204.                                                                                              |
| GET /notifications                      | `kind=TRIP_MATCH` o `CHAT_MESSAGE`. El aviso de chat abre la conversación si todavía hay acceso.                                                     |

`START` conserva la verificación activa del conductor y registra el origen como alcanzado.
`FINISH` y `CANCEL` admiten sesión válida del titular tras perder vigencia estudiantil,
con validación de propiedad y estado. El chat de viaje programado o en curso requiere
propiedad o participación confirmada. Después de finalizar, la lectura dura hasta 24 h
y sólo corresponde al propietario o a quien abordó. El chat cancelado o vencido se
purga por lotes. La actualización de la interfaz usa consultas periódicas.

## Consolidación funcional, 26/11/2026

Estas rutas `/api/v1` usan sesión de estudiante vigente. Los actores se obtienen
de la sesión y los IDs de recursos se verifican en Nest. Las mutaciones de grupo,
abordaje, posición y calificación coordinan el bloqueo conductor → viaje.

| Operación                                                                     | Entrada y salida                                                                                                                     | Permisos y errores                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /ratings`                                                                | `cursor?` UUID, 20 viajes propios por página, destinos pendientes/enviados y reputación propia                                       | Conductores con pasajeros que abordaron y participantes efectivos. Incluye únicamente los comentarios enviados por el actor          |
| `GET /ratings/reputation`                                                     | Dos `ReputationSummary`, promedio numérico o `null`, capacidad y recuento                                                            | Cuenta propia                                                                                                                        |
| `GET /trips/:tripId/ratings`                                                  | Detalle propio del viaje, destinos autorizados y evaluaciones ya enviadas                                                            | 404 ajeno o ausente, 409 viaje sin finalizar para actor autorizado                                                                   |
| `POST /trips/:tripId/ratings`                                                 | `{rateeId,stars,comment?}`; 1–5 entero, texto hasta 500; devuelve la evaluación 201                                                  | Autoría de sesión, pares entre conductor y pasajero abordado. 400 autocalificación/rango, 403 par inválido, 404 ajeno, 409 duplicado |
| `POST /trips/:tripId/groups`                                                  | `{pickupId,dropoffId,expectedMembers}`; 2–4 incluido el organizador, acotado por cupos ofertados. Devuelve grupo y código temporal   | Estudiante ajeno a la conducción del viaje. Crear implica consentimiento del organizador                                             |
| `POST /trip-groups/preview`, `POST /trip-groups/join`                         | `{code}`; vista previa de condiciones, el segundo registra consentimiento. Cupos intactos                                            | Sólo estudiantes elegibles, código válido. Expiración a las dos horas como máximo, acotada a salida                                  |
| `GET /trip-groups`, `POST /trip-groups/:id/invitation`                        | Grupos propios y renovación del código por el organizador                                                                            | La renovación invalida el código anterior y conserva consentimientos y expiración original                                           |
| `POST /trip-groups/:id/confirm`                                               | Vista del grupo confirmado con participación individual por cada integrante                                                          | Organizador, grupo completo y aún vigente. 403 elegibilidad, 409 conflicto de plazas/estados/duplicados                              |
| `DELETE /trip-groups/:id/membership`                                          | Retiro de consentimiento abierto o cierre del grupo por el organizador                                                               | Las participaciones confirmadas se retiran por su operación individual existente                                                     |
| `POST /participations/:id/boarding-pass`                                      | Devuelve `{code,expiresAt}` con cache deshabilitado                                                                                  | Titular de participación individual confirmada en punto y ventana válidos. Código opaco de dos minutos                               |
| `POST /trips/:tripId/boarding-pass/redeem`                                    | `{code}` devuelve la participación abordada                                                                                          | Conductor del viaje. 409 por código usado, vencido, de otro viaje o abordaje inválido; operación atómica                             |
| `GET /trips/:tripId/safety`                                                   | Estado activo, salida, arranque y paradas actual/próxima con ETA cuando se conoce                                                    | Propietario o participante confirmado sin ausencia; respuesta reducida, sin cache                                                    |
| `GET /trips/:tripId/location`                                                 | Última posición vigente con `accuracyMeters?` y recorrido publicado separado. Puede devolver muestra nula                            | Conductor y pasajero confirmado sin ausencia ni descenso en el viaje activo. Respuesta privada sin caché                             |
| `POST /trips/:tripId/location`, `DELETE /trips/:tripId/location`              | `{latitude,longitude,capturedAt,accuracyMeters?}` para compartir. DELETE retira la muestra y acepta `{throughCapturedAt?}`. HTTP 204 | Conductor titular en viaje activo. Caducidad de dos minutos y al menos 15 s entre envíos                                             |
| `GET /trips/:tripId/expense-estimate`, `POST /trips/:tripId/expense-estimate` | GET `{estimate,editable}`. POST escribe `{fuelCop,tollsCop,parkingCop}` y devuelve suma exacta en COP                                | Conductor titular. Enteros de 0 a 100.000.000 por concepto. Escritura antes de iniciar; 404 tercero, 409 estado                      |

El feed, búsqueda y detalle muestran la reputación del conductor. El listado
autorizado de participantes añade reputación de pasajero en participaciones
individuales confirmadas sin ausencia. La bandeja conserva tipos persistentes
`TRIP_MATCH`, `CHAT_MESSAGE`, `RATING_AVAILABLE` y `GROUP_CONFIRMED`.

`accuracyMeters` es la precisión estimada que reportó el dispositivo. Se omite
cuando es desconocida. El servidor conserva una sola muestra. Al detener, la
hora opcional `throughCapturedAt` permite que el servidor rechace una muestra
del mismo instante o anterior que llegue después del DELETE. La pausa del
dispositivo conserva el último punto hasta que venza. Los estados de lectura
siguen siendo `AVAILABLE`, `STALE`, `NOT_SHARED` y `ENDED`.

## Cierre funcional de economía y seguridad

Las rutas de abajo son relativas a `/api/v1`. Requieren sesión válida y estudiante
vigente. Las respuestas privadas usan `Cache-Control: private, no-store`.

| Operación                                          | Entrada y salida                                                                                                 | Autorización                                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `POST /trips/economics-preview`                    | `{ offeredSeats, economics: { estimate?, compensationMethods } }` → estimación, fuente declarada, total y aporte | Conducción habilitada                                                                                 |
| `POST /trips`                                      | `economics?` con el mismo objeto. Omisión publica viaje gratuito. El servidor recalcula al guardar               | Conductor propietario de vehículo elegible                                                            |
| `GET/POST /trips/:tripId/expense-estimate`         | Desglose privado. Escritura antes del inicio con aporte cero o histórico                                         | Conductor propietario                                                                                 |
| `GET /participations/:id/compensation`             | Condiciones, registro, permiso de declaración y acciones                                                         | Titular individual y conductor propietario                                                            |
| `POST /participations/:id/compensation`            | `{ method }` con un método publicado. Importe del viaje, estado `DECLARED`                                       | Titular confirmado y abordado, viaje completado                                                       |
| `POST /participations/:id/compensation/resolution` | `{ action }` con `ACKNOWLEDGE`, `DISPUTE` o `CANCEL`                                                             | Conductor para reconocer o discrepar. Titular para cancelar                                           |
| `GET/POST /me/emergency-contacts`                  | Listado o formulario `{ name, phone, relationship?, available }`                                                 | Cuenta propietaria                                                                                    |
| `PUT/DELETE /me/emergency-contacts/:id`            | Sustitución o eliminación del contacto. DELETE responde 204                                                      | Cuenta propietaria                                                                                    |
| `GET /trips/:tripId/incidents`                     | `{ canCreate, records }`, hasta 50 registros propios recientes                                                   | Actor autorizado en el viaje o autor con historial                                                    |
| `POST /trips/:tripId/incidents`                    | `{ kind, description }`, tipo `ROAD_SAFETY`, `CONDUCT` o `OTHER` y texto entre 5 y 1.000 caracteres              | En curso, conductor o participante confirmado sin ausencia. Completado, conductor o pasajero abordado |
| `GET /trips/:tripId/location`                      | `state` `AVAILABLE`, `STALE`, `NOT_SHARED` o `ENDED`. Sólo disponible trae coordenadas y vencimiento             | Contexto de viaje activo, conductor o participante. Para cierre, propietario o pasajero abordado      |

`economics` se devuelve en detalle, feed, vistas de viaje, participación y
consentimiento grupal. Incluye importe público y métodos. `null` describe un
viaje publicado antes de persistir condiciones económicas. Los componentes de
gastos se devuelven sólo al conductor en estimación y revisión previa.

Los eventos internos se distinguen por tipo y clave estable por participación,
propuesta, recogida o grupo. Inicio, finalización y cancelación usan una clave
por viaje. Chat mantiene un aviso agregado actualizable por conversación y
destinatario. El commit del registro de compensación incluye su aviso.
Los endpoints de recursos conservan sus propios controles al navegar desde avisos.

## Endpoints de continuidad

Rutas bajo `/api/v1`. Las consultas usan la cuenta de la sesión. Las respuestas privadas usan `Cache-Control: no-store`.

| Método y ruta                                                 | Entrada y comportamiento                                                                                                                                                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /trip-schedules`, `GET /trip-schedules/:id`              | Plantillas propias con hasta 40 fechas recientes y próximas, resultados de generación y vínculos a viajes.                                                                                                              |
| `POST /trip-schedules`, `PUT /trip-schedules/:id`             | `RecurringTripInput` con nombre, fechas locales ISO, hora de Colombia, días 1–7 (lunes a domingo) y plantilla de publicación. El PUT conserva viajes ya publicados.                                                     |
| `POST /trip-schedules/:id/action`                             | `PAUSE`, `RESUME`, `RETRY`, `CANCEL` o `CANCEL_FUTURE`. La última cancela también viajes futuros programados sin abordaje.                                                                                              |
| `POST /trips/:id/duplicate`                                   | `departureAt` ISO con zona. Reutiliza el itinerario validado del conductor y publica un viaje nuevo sujeto a requisitos actuales.                                                                                       |
| `GET /auth/lifecycle`                                         | `AccountSettings`. Sesiones activas y viajes, participaciones y recurrencias afectados.                                                                                                                                 |
| `POST /auth/lifecycle/sessions/:id/revoke`                    | Contraseña actual. Revoca una sesión propia.                                                                                                                                                                            |
| `POST /auth/lifecycle/close`                                  | Contraseña, `confirmed: true` y `DEACTIVATE` o `REQUEST_DELETION`. Devuelve `AccountLifecycleStatus`.                                                                                                                   |
| `POST /auth/lifecycle/status`, `POST /auth/lifecycle/recover` | Correo y contraseña. La recuperación requiere `confirmed: true` y `WITHDRAW_DELETION` o `REACTIVATE`. Tiene límite de frecuencia propio.                                                                                |
| `GET /mobility/statistics?months=12`                          | `MobilityStatistics` agregadas de 1 a 36 meses. Los campos de distancia pueden ser nulos. `environmental.status` es `NO_DATA` o `AVAILABLE`.                                                                            |
| `GET /economics/history`                                      | `EconomicHistory` con `role` (PASSENGER/DRIVER), `filter` (FREE, SUGGESTED, DECLARED, ACKNOWLEDGED, DISPUTED, CANCELLED), `month` (AAAA-MM), `tripId` opcional y `offset`. Totales del filtro completo y páginas de 20. |
| `POST /trips/:id/transition`                                  | `CANCEL` acepta motivo opcional. `INTERRUPT` requiere `reason` y `confirmedSafe: true`. Devuelve `INTERRUMPIDO` y conserva abordajes.                                                                                   |
| `POST /participations/:id/cancel`                             | El titular puede enviar `reason` en retiros permitidos.                                                                                                                                                                 |
| `GET /me/incidents`, `GET /me/incidents/trips`                | Historial propio y viajes elegibles, con `offset` y páginas de 20.                                                                                                                                                      |
| `GET /me/incidents/:id/export`                                | `IncidentExport` con el registro del autor y el contexto del viaje. El cliente prepara la acción de compartir.                                                                                                          |

Las nuevas clases DTO aparecen en Swagger bajo `recurring-trips`, `account-lifecycle`, `mobility-statistics`, `economic-history` y `private-safety`. La bandeja `GET /notifications` sigue unificada. Los avisos de cuenta pueden tener `tripId: null`.

## Endpoints de evolución ambiental y comunicación

| Método y ruta                                               | Contrato y regla                                                                                                                                                                       |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUT /vehicles/:id/energy`                                  | Propietario. `{profile: {propulsion, source, average?, unit?}}` o `{profile:null}`. Afecta publicaciones nuevas. El registro `POST /vehicles` también acepta `energyProfile` opcional. |
| `GET /mobility/statistics?months=12`                        | Agrega emisiones de operación y atribución por rol, mes y alcance. Indica faltantes por causa.                                                                                         |
| `GET /mobility/environment/trips/:id`                       | Conductor del viaje completado o pasajero que abordó. Factor, atribución y disponibilidad de contraste.                                                                                |
| `PUT /mobility/environment/trips/:id/alternative`           | Participación individual propia y abordada. `{mode, energy?}`. `UNSPECIFIED` retira la declaración.                                                                                    |
| `GET /realtime` · `GET /realtime/trips/:id`                 | SSE autorizado `RealtimeSignal`. Consultar [protocolo](REALTIME.md).                                                                                                                   |
| `GET /trips/:id/operation`                                  | `TripOperation`. Titular o miembro. Sólo titular ve ocupación y conteos del grupo operativo.                                                                                           |
| `GET /mobility/activity`                                    | `PendingActivity[]`. Proyección de acciones y recordatorios propios.                                                                                                                   |
| `GET /mobility/agenda?start=AAAA-MM-DD&days=7`              | `MobilityAgenda`. Ventana de 7 o 28 días en Colombia.                                                                                                                                  |
| `GET /trips/:id/reuse`                                      | Plantilla editada por el conductor titular. Ruta legítima validada con firma nueva cuando se dispone de tiempos completos.                                                             |
| `GET /notification-settings` · `PUT /notification-settings` | `NotificationSettings` y cinco controles booleanos de avisos opcionales.                                                                                                               |
| `POST /notification-settings/devices`                       | Registro configurado por sesión con token Expo, secreto de instalación, plataforma y consentimiento.                                                                                   |
| `DELETE /notification-settings/devices/:id`                 | Revoca el dispositivo de la cuenta titular.                                                                                                                                            |

El marco y las unidades del cálculo están en [Estimaciones ambientales](ENVIRONMENTAL_METHOD.md). Registro, reintentos y recibos están en [Preferencias de avisos y push](NOTIFICATION_SETTINGS.md).

## Operación de viaje y movilidad cotidiana

| Operación                                                                           | Entrada y efecto                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PATCH /trips/:tripId`                                                              | Conductor propietario. `{version,description}` o `{version,publication}` con el DTO de publicación. 409 por versión obsoleta o cambio esencial con referencias de participación, grupo o propuesta. La edición completa revalida recorrido, documentación, horario y aporte. |
| `POST /trips/:tripId/delay`                                                         | Propietario. `{estimatedDepartureAt}` en ISO 8601 con zona. Conserva `departureAt`, admite hasta tres horas de demora y registra aviso por estimación.                                                                                                                       |
| `GET /trips/:tripId/operation`                                                      | Propietario o participante propio. Expone salida programada/estimada, inicio, vencimiento observado y estado operativo. Pasajero recibe sólo su participación. Conductor recibe conteos de abordaje, descensos, ausencias y pendientes.                                      |
| `POST /participations/:id/drop-off`                                                 | Conductor del viaje en curso. Requiere abordaje, participación confirmada individual y parada de descenso alcanzada. 200 idempotente, 403 por actor ajeno, 409 por secuencia inválida. Conserva plazas.                                                                      |
| `POST /trips/:tripId/transition`                                                    | `START`, `FINISH`, `CANCEL` o `INTERRUPT`. `FINISH` con personas a bordo sin descenso exige `confirmMissingDropoffs: true`. Una consulta desactualizada puede recibir 409 con `code: TRIP_CLOSE_REQUIRES_CONFIRMATION`.                                                      |
| `GET /mobility/saved-trips` y `PUT/DELETE /mobility/saved-trips/:id`                | Guardados privados. Borrar devuelve 204.                                                                                                                                                                                                                                     |
| `PUT/DELETE /mobility/saved-trips/:id/availability-alert`                           | Habilita o retira avisos sobre disponibilidad de un guardado propio. 200/204.                                                                                                                                                                                                |
| `GET/POST /mobility/frequent-places` y `PATCH/DELETE /mobility/frequent-places/:id` | Lugares privados. Alta 201, edición 200, retiro 204.                                                                                                                                                                                                                         |
| `GET /mobility/agenda`                                                              | Añade hora estimada, recogida, descenso e identificadores de conflictos propios. Conserva el estado operativo vencido.                                                                                                                                                       |
| `PUT /notification-settings`                                                        | `reminderLeadMinutes` opcional en 15, 30 o 60. Predeterminado 30.                                                                                                                                                                                                            |
| `POST /mobility/preferences` y `PATCH /mobility/preferences/:id`                    | `maxContributionCop` opcional, entero en COP.                                                                                                                                                                                                                                |

Los viajes sin iniciar con ventana agotada persisten como `PROGRAMADO` con
`expiredAt` y exponen `departureState=EXPIRED`. El trabajador revalida bajo
bloqueo, conserva las confirmaciones históricas y caduca invitaciones,
propuestas y pases. La retirada propia sigue disponible antes de abordar
mientras el viaje permanezca programado. El cálculo de emisiones conserva
la geometría prevista y devuelve la procedencia del descenso en resultados nuevos.

## Acceso declarado y maniobras

`GET /auth/access`, `POST /auth/register` y `Account` incluyen
`institutionalAccess: DECLARED_DOMAIN | OFFICIAL`. `DECLARED` expresa acceso
por dominio sin fuente acreditada. `GET /auth/me` devuelve `membership: null`
en ese caso. Los enlaces de confirmación quedan fuera del acceso declarado.
En ese modo la recuperación por correo requiere un buzón previamente verificado.

`POST /trips/route-options` puede devolver `maneuvers` junto con la alternativa
firmada. La publicación o edición presenta el mismo conjunto y Nest valida su
asociación. `GET /trips/:id/operation` incluye las maniobras disponibles para
el conductor propietario.
