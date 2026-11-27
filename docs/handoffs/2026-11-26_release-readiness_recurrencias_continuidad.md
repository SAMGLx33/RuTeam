# Relevo · RF-023 · recurrencias

- Fecha 26/11/2026, America/Bogota
- Rama `task/release-readiness` sobre `f7013ea`
- Área Trips
- Estado local para revisión

## Implementación

El trabajador detecta calendarios elegibles cada 15 segundos y conserva los errores por fecha. La publicación, su ocurrencia y los avisos se confirman juntos. La clave única y el bloqueo de publicación protegen contra procesos concurrentes. La plantilla usa fechas de Colombia, 1–7 para días de semana y un horizonte configurable. Cambiar plantilla conserva viajes emitidos. El conductor distingue cancelar generación, una fecha individual o también futuras fechas programadas sin abordaje.

## Integración y evidencia

Trips y Mobility. `/trip-schedules` y duplicación en Mis viajes. Migración `20261126140000_recurring_trips`. Prueba HTTP de concurrencia, reglas de calendario, recuperación, elegibilidad y jobs de matching.

Para reproducir usa los [comandos y criterios del plan](../development/TEST_PLAN.md#pruebas-de-continuidad-del-producto). El estado de integración se mantiene en [preparación de entrega](../reviews/RELEASE_READINESS.md).
