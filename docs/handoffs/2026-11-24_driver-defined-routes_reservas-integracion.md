# Handoff — reservas, ciclo e integración

Rama `task/driver-defined-routes`. El módulo `reservations`, `packages/contracts/src/routes.ts` y la migración `20261124204500_route_reservations` mantienen solicitud y confirmación en una entidad con participantes e IDs de parada del mismo viaje. `/my-reservations` consulta la participación. `/my-trips` permite al conductor aceptar, rechazar, cancelar e iniciar/finalizar el viaje. Reserva y transición toman locks conductor → viaje. Aceptación concurrente deja una sola confirmación para la última plaza. Cancelación del viaje conserva historial y libera ocupación.

Se ejecutaron suites Jest/PostgreSQL, regresión Playwright, smoke, builds y revisión de esquema. Evidencia completa, estados, decisiones y errores transitorios en el [informe](../reviews/DRIVER_DEFINED_ROUTES_DELIVERY.md). RF-006 y RF-015 parciales respecto a eventos, GPS y QR. El PO conserva la decisión de cancelación de confirmadas por el pasajero, consentimiento de grupo y edición del itinerario. No se añadieron cargos, comunicaciones, QR ni otros módulos ajenos.

Integrador y revisores nominales POR_ASIGNAR. Revisar dentro del ciclo 27–28 de noviembre, cotejar el alcance DEMO con el PO y aplicar la secuencia task → feature → dev → main cuando corresponda. Sin stage, commit, PR, push ni merge en esta intervención.
