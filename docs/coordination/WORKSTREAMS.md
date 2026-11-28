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

## Transformación funcional 25/11/2026 | avance local en revisión

| Frente                      | Alcance de este corte                                                                | Revisión humana |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------- |
| Identidad y seguridad       | Cuentas propias, correo, recuperación, sesión y elegibilidad institucional separadas | POR_ASIGNAR     |
| Arquitectura y datos        | Migración aditiva, restricciones, contratos y cola PostgreSQL                        | POR_ASIGNAR     |
| Movilidad y recomendaciones | Preferencias privadas, feed, coincidencias y avisos persistentes                     | POR_ASIGNAR     |
| Viajes y participaciones    | Publicar, actualizar disponibilidad, propuestas, abordaje e historial                | POR_ASIGNAR     |
| Navegación y experiencia    | Expo compartido, registro, permisos y paneles por capacidad                          | POR_ASIGNAR     |
| QA e integración            | HTTP/PostgreSQL, capturas, recorridos web y documentación académica                  | POR_ASIGNAR     |

El integrador mantiene `CURRENT_STATUS.md`. Revisar pruebas y evidencia del [corte local](../reviews/PRODUCT_TRANSFORMATION_DELIVERY.md) para decidir promoción.

## Continuidad operativa, 26/11/2026

Cartografía y tiempo dependen de Datos y Viajes para sede, selección y migración.
Comunicación comparte notificaciones y el lock de viaje con Participaciones.
QA e Identidad revisan el buzón local, la vigencia y el acceso por recurso.
Personas POR_ASIGNAR. La revisión técnica está en
[continuidad operativa](../reviews/PRODUCT_CONTINUITY.md).

## Consolidación funcional al 26/11

| Frente              | Responsabilidad y revisión                                                | Persona     |
| ------------------- | ------------------------------------------------------------------------- | ----------- |
| Reputación          | Regla RF-010, evaluación, resúmenes y privacidad de comentarios           | POR_ASIGNAR |
| Participaciones     | Grupos, expiración, concurrencia y abordaje manual/QR                     | POR_ASIGNAR |
| Haberes del viaje   | Estimaciones privadas en COP y propuesta de reparto para Producto         | POR_ASIGNAR |
| Seguridad           | Contexto activo, compartir voluntario, seguimiento y retención            | POR_ASIGNAR |
| Cliente y QA        | Contratos Expo, Playwright y validación física de cámara/ubicación        | POR_ASIGNAR |
| Datos e integración | Restauración, matriz de migraciones, revisión de dependencias y promoción | POR_ASIGNAR |

El integrador actualiza el estado compartido sólo tras validar la integración.

## Cierre del 26/11 en revisión

Publicación y economía comparten contrato de condiciones. Seguridad custodia
contactos, incidencias y ubicación. Participaciones conserva el lock conductor
→ viaje y emite los avisos de su ciclo. Movilidad mantiene la bandeja
persistente. QA coteja autorización, navegador, restauración y Expo Go.
Las personas responsables quedan POR_ASIGNAR. [Handoff](../handoffs/2026-11-26_release-readiness.md).

## Continuidad local del producto

Trips entrega plantillas y ocurrencias. Auth coordina el cierre con Reservations, Groups y Trips. Mobility y Expenses mantienen sus consultas privadas sobre registros existentes. Reservations y Safety revisan transiciones e incidencias conjuntamente. Frontend integra los recorridos y Validación registra evidencia de PostgreSQL y Chromium. Los [relevos](../handoffs/README.md#continuidad-del-producto) enlazan contratos e impacto por frente.

## Evolución local

Movilidad coordina estimación, agenda, actividad y preferencias. Viajes y Reservas integran la instantánea ambiental al publicar y finalizar. Tiempo real gestiona sesiones SSE y señales transaccionales. Safety y Frontend mantienen la operación y la experiencia posviaje. El integrador conserva la responsabilidad sobre CURRENT_STATUS.

## Operación de viaje del 27/11/2026

| Frente                  | Alcance local                                                  | Revisión humana |
| ----------------------- | -------------------------------------------------------------- | --------------- |
| Trips y Reservations    | Descenso, cierre, ventanas, demoras, vencimiento y edición.    | POR_ASIGNAR     |
| Mobility                | Guardados, disponibilidad, recordatorios, agenda y lugares.    | POR_ASIGNAR     |
| Safety, Chat y Realtime | GPS voluntario, permisos por recurso y reconexión.             | POR_ASIGNAR     |
| Cliente Expo            | Dispositivos y enlaces de avisos, con prueba física pendiente. | POR_ASIGNAR     |
| Integración             | Migraciones, contratos, prueba aislada y documentación.        | POR_ASIGNAR     |

## Integración de producto

`task/trip-operations` integra acceso académico, operación y rediseño de Expo,
y navegación vial. Revisores humanos POR_ASIGNAR. Prueba física y promoción
siguen el protocolo de integración.
