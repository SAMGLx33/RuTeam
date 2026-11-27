# Continuidad del progreso y abordaje

26/11/2026, America/Bogota. Agente Codex. Persona responsable POR_ASIGNAR. Rama
`task/driver-defined-routes`, base `5af65f2d1c11f3b6091af21605a3eab21a50e163`.

Participaciones registra inicio, llegada ordenada a la próxima parada publicada,
abordaje en el punto correspondiente, ausencia expresa y cierre. La llegada
repetida es idempotente. Un pasajero confirmado conserva la plaza durante el
recorrido; el abordaje y la ausencia no crean una segunda participación. Al perder
la vigencia institucional, el titular con sesión de cuenta válida conserva la
posibilidad de cerrar o cancelar. Iniciar exige elegibilidad, vigencia documental
y la ventana previa existente. El procedimiento para cuentas completamente
deshabilitadas queda en decisiones abiertas.

Datos y código. `20261125235900_trip_stop_progress`, dominio
`reservations/domain/trip-progress.ts`, guard de transición, servicio y repositorio
de Participaciones y vistas de Mis viajes e historial. API
`POST /trips/:tripId/stops/:stopId/reach` y
`POST /participations/:id/no-show`. La [referencia API](../development/API.md)
conserva el detalle del contrato y la [revisión](../reviews/PRODUCT_CONTINUITY.md)
vincula las pruebas HTTP sobre PostgreSQL y sus resultados.

Siguiente paso de Viajes y QA, POR_ASIGNAR. Reproducir el abordaje intermedio con
dos sesiones en navegador y dispositivo físico cuando esté disponible. Mantener
la concurrencia de última plaza y la decisión de no reutilizar plazas por tramos.
