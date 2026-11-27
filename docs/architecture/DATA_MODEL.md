# Modelo de datos y transición

Diseño del 25/11/2026. Mantener UUID, timestamps UTC, FKs, índices y constraints existentes
compatibles. El esquema/migraciones efectivos y los resultados de migración se publican
por el integrador en API/PROGRESS; esta especificación no declara que ya se aplicaron.

| Agregado / datos existentes                      | Evolución y conservación requerida                                                                                                                                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User/Profile/InstitutionalMembership/AuthSession | Identidad única estudiantil. Capacidades derivadas, no autoconcedidas. Distinguir verificación de correo de estamento/vigencia; sesiones hasheadas/expirables/revocables. Usuarios antiguos no estudiantiles pierden acceso operativo sin reclasificación automática            |
| Roles/revisores/documentos históricos            | Retirar ADMIN del modelo activo/permisos/seed/API; conservar sólo relaciones de auditoría necesarias. No borrar revisores/documentos a ciegas ni convertirlos en cuentas estudiantiles                                                                                          |
| Vehicle/VehicleDocument/DriverEligibility        | Titularidad/capacidad/tipo/vigencia/estado. Diferenciar declarado, aportado, formato validado y fuente autorizada. Revisión ADMIN previa no es verificación externa ni requisito operativo vigente                                                                              |
| CampusDestination/TripStop                       | Identidad institucional y metadatos de campus/espacios. Encuentro textual sin coordenada propia válido; distinguir referencia general aproximada y punto exacto. Snapshot de paradas autorizadas/paso en orden; FK y coordenadas opcionales coherentes, sin valores arbitrarios |
| Trip                                             | Modalidad DESDE_USC/HACIA_USC y un extremo institucional, condiciones elegidas por conductor, geometría/descripcion y capacidad de pasajeros. Mantener geometría e IDs históricos; no convertir automáticamente externos→externos en viajes válidos                             |
| Reservation/ReservationMember                    | Semántica de confirmación directa. Estados históricos pendientes no se elevan a confirmados. Duplicidad/ocupación/idempotencia bajo transacción; FKs compuestas preservan pertenencia de paradas. Retiro/cancelación conserva filas e historia                                  |
| Grupo/invitación                                 | Sólo habilitar lote con estudiantes/consentimientos comprobables; código temporal no es UUID público. No retener plazas por invitaciones pendientes. No crear tablas sin caso de uso y contrato acordados                                                                       |
| Propuesta de recogida                            | Entidad separada de participación: viaje HACIA_USC, proponente, punto compatible, estado/decisión propietario, timestamps. Aceptación no modifica geometría ni ocupación. Duplicados/terminales controlados                                                                     |
| Abordaje/eventos y módulos complementarios       | Vínculos a participación/estado autorizados. QR interno específico si se implementa; costos exactos sin Float inapropiado, mensajes/calificaciones/seguridad con privacidad e historial                                                                                         |

## Invariantes transaccionales

Capacidad por viaje completo, pasajeros sin conductor: auto≤4/moto≤1. Ocupación derivada
o materializada coherente con participaciones que consumen plaza. Lock conductor→viaje
para confirmar y operaciones concurrentes compatibles. Validar recursos, estado, reloj,
afiliación y documentos bajo lock; no check seguido de inserción independiente.
Reintento no duplica filas/ocupación; cancelación válida libera una sola vez.

## Migraciones

Siempre nuevas migraciones; no editar aplicadas ni resets/drops. Diseñar prueba desde
usuarios/revisores/vehículos/viajes/paradas/geometrías/reservas pendientes y confirmadas
anteriores. Mantener IDs, FKs e historial; no promover pendientes, certificar documentos
ni convertir docentes/trabajadores/admin en estudiantes. Listados históricos distinguen
formatos legados sin abrir un bypass de nuevas reglas.

SQL/schema/seed/contratos se revisan con un único integrador de Datos. Aplicar primero
a la base_test independiente autorizada y reportar resultados reales. No tocar otras
bases. Ver [TEST_PLAN](../development/TEST_PLAN.md), [ADR0003](ADRs/0003-student-participation-redefinition.md)
y [modelo anterior](../history/2026-11-24-guides.md).

