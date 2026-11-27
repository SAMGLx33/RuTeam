# Relevo · RF-019 · estadísticas de movilidad

- Fecha 26/11/2026, America/Bogota
- Rama `task/release-readiness` sobre `f7013ea`
- Área Mobility
- Estado local para revisión

## Implementación

PostgreSQL agrega meses de Colombia por rol y usa sólo viajes completados y abordajes. Para pasajeros la distancia es nula salvo cuando el tramo compartido coincide con la ruta registrada. La vista muestra qué viajes aportan medición. El contrato ambiental prevé factores con metodología, unidades y procedencia, con estado pendiente.

## Integración y evidencia

Mobility, Trips y Reservations. `GET /mobility/statistics`, resumen en Inicio y pantalla enlazada desde Perfil. La prueba HTTP mide cambios de totales y excluye cancelados, ausentes e interrumpidos. Producto debe aprobar una metodología ambiental.

Para reproducir usa los [comandos y criterios del plan](../development/TEST_PLAN.md#pruebas-de-continuidad-del-producto). El estado de integración se mantiene en [preparación de entrega](../reviews/RELEASE_READINESS.md).
