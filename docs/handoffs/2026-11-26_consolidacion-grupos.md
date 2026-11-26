# Grupos con consentimiento y confirmación atómica

26/11/2026, America/Bogota. Codex. Personas POR_ASIGNAR de Participaciones y QA.
`task/driver-defined-routes`, base `5af65f2`. Cambio local sin promoción.

`GroupsModule` usa el bloqueo conductor → viaje de Participaciones, revalida
condiciones, identidad y plaza y registra una participación individual por
miembro en la misma transacción. El código de 32 bytes caduca en hasta dos horas,
se guarda como hash y puede rotarse sin perder consentimientos. Cada integrante
ve el tramo y expresa consentimiento. El organizador confirma o revoca. Los
grupos abiertos conservan cero plazas. El retiro tras confirmar usa la operación
individual. El aviso persistente y el chat utilizan la participación confirmada.

Archivos. Carpeta `groups` del backend, contrato `groups.ts`, migración
`20261126013000_trip_groups`, pantalla `/groups` y formulario desde el detalle.
`groups.e2e.test.mjs` cubre cinco escenarios PostgreSQL en `ruteam_groups_test`,
incluida carrera por las últimas plazas, e integración de chat. Dos recorridos
Playwright en el árbol aislado verificaron consentimiento y reservas visibles.
Consultar [revisión](../reviews/PRODUCT_CONSOLIDATION.md) para la regresión
integral. Política de cancelación colectiva permanece abierta.
