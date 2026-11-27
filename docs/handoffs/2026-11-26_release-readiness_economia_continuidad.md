# Relevo · RF-026 · historial económico

- Fecha 26/11/2026, America/Bogota
- Rama `task/release-readiness` sobre `f7013ea`
- Área Expenses
- Estado local para revisión

## Implementación

El pasajero consulta sus participaciones y compensaciones. El conductor consulta sólo sus gastos privados y los agregados de sus viajes. Totales en COP y filtros por rol, mes de salida, estado y viaje. Se reutilizan las condiciones congeladas y las acciones posviaje.

## Integración y evidencia

Expenses y Mobility. `GET /economics/history` y vínculos desde Perfil, participaciones, mis viajes, detalle, avisos y calificaciones. La prueba HTTP verifica importes, discrepancia, filtros y privacidad.

Para reproducir usa los [comandos y criterios del plan](../development/TEST_PLAN.md#pruebas-de-continuidad-del-producto). El estado de integración se mantiene en [preparación de entrega](../reviews/RELEASE_READINESS.md).
