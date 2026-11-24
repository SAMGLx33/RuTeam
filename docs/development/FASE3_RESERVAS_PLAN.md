# Fase 3 — plan técnico de reservas grupales

Estado: DISEÑO PARA REVISIÓN. Ninguna tabla, endpoint, pantalla o prueba de reservas
se implementa en esta intervención. Personas responsables: POR_ASIGNAR.

## Condiciones para comenzar

1. Fase 2 revisada, commit autorizado y promoción a `feature` aprobada por el equipo.
   Crear/reutilizar `task/reservations-cupos` desde esa base limpia, sin copiar el árbol sucio.
2. Integrador de datos revisa esquema, locking y protocolo de unicidad; identidad revisa
   afiliación; PO resuelve las decisiones de producto indicadas al final.
3. Permanecen Nest 11, Prisma 7/PostgreSQL local, TypeScript strict y una app Expo SDK 54.
   Datos exclusivamente DEMO. No reservas en React, microservicios, pagos reales o QR USC.

Fuentes: ERS [RF-006](../requirements/ERS_CATALOG.md#rf-006), RF-005/007/012/015/021/025;
UML pestañas 05 (aceptación), 11 (estados), 16 (grupo/inventario), 31 (último cupo) y
35 (firmas de aplicación). Extensión `RQ-GRUPO-01` es UML, no un RF adicional inventado.
La política de género/moto y la penalización de RF-007 siguen bloqueadas; no activarlas.

## Invariantes y decisiones propuestas

- `quantity = memberIds.length`, entero 1..4 y no mayor que los asientos del vehículo.
  UUIDs distintos, todos usuarios existentes con afiliación DEMO ACTIVA y vigente.
- El conductor nunca aparece en `memberIds`. El solicitante se deriva de sesión;
  no aceptar requesterId/driverId/status/occupiedSeats/verified en el DTO.
- Propuesta para aprobación PO: solicitante incluido exactamente una vez entre los N.
  Reservar para terceros sin viajar queda fuera del primer corte; no sumar al actor otra vez.
- Una solicitud PENDING no ocupa asientos. Puede coexistir con otras solicitudes por
  las mismas plazas físicas; la aceptación revalida disponibilidad y N identidades.
- Un viajero no participa en dos solicitudes activas del mismo viaje, incluso si lo
  incorpora otro solicitante. Se propone impedir duplicidad desde PENDING mediante una
  clave única de pertenencia; esto no es un bloqueo de asiento. PO confirma esta política.
- Sólo el conductor propietario decide. ADMIN no recibe esa facultad automáticamente.
- El viaje debe estar PROGRAMADO, no haber salido y tener destino USC activo. Revalidar
  vehículo/licencia/SOAT aptos y afiliación del conductor y los N viajeros al aceptar.
- Estados principales del viaje: PROGRAMADO/EN_CURSO/COMPLETADO/CANCELADO; la ocupación
  DISPONIBLE/LLENO sigue derivada. Aceptar/rechazar una solicitud no inicia ni termina el viaje.
- Todo cambio de reserva, ocupación, pertenencia y evento se confirma o revierte junto.
  `0 <= occupiedSeats <= offeredSeats <= vehicle.passengerCapacity` siempre.

## Modelo propuesto y responsabilidades

Los nombres ingleses siguen Prisma/contratos existentes; crosswalk debe mapearlos a
SolicitudCupo, Reserva, ParticipanteReserva e InventarioCupos del UML antes de implementar.

| Entidad              | Campos y restricciones propuestos                                                                                     | Responsabilidad                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| ReservationRequest   | UUID, tripId, requesterId, quantity, status PENDING/ACCEPTED/REJECTED/CANCELLED, createdAt, decisionAt, rejectionCode | Solicitud/grupo; cantidad y miembros no se editan después de enviar         |
| RequestMember        | PK(requestId,userId), FKs de usuario/solicitud                                                                        | N personas concretas; no representa N veces al solicitante                  |
| Reservation          | UUID, requestId UNIQUE, tripId, requesterId, quantity, status CONFIRMED/CANCELLED, confirmedAt, cancelledAt           | Confirmación creada sólo al aceptar; historial propio                       |
| ReservationMember    | PK(reservationId,userId), FKs y snapshot mínimo de confirmación                                                       | Participantes históricos sin duplicación por reserva                        |
| TripParticipantClaim | PK(tripId,userId), requestId, reservationId nullable, state PENDING/CONFIRMED                                         | Unicidad de persona/viaje entre solicitudes activas; PENDING no ocupa plaza |
| ReservationOperation | UUID, actorId, clientOperationId, operation, payloadHash, outcomeCode, result IDs; UNIQUE(actorId,clientOperationId)  | Reintentos e idempotencia, sin almacenar token de sesión                    |
| ReservationEvent     | UUID, requestId/reservationId, actorId, tipo, createdAt, outcomeCode                                                  | Auditoría de decisiones/cancelaciones y entrega posterior                   |

Agregar relaciones a User/Trip mediante migración ADITIVA y FKs/índices para listados
por actor/trip/estado. No editar las cuatro migraciones de Fase 2 ni resetear bases.
`Trip.occupiedSeats` es caché transaccional del número de claims CONFIRMED, nunca de PENDING;
`Trip.version` aumenta sólo al cambiar ocupación. Sigue interno salvo nuevo contrato aprobado.
El índice PK(tripId,userId) evita depender de un índice parcial no representado en Prisma.
Al rechazar/cancelar se eliminan sólo claims activos de esa solicitud; RequestMember y
ReservationMember conservan el historial. No borrar solicitudes, eventos ni datos financieros.
No guardar un segundo contador de plazas libres que pueda divergir.

## Unidad transaccional y orden de locks

Elegir **row lock PostgreSQL sobre Trip** para serializar aceptaciones/cancelaciones
por viaje. Prisma no expone ese lock con findUnique: usar SELECT FOR UPDATE parametrizado
en infraestructura, siguiendo el patrón existente. No concatenar IDs ni confiar en
una lectura de cupos previa al lock. READ COMMITTED con ese lock serializa las decisiones;
la PK de claims protege además las identidades. No usar una resta en React ni un semáforo JS.

Orden común de adquisición, documentado para todos los futuros escritores:

1. Resolver requestId/tripId sin mutar; no confiar en campos de actor del body.
2. Bloquear filas User de actor, conductor y miembros requeridos, ordenadas por UUID.
   Evitar nuevos usuarios bloqueados posteriormente fuera del orden. Esto coordina con
   las mutaciones documentales de Fase 2, que ya bloquean User.
3. Bloquear Trip y volver a cargar solicitud, estado, versión y ocupación.
4. Leer membresías vigentes y documentos después de los locks. Cualquier futura baja
   institucional o cambio documental de la aplicación debe bloquear su User también.
5. Operaciones adicionales del mismo agregado respetan el mismo orden. No bloquear Trip
   y luego intentar User, porque invertiría el orden de publicación y causaría deadlocks.

Los escritores SQL externos a la aplicación no están cubiertos por esta convención;
el usuario de ejecución y permisos de BD deben restringirlos. Evaluar constraints y
pruebas de carrera; no afirmar que un guard previo elimina la carrera de una baja.

### Crear solicitud

En una transacción: validar viaje/actor/N/afiliaciones y N <= plazas libres actuales bajo
el lock (sin descontarlas), registrar operación idempotente,
crear Request+N RequestMember+N claims PENDING y evento. Confirmar todo junto. No incrementar
occupiedSeats. Una violación de PK por viajero ya reclamado produce409 PARTICIPANT_ALREADY_REQUESTED,
con rollback completo. Dos grupos de personas distintas pueden quedar pendientes por las
mismas plazas; no se prometen cupos hasta la decisión del conductor.

### Aceptar solicitud

Dentro de los locks: comprobar propietario, operación previa, PENDING, PROGRAMADO,
hora, destino, aptitud documental y las N afiliaciones. Comprobar identidad exacta de
los claims de esa solicitud y cantidad. Calcular libres de la ocupación actual bloqueada.
Si libres >= N: crear Reservation CONFIRMED y N ReservationMember; convertir exactamente
N claims a CONFIRMED, asociarlos; aumentar occupiedSeats en N y version en1; marcar solicitud
ACCEPTED; guardar evento/resultado idempotente; COMMIT. Comprobar los counts de cada operación.
Si cualquier escritura falla, ROLLBACK y no publicar eventos externos.

Si dos aceptaciones simultáneas disputan el último conjunto de plazas, la primera que
obtiene el lock puede confirmar; la segunda ve la ocupación confirmada y devuelve409
CAPACITY_EXHAUSTED. No predecir el ganador por orden de mensajes o de Promise.all.
Propuesta: registrar la perdedora REJECTED con ese motivo y liberar sus claims PENDING,
sin descontar asientos. Devolver un resultado de dominio desde la transacción; traducirlo
a409 **después del COMMIT** para no revertir accidentalmente el rechazo registrado.
Afiliación inválida o viaje no reservable producen un rechazo de negocio auditado equivalente.
Una petición no autorizada o DTO inválido no decide ni altera la solicitud.

### Rechazar y cancelar

- Rechazo del conductor: sólo PENDING→REJECTED, retirar claims PENDING, evento, cero cambio
  de ocupación. Repetición idéntica devuelve el resultado anterior; ACCEPTED no se rechaza
  como si estuviera pendiente.
- Cancelación PENDING por solicitante: PENDING→CANCELLED, retirar claims, cero cupos liberados.
- Propuesta PO para primera cancelación CONFIRMED: solicitante cancela el grupo completo
  antes de la salida con viaje PROGRAMADO, sin cargo económico. No cancelación parcial
  ni delegación de cancelación a acompañantes hasta criterio explícito.
- CONFIRMED→CANCELLED mediante condición de estado dentro del lock; contar y retirar N
  claims CONFIRMED de esa reserva; decrementar exactamente N occupiedSeats y subir version.
  Un segundo intento no vuelve a decrementar; si falta un claim, abortar por invariante.
- EN_CURSO/COMPLETADO/CANCELADO: no nuevas reservas/aceptaciones. Cancelación de confirmadas
  se deniega según el criterio acordado; emergencias y cancelación del viaje pertenecen a
  su caso de uso futuro, sin penalidad automática.
- Lleno se recalcula tras la liberación; no alterar PROGRAMADO por liberar una reserva.

## Idempotencia, consistencia y errores

`clientOperationId` UUID por acción generado una vez en UI y conservado durante los reintentos.
No generar una clave nueva cuando sólo se reenvía el mismo intento. UNIQUE(actorId,key)
y hash de payload normalizado (memberIds ordenados, N, tripId, decisión/recurso) vinculan
cada resultado a la misma operación. La misma clave con payload distinto devuelve409
IDEMPOTENCY_CONFLICT; misma clave y payload devuelve resultado persistido sin consumir/liberar
nuevamente. Operaciones concurrentes iguales se serializan; si la inserción UNIQUE pierde,
resolver la operación ya confirmada desde una transacción nueva, sin reutilizar una abortada.

Revalidar sesión, afiliación y autorización del recurso antes de devolver un replay.
La idempotencia conserva efectos e identificadores, no promete una ocupación histórica
como si siguiera vigente: devolver resultado de operación con su fecha y estado actual
del recurso autorizado; refrescar disponibilidad. Una aceptación reintentada después de
cancelar conserva su resultado histórico y no resucita la reserva. Documentar `replayed`
y `observedAt` en el contrato de respuesta, sin sobreescribir el evento original.

No convertir un timeout de BD en «sin cupo» ni afirmar éxito si el resultado es desconocido.
Reintentos acotados sólo para códigos transitorios conocidos; consultar operación por actor/clave
tras un timeout incierto. Reintentar toda la transacción, nunca sólo la resta. Identificadores de
viajero se resuelven en servidor; no confiar en verifiedUSC del cliente.

## Contratos HTTP propuestos (todavía inexistentes)

ValidationPipe whitelist/forbidNonWhitelisted y SessionGuard vigentes. UUID homogéneo,
fechas UTC, dinero ausente. No exponer PII real ni documentos/credenciales en listados.

| Ruta                                            | DTO/resultado exacto del primer corte                                                                                         | Autoridad                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| GET /api/v1/trips/available                     | query seats:int1..4, after/before:ISO opcionales, limit:int1..50(default20), cursor opaco; lista paginada BookableTripSummary | Miembro activo; sólo PROGRAMADO futuros, USC y aptos; no matching geométrico |
| POST /api/v1/trips/:tripId/reservation-requests | {quantity:int1..4,memberIds:UUID[N] únicos,clientOperationId:UUID};201 RequestView                                            | Solicitante de sesión; comprueba N vínculos reales                           |
| GET /api/v1/reservation-requests/my             | query limit/cursor; solicitudes propias o donde actor es viajero                                                              | Filtrado por relación del actor, no por userId arbitrario                    |
| GET /api/v1/trips/:tripId/reservation-requests  | query status PENDING/ACCEPTED/REJECTED/CANCELLED opcional,limit/cursor                                                        | Conductor propietario; sin permiso ADMIN implícito                           |
| POST /api/v1/reservation-requests/:id/decision  | {decision:ACCEPT/REJECT,clientOperationId:UUID};200 DecisionView o error de negocio tipado                                    | Conductor derivado de sesión y propietario del viaje                         |
| GET /api/v1/reservations/my                     | query limit/cursor; reservas del solicitante o del viajero                                                                    | No listado general de otros usuarios                                         |
| POST /api/v1/reservation-requests/:id/cancel    | {clientOperationId:UUID};200 RequestView                                                                                      | Solicitante, PENDING; repetición idempotente                                 |
| POST /api/v1/reservations/:id/cancel            | {clientOperationId:UUID};200 ReservationView                                                                                  | Solicitante; regla de cancelación confirmada por PO                          |

BookableTripSummary: id, salida, origen/recogidas DEMO, destino USC, tipo de vehículo y
plazas disponibles; omitir placa/documentos y miembros de otras solicitudes. No inferir
reserva desde búsqueda. RequestView incluye id/tripId/quantity/status/miembros mínimos/
createdAt/resultado. ReservationView añade confirmedAt/cancelledAt y ocupación actual.
DecisionView incluye operación {id,outcome,replayed,decidedAt}, request, reservation nullable y {offeredSeats,occupiedSeats,availableSeats,
occupancy,observedAt}; éstos siempre vienen del servidor, no del DTO. Definir schemas y OpenAPI con
todos los campos antes de implementar consumidores. El error público conserva statusCode/message y añade code tipado (y operationId opcional),
sin filtrar miembros. Ampliar ApiError del cliente con code opcional preservando consumidores
actuales; coordinar el filtro común sin convertir errores existentes en otro contrato.
Adjuntar manifest de errores a contratos:

- 400 INVALID_GROUP, INVALID_MEMBER_IDS, INVALID_DTO.
- 401 SESSION_REQUIRED;403 AFFILIATION_INACTIVE o NOT_TRIP_DRIVER/NOT_REQUEST_OWNER.
- 404 REQUEST_NOT_FOUND/TRIP_NOT_FOUND sin filtrar datos de terceros.
- 409 CAPACITY_EXHAUSTED, TRIP_NOT_BOOKABLE, MEMBER_INACTIVE, PARTICIPANT_ALREADY_REQUESTED,
  PARTICIPANT_ALREADY_CONFIRMED, IDEMPOTENCY_CONFLICT, INVALID_RESERVATION_STATE.
- 503 PERSISTENCE_UNAVAILABLE para indisponibilidad conocida;500 INVARIANT_VIOLATION con
  detalle sólo interno y log mínimo sin tokens/identidades completas. Nunca200 falso.

### Respuestas compartidas propuestas

Definir en packages/contracts los siguientes campos obligatorios antes de implementar;
fechas ISO UTC y UUID como strings. DTOs de escritura son los de la tabla; no campos extra.

- RequestView: {id, tripId, requesterId, quantity, memberIds: string[], status,
  createdAt, decisionAt: string|null, rejectionCode: string|null}.
- ReservationView: {id, requestId, tripId, requesterId, quantity, memberIds: string[],
  status: CONFIRMED|CANCELLED, confirmedAt, cancelledAt: string|null}.
- TripOccupancyView: {tripId, offeredSeats, occupiedSeats, availableSeats,
  occupancy: DISPONIBLE|LLENO, status: TripStatus, observedAt}.
- DecisionView: {request: RequestView, reservation: ReservationView|null,
  occupancy: TripOccupancyView}.
- MutationEnvelope<T>: {operationId, replayed: boolean, operationOutcome: string,
  operationAt, data: T}; devoluciones exitosas envueltas, sin cambiar contratos de Fase 2.
- BookableTripSummary: {id, driverDemoName, vehicleType, origin: LocationPoint,
  destination: CampusDestinationSummary, departureAt, expectedEndAt, stops: TripStopSummary[],
  occupancy: TripOccupancyView, ruleCodes: string[], providesHelmet: boolean|null}.
- Page<T>: {items: T[], nextCursor: string|null}; listas filtradas por actor.
- ReservationApiError: {statusCode, code: ReservationErrorCode, message,
  operationId: string|null}; detalles de DB y miembros ajenos nunca se devuelven.

Los aliases de ubicación/destino/parada reutilizan las estructuras públicas ya existentes
tras cotejar sus nombres reales; no serializar Prisma. `operationAt` es histórico;
`observedAt` y data reflejan la lectura actual autorizada. Errores409 de decisión auditada
incluyen operationId; una operación no autorizada no persiste ni filtra recurso alguno.

## UI compartida y comunicación

Una app Expo existente: pasajero ve viajes disponibles, selecciona N identidades sintéticas
conocidas (catálogo DEMO protegido, mínimo necesario) y envía una lista explícita de N,
no un contador de acompañantes anónimos. Mostrar PENDING y «sin plazas confirmadas».
Conductor ve solicitudes de sus viajes y acepta/rechaza; al409 refresca disponibilidad
real y presenta motivo. Solicitante/miembros ven confirmación/cancelación según permisos.
UI no actualiza definitivamente occupiedSeats de forma optimista ni fabrica aprobación.

Antes de agregar catálogo de identidades, acordar privacidad y acceso: endpoint DEMO sólo
con identificadores/nombres sintéticos, no directorio institucional real. Puede partir de
los usuarios de seed por opción explícita, con validación real de cada UUID en servidor.
No mezclar QR institucional, QR abordaje o mapas nuevos con la integridad de reservas.
TanStack Query reconsulta estado; errores/loading/vacío y reintento con misma clave.
Socket.IO es una tarea opcional posterior: handshake y autorización por evento/sala,
evento emitido sólo tras commit, outbox si se requiere entrega recuperable. Ningún gateway
acepta una orden del cliente para descontar cupos o notificar aceptación arbitraria.

## Entregables por archivos, responsables y pasos pequeños

Cada paso sigue prueba RED→implementación mínima→GREEN→documentación/handoff en la
misma tarea; commits sólo cuando se autoricen. Personas POR_ASIGNAR, no tareas ejecutadas.

| Orden | Archivos propuestos                                                                                                       | Responsable de módulo / revisor          | Criterio observable                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1     | packages/contracts/src/reservations.ts; API.md; UML_CROSSWALK; casos test de contrato                                     | Reservas + frontend / Identidad          | DTOs/estados/errores/actor e idempotencia acordados antes de code                            |
| 2     | backend/prisma/schema.prisma y nueva migrations/<timestamp>_group_reservations/migration.sql; seed.ts                     | Datos / Reservas                         | FKs/UNIQUE/índices, migración nueva en test sin reset y seed idempotente                     |
| 3     | modules/reservations/domain/models/{request,reservation}.ts; domain/policies/{group,capacity,cancellation}.policy.ts      | Reservas / Viajes                        | Nidentidades, transiciones, ocupación y cancelación puras, sin Nest/Prisma                   |
| 4     | modules/reservations/infrastructure/repositories/reservations.repository.ts; application/ports                            | Datos+Reservas / Identidad               | Unidad de trabajo, locks ordenados, clave única, retorno postcommit y rollback               |
| 5     | application/reservations.service.ts; controllers/reservations.controller.ts; dto/*; reservations.module.ts; app.module.ts | Reservas / Viajes                        | Actor de sesión, permisos por recurso, invariantes server y OpenAPI                          |
| 6     | modules/trips consulta disponible y DTO público; eventual catálogo de identidades DEMO                                    | Viajes+Identidad / Privacidad y frontend | Lista no reserva, sólo USC/activos/aptos y datos mínimos; dependencia coordinada             |
| 7     | frontend/src/features/reservations/* y rutas en grupos passenger/driver existentes                                        | Frontend / Reservas+QA                   | N miembros explícitos, pendientes/confirmadas, aceptar/rechazar/cancelar sin autoridad local |
| 8     | api/test/reservations.policy.test.mjs; reservations.e2e.test.mjs; tests/web/reservations.spec.ts                          | QA / Datos+Reservas                      | Concurrencia PostgreSQL y flujo doscontextos con API real                                    |
| 9     | docs/demo/EVIDENCE, TRACEABILITY, API, CURRENT_STATUS por integrador, PROGRESS y nuevo handoff                            | Integración / Revisores de cada frente   | Estado local/PR/feature/dev distinto; dispositivo explícito                                  |

## Pruebas requeridas antes de aprobar implementación

1. PENDING N=2 crea2miembros/claims, occupiedSeats no cambia; rechazo/cancelación pendiente
   no libera asientos nunca asignados. Cero, negativo, decimal, N distinto a lista o UUID repetido400.
2. Acompañante desconocido/inactivo/vencido y conductor en grupo rechazados sin filas parciales.
   Baja de un miembro después de solicitar pero antes de aceptar impide confirmar.
3. Dos grupos distintos pendientes compiten por las últimas2plazas: barrera de inicio y
   dos conexiones/transacciones reales contra PostgreSQL; exactamente una reserva CONFIRMED,
   otra409CAPACITY_EXHAUSTED, ocupación final2 y nunca4. No mocks de locks ni sleep como prueba.
4. La misma persona a través de dos solicitudes/grupos no adquiere dos pertenencias; la PK
   resuelve también carrera concurrente de creación, no sólo una consulta previa.
5. Reintento crear/aceptar/cancelar con misma clave/payload devuelve mismo resultado; clave
   con payload diferente409; dos reintentos simultáneos no duplican eventos, reservas ni cupos.
6. Forzar una falla de escritura de evento/miembro en DB_test (trigger temporal de test,
   revertido en finally) y comprobar rollback completo por SQL/Prisma, sin inyección en código
   productivo ni endpoint de fallo. No saltar validación para construir el caso.
7. Cancelar confirmada permitida libera exactamenteN una vez, vuelve DISPONIBLE sin cambiar
   PROGRAMADO; dos cancelaciones simultáneas no generan cupos extra. Grupo ajeno403.
8. Viajes EN_CURSO/COMPLETADO/CANCELADO y viaje propio no admiten solicitudes/confirmaciones;
   conductor distinto no decide. Documento vencido/pendiente antes de aceptar bloquea.
9. Listados no revelan solicitudes/miembros de otros; payload verificado/actor/status/cupos
   inyectados400. Sesión expirada/revocada401; guard se repite al mutar, no sólo al entrarUI.
10. E2E web: conductor publica; pasajero solicita2 con miembros activos; driver ve PENDING,
    acepta y ambos ven plazas reales; cancelación permitida vuelve a liberar. Prueba física
    Expo Go separada: web o export no acreditan SecureStore/dispositivo.

Trazabilidad observable: RF-006 solicitud/decisión/integridad; RQ-GRUPO-01 Nidentidades y
último cupo; RF-015 sólo ocupación sin romper ciclo; RF-012 listados parciales; RNF-039
rate limit y RNF-040 minimización. RF-005 sigue parcial sin matching geográfico; RNF-032
no se declara cumplido por añadir WS sin medir latencia. RF-007/021/025 no se activan.

## Decisiones pendientes PO y límites

Confirmar solicitante viajero, exclusión de duplicados desdePENDING, grupo completo vs
cancelación parcial, antelación de cancelación y ausencia de cargos en demo. La ambigüedad

> 30/<30 de penalidad no bloquea diseñar devolución atómica, pero sí automatizar cobros.
> Motos/género/exclusividad, fuerza mayor, fórmula de aportes y política de retención siguen
> abiertas. Reservas no habilitan pagos reales ni acceso institucional. Fuera del primer
> corte: matching de ruta, QR, abordaje parcial, tracking, inicio/final de viaje y sanciones.

Primer comando futuro, únicamente después de integración/autorización y árbol limpio:
`git status --short --branch`. Después el integrador confirma SHA de feature; no crear
rama ni implementar este plan durante la auditoría actual.

Nota de rutas 2026-11-14: los dos paths de workspaces del plan se actualizan a
backend/frontend. Ninguna decisión de reserva, estado RF/RNF o precondición de integración
cambia; Fase 3 permanece sin implementación.

## Corte sucesor del 24 de noviembre

Este archivo conserva la propuesta original. La base `feature` ya incluye Fase 2 y los itinerarios de la tarea sucesora sustituyen el criterio de destino exclusivo. La implementación local usa una `Reservation` que pasa de solicitud a confirmación, conserva miembros y dos FKs de paradas y usa el lock de viaje tras el lock de conductor. La ocupación es por viaje completo. La tabla de operaciones idempotentes y las tablas separadas de claims/eventos del plan permanecen como opciones de evolución. Repetir aceptar/rechazar o retirar es idempotente mientras el estado coincide; crear una solicitud duplicada devuelve 409. Reglas que requieren ratificación en [OPEN_DECISIONS](../decisions/OPEN_DECISIONS.md). Contratos entregados en [API](API.md).
