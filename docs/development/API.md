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
