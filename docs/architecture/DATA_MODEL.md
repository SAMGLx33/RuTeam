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
