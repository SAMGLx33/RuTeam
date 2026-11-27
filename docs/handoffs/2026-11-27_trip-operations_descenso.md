# Operación individual y cierre del viaje

27/11/2026, America/Bogota. Agente Codex. Responsable humano POR_ASIGNAR.
Rama local `task/trip-operations` en `2b69336ac7a4bc509d06e00bb58c296ffa05e633`.
Trabajo en el árbol local.

## Implementación

Reservas registra `droppedOffAt` con un evento y un aviso deduplicado dentro de
la transacción del viaje. Exige conductor titular, viaje en curso, abordaje
individual y parada de descenso coincidente con la última llegada registrada.
La marca no libera plazas. El reintento devuelve la marca persistida. El cierre
mantiene los descensos sin registrar y pide confirmación explícita si quedan
pasajeros a bordo. La persona que descendió mantiene el historial y pierde la
lectura de GPS en vivo. La atribución ambiental registra la procedencia de la
parada y sigue usando distancias de la geometría planificada. Evaluaciones y
compensaciones conservan sus condiciones de acceso por viaje completo.

Código en `reservations`, `safety`, `realtime`, proyección de `mobility`,
`packages/contracts/src/{routes,trip-operation,mobility-statistics}.ts` y
`frontend/src/features/trips`. Migración aditiva `20261127010000`. Las rutas,
respuestas y errores están en [API](../development/API.md#operación-de-viaje-y-movilidad-cotidiana).

## Verificación y relevo

`driver-routes.e2e` cubre autorización, secuencia, cupo, idempotencia,
manifiesto, historia, GPS y cierre. `ratings.spec` recorre la confirmación
explícita de cierre y las calificaciones con dos sesiones. Reproducir y
consultar el resultado en el
[handoff de integración](2026-11-27_trip-operations_integracion.md).
El responsable de Reservations y Safety debe revisar la secuencia con dos
participantes en un teléfono antes de afirmar funcionamiento físico.
