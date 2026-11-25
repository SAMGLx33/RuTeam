# Frentes de trabajo vigentes

Redefinición25/11/2026; entrega 28/11. Leer PRODUCT_DEFINITION y el
[plan de incrementos](../development/PRODUCT_REDEFINITION_PLAN.md).
Los seis frentes son técnicos; responsables/revisores humanos POR_ASIGNAR.
Esta tabla coordina trabajo pendiente del corte, no certifica implementación ni integración.
Los avances verificables se registran en PROGRESS/review/handoff por el integrador.

| Frente                          | Responsabilidad del incremento                                                                                                                               | Dependencia y coordinación                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad/seguridad             | Sólo estudiantes vigentes, capacidades compatibles, sesiones, retiro de acceso ADMIN y aislamiento de fixtures; arquitectura de fuente legítima              | USC autorizada bloqueada; publicar política antes de operaciones nuevas. Datos/vehículos revisan migración histórica y no reclasificación de usuarios |
| Viajes/vehículos/campus         | Autogestión sin aprobación interna, documento declarado≠verificado; DESDE_USC/HACIA_USC, campus institucional, encuentro libre y snapshot de condiciones     | Contratos/identidad; capacidad/licencia/SOAT/propiedad bajo autoridad Nest; sin cambios esenciales silenciosos                                        |
| Matching/participaciones        | Descubrir viajes existentes, confirmar directamente, duplicados/idempotencia, retiro y último cupo; historial y grupos con consentimiento                    | Locks conductor→viaje, estado/paradas/afiliación revalidados. No aprobación ordinaria ni UUID como invitación; grupos pendientes explícitos           |
| Recorrido                       | Selección por mapa/resultados, distinguir paso/parada y campus aproximado; propuestas sólo HACIA_USC, decisión del dueño separada de participación; abordaje | Motor/teselas/geocodificación autorizados, geometría persistida. No validar teléfono por export; propuestas no cambian ruta ni cupos                  |
| Comunicación/economía/seguridad | Mantener chat, ratings, compensaciones, SOS/reportes compatibles según estado real; acceso por participante y datos mínimos                                  | Contratos de participación/estado. Sin lucro/pasarelas/multas o despacho ficticio; fuente de soporte humano sin rol ADMIN de aplicación               |
| Frontend/integración/QA         | Navegación estudiantil, confirmación directa, formularios sin campos técnicos, errores y responsive; regresión y cierre documental                           | Consumir contratos acordados. API/BD_test y navegador secuenciales; pruebas físicas e integraciones son evidencia independiente                       |

## Fronteras de edición

Coordinación central de schema, nuevas migraciones, seed, contracts, lockfile,
app.module y configuración. Un solo integrador de datos y contratos; ningún frente
sobrescribe cambios ajenos. Tests que comparten BD se ejecutan uno a la vez.
Frontend/pruebas/docs pueden avanzar con contrato explícito y archivos asignados.
No delegar sin transmitir PRODUCT_DEFINITION actualizada.

Rama pertinente del encargo: task/driver-defined-routes; comprobar Git al retomar.
No stage/commit/push/PR/merge automáticos. task/*→feature→dev→main; CURRENT_STATUS
sólo cambia bajo autoridad del integrador, no por terminar una tarea local.
Cada avance: pruebas, docs, trazabilidad y handoff NUEVO incluso si parcial/fallido.

## Antecedentes

[Guías anteriores](../history/2026-11-24-guides.md), reviews y handoffs fechados conservan
fundación, Fase2, traslado y corte24/11. Sus revisiones ADMIN, solicitud/aceptación
ordinaria y referencias a PG ausente o ramas antiguas describen aquellos cortes.
No definen responsabilidades ni reglas vigentes. La planificación21–28 está en SPRINTS.

## Identidad y autogestión — avance local 2026-11-25

Contrato sin rol ADMIN; acceso sólo STUDENT vigente; declaraciones documentales sin
aprobación interna, con integraciones autorizadas todavía bloqueadas. Migración histórica
y fixtures separados coordinados con viajes/participaciones. ESLint propio aprobado;
ejecución PostgreSQL integrada serializada. Responsable/revisión humana POR_ASIGNAR.
[Handoff](../handoffs/2026-11-25_identidad-autogestion-estudiantil.md). Sin promoción Git.
