# Abordaje QR interno y ubicación de viaje activo

26/11/2026, America/Bogota. Codex. Responsabilidades humanas de Recorrido,
Seguridad y QA POR_ASIGNAR. Rama `task/driver-defined-routes`, base `5af65f2`.

El QR contiene un token aleatorio opaco de dos minutos. PostgreSQL retiene
únicamente su hash, punto, expiración y consumo. La sesión del pasajero emite y
la del conductor canjea. Servidor revalida la política de abordaje manual bajo el
mismo bloqueo y registra un sólo abordaje sin nuevo cupo. En web se conserva el
abordaje manual; la cámara está en la variante Expo nativa.

El conductor comparte una muestra voluntaria en primer plano. El servidor
limita muestras a una cada 15 segundos, expira visibilidad a los dos minutos,
permite retiro e impide consulta fuera de un viaje activo. La base elimina la
muestra al cerrar; el resto caduca y se purga. El marcador aparece sobre una
vista esquemática separada de las paradas y las estimaciones.

Migraciones `20261126014000_boarding_qr` y
`20261126014000_trip_driver_position`, contratos `boarding.ts` y
`trip-tracking.ts`, backend Participaciones y Safety, rutas de Mis viajes,
Mis participaciones y Seguridad. Se verificaron canje y reintentos con
Supertest/PostgreSQL y ubicación web con permiso/geolocalización controlados.
La cámara y el GPS en un teléfono siguen pendientes de
[validación física](../development/MOBILE_TESTING.md). El QR sólo acredita
abordaje dentro de RuTeam. No cambia matrícula ni la ruta publicada.
