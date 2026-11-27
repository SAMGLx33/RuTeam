# Relevo · RF-028 y RF-030 · cierre seguro e incidencias

- Fecha 26/11/2026, America/Bogota
- Rama `task/release-readiness` sobre `f7013ea`
- Área Reservations y Safety
- Estado local para revisión

## Implementación

La interrupción exige motivo y confirmación de seguridad. Conserva abordajes e historial, cancela pendientes, revoca QR y termina GPS. Puede registrar motivos también en cancelación y retiro permitidos. Incidencias por categoría con viajes elegibles, historial propio y resumen voluntario. La aplicación presenta el estado de registro privado.

## Integración y evidencia

Reservations, Chat y Safety. `POST /trips/:id/transition`, `POST /participations/:id/cancel` y `/me/incidents`. Migración `20261126142000_safe_trip_closure_and_incidents`. HTTP cubre la transición, cupos, avisos y exportación por autor. Canal USC pendiente.

Para reproducir usa los [comandos y criterios del plan](../development/TEST_PLAN.md#pruebas-de-continuidad-del-producto). El estado de integración se mantiene en [preparación de entrega](../reviews/RELEASE_READINESS.md).
