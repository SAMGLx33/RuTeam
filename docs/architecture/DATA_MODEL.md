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