## Entidades de la consolidación

- `TripRating` registra viaje, emisor, receptor, capacidad histórica, valor entero,
  comentario privado y fecha. El índice por receptor/capacidad soporta los promedios.
- `TripGroup` fija viaje, tramo, organizador, tamaño, hash y vencimiento del código.
  `TripGroupMember` registra consentimiento, posible retiro y vínculo único a una
  participación individual al confirmar el grupo.
- `ReservationBoardingPass` guarda un hash vigente por participación y punto de
  recogida, con vencimiento y consumo.
- `TripDriverPosition` conserva una muestra por viaje, con tiempos de obtención
  y publicación. Caduca, se puede retirar y se borra al cerrar.
- `TripExpenseEstimate` conserva combustible, peajes y estacionamiento en COP enteros
  como estimación privada. La suma se calcula con los tres importes guardados.
- `TripNotification` guarda disponibilidad de evaluación y confirmación de grupo
  junto a avisos de coincidencia y chat.

## Migración de cierre

`20261126130000_release_economics_safety_events` añade condiciones públicas a
`Trip`, separadas de `TripExpenseEstimate`. Viajes históricos conservan importe
nulo. `TripCompensation` tiene la reserva como PK y un estado con fecha de
resolución. `EmergencyContact` tiene propietario único por fila.
`TripIncident` relaciona un viaje y su autor. `eventKey` amplía la restricción
de avisos. `20261126131000_trip_notification_lifecycle` actualiza el CHECK de tipos
conservando los avisos existentes. `20261126132000_pickup_proposal_expiration`
actualiza la restricción de propuestas. Las propuestas pendientes pasan a `EXPIRED` al cerrar la operación.
La última marca de GPS activa distingue caducidad incluso después de purgar
coordenadas y se borra al terminar o retirar la muestra.

## Migraciones de continuidad del 26/11/2026

| Migración                                        | Datos                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261126140000_recurring_trips`                 | `RecurringTrip` guarda calendario, próxima revisión y las instantáneas de la plantilla y ruta. `RecurringOccurrence` tiene clave única por plantilla y fecha de Colombia y referencia única a `Trip`. Registra también el fallo de una fecha pendiente. `TripNotification` admite avisos sin viaje con una restricción de deduplicación. |
| `20261126141000_account_lifecycle`               | `User.selfDeactivatedAt` distingue cierre voluntario. `User.observedEligibility` registra la última elegibilidad comunicable. `AccountDeletionRequest` mantiene fecha de solicitud y retiro, con una abierta como máximo por cuenta.                                                                                                     |
| `20261126142000_safe_trip_closure_and_incidents` | `Trip.status=INTERRUMPIDO`, causa en `Trip.terminationReason` sin mezclarla con `Reservation.withdrawalReason`, restricciones para estados coherentes e índice de incidencias por autor y fecha. Amplía categorías sin alterar registros existentes.                                                                                     |

Las estadísticas y la economía son proyecciones de lectura sobre las relaciones ya existentes. Las estadísticas usan finalización en Colombia y abordaje real. Sólo se atribuye la distancia total a un pasajero cuando su tramo coincide con el trayecto publicado. El historial económico filtra por mes de salida. Una desactivación revoca sesiones y enlaces y conserva el historial. El inventario para una política futura está en [Decisiones abiertas](../decisions/OPEN_DECISIONS.md#dependencias-para-la-siguiente-entrega).

## Migraciones de evolución

- `20261126210000_trip_environment` agrega datos opcionales de energía en Vehicle, huella de entradas congeladas y resultado final en Trip y alternativa propia en Reservation. Las versiones, consumos, unidades, distancias y ocupación admiten reproducir el cálculo.
- `20261126211000_realtime_signals` agrega disparadores asíncronos de PostgreSQL para mutaciones de viaje, paradas, plazas, chat, ubicación, bandeja y sesiones.
- `20261126212000_notification_preferences` agrega preferencias privadas, PushDevice y PushDelivery. La relación sesión-dispositivo permite revocar envíos. La clave de aviso y dispositivo deduplica la cola internamente.

Agenda y actividades se calculan desde tablas actuales. Los recorridos previos conservan sus estados y la ausencia de factores históricos.
