# Estado integrado (fuente: dev)

Fecha de creación: 2026-11-13, America/Bogota.
No hay todavía un hito funcional promocionado mediante PR y validado por integrador
en dev. La fundación local se registra en PROGRESS y el handoff, sin llamarla integración.
No se han abierto PR, realizado merges ni publicado ramas.

La referencia dev se creará con la misma fundación local que main y feature; esto
es inicialización de referencias, no evidencia de revisión de integración del equipo.
Versión de migración integrada revisada por equipo: PENDIENTE. Pruebas del estado
local: consultar [PROGRESS](../development/PROGRESS.md) y [EVIDENCE](../demo/EVIDENCE.md).

Próximo integrador: POR_ASIGNAR. Revisar fundación; recibir referencias ERS/UML;
confirmar Expo Go físico. Después promover cambios desde task/* siguiendo GitFlow.

## Aviso de coordinación de Fase 2 (no integrado)

Por instrucción de continuidad se deja esta nota local sin cambiar el último estado
integrado: dev/main/feature siguen en e3841bc. Checkpoint documental f637499 permanece
en task/docs-foundation-checkpoint, no es ancestro de feature ni se fusionó.
Fase2 se trabaja aisladamente en task/trips-publicacion desde feature; código y nueva
trazabilidad pendientes de revisión/commit autorizado. No PR/merge/push. Versiones
de migraciones aplicadas sólo localmente y pruebas en EVIDENCE/PROGRESS.

## Aviso local de auditoría — 2026-11-13 (no cambia estado integrado)

Actualización solicitada expresamente para coordinación; no validación del integrador.
Referencias main/dev/feature en e3841bc y checkpoint f637499 aislado, según inspección local.

| Categoría                | Estado verificable                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Probado localmente       | En task/trips-publicacion: Jest 71/71, Playwright web 4/4, smoke 6/6, Doctor 18/18; estáticos, migraciones locales y seed aprobados. Evidencia nueva en FASE2_REVIEW. |
| Pendiente de integración | Primer commit sin autorización; stage vacío. Revisores/integrador POR_ASIGNAR. Sin PR, merge o push; reconciliar checkpoint documental antes de promoción.            |
| Pendiente de dispositivo | **BLOQUEADO POR ENTORNO**: no teléfono/Expo Go físico observado. Checklist LAN en informe; viewport móvil no acredita nativo.                                         |
| Pendiente de PO          | RF-001 prioridad ausente de matriz; cancelaciones/penalidades, costos, género/moto y propuestas de grupo/cancelación de Fase 3. No se aplican automáticamente.        |
| Riesgos audit            | npm audit exit1: 40 alertas (cinco altas). Sin fix forzado, sin aceptación implícita. Tratamiento compatible o decisión de riesgo explícita antes de promoción.       |

Informe: [FASE2_REVIEW](../reviews/FASE2_REVIEW.md).
Reservas: [diseño pendiente, sin implementación](../development/FASE3_RESERVAS_PLAN.md).

## Nota local del refactor — 2026-11-14 (sin promoción a dev)

Actualización de coordinación solicitada; el estado integrado NO cambia. Fetch real
confirma origin/task/trips-publicacion=bab4e63, igual a Fase 2 local publicada.
Feature/main/dev=e3841bc y checkpoint f637499 aislado. No existe origin/feature observado.
Los avisos anteriores de falta de commit/push corresponden a sus cortes históricos.

| Categoría                | Resultado de esta intervención                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Probado localmente       | Equivalencia216archivos/133gitkeep, grafo npm, npm ci aislado, typecheck/lint/formato/builds/Doctor18/18/exports. Nueva ubicación backend/frontend, arquitectura intacta.    |
| Bloqueado por entorno    | No PG55432/directorio temporal configurado. npm test28pasadas43fallidas; migrate/seed/test:setup/smoke fallan; E2E no ejecutado. API3000/web8081 propios activos, health503. |
| Pendiente de integración | Refactor sin stage/commit en task/refactor-monorepo-structure desde Fase 2 bab4e63. Integrar primero Fase 2 y revisar diff puro después. Personas POR_ASIGNAR.               |
| Pendiente de dispositivo | Expo Go físico/LAN/SecureStore NO VERIFICADO; exports no acreditan teléfono.                                                                                                 |
| Pendiente de PO          | Sin resolver prioridades/cancelaciones/costos/género ni políticas de reservas; no cambia por mover rutas.                                                                    |
| Riesgos audit            | Nueva consulta exit1:40alertas,5altas. Sin fixes/upgrades; evaluación compatible pendiente.                                                                                  |

[Review con pruebas y límites](../reviews/ARCH_REFACTOR_REVIEW.md).
No CI remoto ni integración USC real acreditados.

## Recuperación autorizada y verificación local — 2026-11-14

Este aviso actualiza el estado LOCAL, no la fuente integrada en dev. Usuario autorizó
nuevo PostgreSQL persistente de desarrollo/test desde cero. No otra versión de app.

| Categoría                   | Estado actual comprobado                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entorno                     | ruteam/ruteam_test operativas en127.0.0.1:55432; datos fueraGit .local-data/postgresql-18; .env sin cambios; sistema5432 intacto y no consultado.          |
| Probado localmente          | Migraciones4/4 por base y seed idempotente;71/71 Jest,4/4 E2E,6/6 smoke, Doctor18/18, estáticos/builds/equivalencia aprobados. Health200/databaseup.       |
| Fallo corregido             | Caché Expo web retenía API3000 en E2E8082; --clear en comandos generales y harness produce3100 correcto, sin cambiar CORS, BD o assertions.                |
| Pendiente de integración    | Rama task/refactor-monorepo-structure sigue bab4e63 con cambios locales sin stage/commit. Primero integrar Fase2 en feature; autorizaciones Git separadas. |
| Pendiente de dispositivo/CI | Expo Go físico, LAN real y CI remoto no observados; viewport y Doctor no los acreditan.                                                                    |
| Pendiente de PO/riesgos     | Decisiones de negocio abiertas y alertas audit previas40/5altas no resueltas por esta recuperación.                                                        |

[Informe de resultados y limitaciones](../reviews/POSTGRESQL_RECOVERY_VALIDATION.md).
Responsable humano/integrador/revisores POR_ASIGNAR. Los43fallos anteriores por BD ausente
son históricos; no se reescriben. Esta sesión los contrasta con71/71 nuevas reales.
