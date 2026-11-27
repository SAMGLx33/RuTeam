# Traspaso — participación directa y abordaje

Incremento local en `task/driver-defined-routes`, sin escrituras Git. Definición vigente:
`docs/requirements/PRODUCT_DEFINITION.md`, reglas RN-PARTICIPACION-01,
RN-CAPACIDAD-01, RN-GRUPO-01, RN-ABORDAJE-01 y RN-ESTADO-01.

## Comportamiento y contrato

- `POST /api/v1/trips/:tripId/participations`, cuerpo `{pickupId, dropoffId}`,
  confirma sólo al estudiante autenticado. Respuesta 201. No acepta usuarios,
  cantidades, estado ni aprobaciones. La ruta requiere itinerario compatible hacia
  o desde USC, paradas autorizadas en orden, conductor/documentos habilitados,
  estudiante vigente, viaje futuro programado y plaza disponible.
- El bloqueo conserva el orden conductor → viaje. Insertar `CONFIRMED`, crear su
  miembro y aumentar la ocupación son operaciones de la misma transacción. El
  reintento de una confirmación individual idéntica devuelve su mismo identificador,
  incluso con la última plaza ocupada. Otra selección o una participación de grupo
  ya confirmada devuelve 409. Un nuevo ingreso después de retirarse crea historial
  nuevo, sin reabrir la fila cancelada.
- `GET /api/v1/trips/:tripId/participations` es exclusivo del propietario. Devuelve
  confirmaciones y registros históricos, sin controles para aceptarlos o rechazarlos.
- `GET /api/v1/reservations/my` conserva el listado propio compatible. Las respuestas
  incluyen `boardedAt` y `canCancel`, calculado por Nest.
- `POST /api/v1/participations/:id/cancel` permite al titular retirar una confirmación
  futura programada antes de abordar. Libera sus plazas una sola vez y conserva la
  fila. Repetir el retiro de una fila cancelada es idempotente. Un pendiente histórico
  se puede retirar sin cambiar la ocupación. No hay cargos ni multas.
- `POST /api/v1/participations/:id/board` permite únicamente al conductor propietario
  registrar presencia de una participación individual confirmada. Ventana explícita:
  desde 30 minutos antes de la salida hasta el final declarado, con viaje PROGRAMADO
  o EN_CURSO. Revalida estudiante y documentos. Repetición idempotente, sin plazas
  adicionales. `boardedAt` persiste presencia; evento de viaje registra al conductor.
- `POST /api/v1/trips/:tripId/transition` conserva START, FINISH y CANCEL. Cancelar
  conserva filas y libera ocupación; iniciar cierra pendientes históricos sin promoverlos.
- Rutas antiguas `reservation-requests` y decisiones ordinarias se retiran (404).
  Los PENDING históricos se mantienen como tales hasta retiro/cierre explícito.

## Datos y limitaciones

Nueva migración aditiva `20261125000200_participation_boarding`: añade únicamente
`Reservation.boardedAt`, inicialmente NULL. Sin conversión de estados ni eliminación.
El coordinador aplica y verifica migraciones y ejecuta las suites DB en serie.

Grupos nuevos requieren consentimiento individual seguro: el flujo por UUID ajenos
se elimina de API y UI. Los estudiantes pueden confirmar individualmente, sin reservar
plazas por invitaciones. Grupos históricos se conservan; no se registra abordaje
colectivo mediante una sola confirmación del conductor.

Búsqueda usa texto de lugares (`fromText`/`toText`), catálogo institucional y filtro
`direction`; no solicita coordenadas escritas. Cada confirmación/retirada invalida
lecturas remotas, manteniendo toda autoridad de plazas en Nest. Las propuestas de
recogida son componentes independientes suministrados por el integrador.

## Evidencia del incremento

Pruebas de aplicación nuevas: RED observado 7 fallos y 2 aprobadas, por falta de
confirmación/abordaje y retiro antiguo. Después: 9/9 aprobadas sin acceder a PostgreSQL.
Build backend, typecheck frontend y ESLint focal aprobados. `git diff --check` aprobado.

Suite HTTP ampliada preparada para PostgreSQL: última plaza concurrente (201/409),
replays concurrentes del mismo actor, retiro concurrente, carrera con START/CANCEL,
ocupación equivalente a confirmaciones, vigencia documental hasta el final, grupo
legacy sin promoción, control de abordaje y eventos, aislamiento del propietario,
rechazo de campos de acompañantes y cierre de rutas de aprobación. Su ejecución y
la E2E escritorio/móvil quedan en manos del coordinador para evitar pruebas DB
simultáneas. No se atribuyen resultados DB antes de observarlos.

Integrador/revisor humano POR_ASIGNAR. No declara integración en dev ni verificación
Expo Go físico. El coordinador enlaza este traspaso y consolida API/trazabilidad/PROGRESS.
