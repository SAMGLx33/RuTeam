# Modelo implementado

UUID homogéneo; timestamptz UTC; Profile/User 1:1; InstitutionalMembership/User 1:1;
AuthSession/User N:1; VerificationAttempt/User N:1. User.role MEMBER/ADMIN; estamentos
STUDENT, TEACHER, ADMINISTRATIVE, WORKER, OTHER. driverDemoApproved es una capacidad
sintética de presentación, no autoriza publicación ni sustituye vehículo/licencia/SOAT.

CampusDestination tiene Decimal(9,6), constraints latitud/longitud y campus=USC,
catálogo activo DEMO. No hay puntos certificados oficialmente. Constraints en nueva
migración incremental; seed no actualiza ni borra registros existentes.

Tablas futuras se agregarán por casos de uso: Vehicle/VehicleDocument/DriverEligibility;
Trip/RoutePoint/TripStop/Event/Location; Reservation/Member/BoardingToken;
CostEstimate/Expense/Settlement/Share/Compensation; ChatMessage/Rating/Incident/
EmergencyContact/Notification. Dinero entero COP; sin Float; pruebas de conservación.
Referencias originales ausentes: modelo inicial provisional, pendiente crosswalk.

## Ampliación Fase 2

Vehicle(ownerId,placa única,tipo,capacidad pasajeros,marca,año,color), VehicleDocument
(SOAT_DEMO,vigencia,PENDING/APPROVED/REJECTED,revision,revisor/fecha), DriverEligibility
(categoría sintética,vigencia/revisión equivalente), TripRuleDefinition/Selection.
Trip enlaza conductor/vehículo/destinoUSC, origen y salida, duración/final DEMO, cupos,
estado/version/helmet; TripStop con UNIQUE(tripId,position); TripEvent PUBLISHED auditable.
Coordenadas Decimal; constraints capacidad/placa/año/color/intervalos; UUID y timestamptz.
No se borraron columnas/tablas previas; driverDemoApproved queda legado sin autoridad:
auth/me deriva capacidad conductor de licencia revisada y publicación revalida vehículo.
Migraciones nuevas:20261114014345_phase2_vehicle_publication y
20261114015557_phase2_document_revisions. Reservas y dinero no se añadieron.

## Itinerarios y reservas de la redefinición

El agregado conserva `Trip` y `TripStop`. `CampusDestination` incorpora tipos, instrucciones, metadatos de nivel y coordenadas opcionales por pareja. `Trip.routeGeometry` es JSONB; `routeDescription` distingue itinerarios nuevos. La FK de destino sigue válida cuando existe, y nunca se reubican históricos. Los extremos nuevos también son `TripStop` para que todos los puntos reservables tengan IDs homogéneos.

Cada `Reservation` relaciona la solicitud/confirmación con un viaje, un solicitante, un abordaje y un descenso. Las dos relaciones compuestas enlazan paradas del mismo viaje. `ReservationMember` asocia miembros concretos. El lock por viaje serializa las comprobaciones de duplicidad y ocupación. Se mantienen todas las filas al cambiar estados. Índices y comprobaciones están en las dos migraciones nuevas. Ver [ADR 0002](ADRs/0002-driver-defined-itineraries.md).
