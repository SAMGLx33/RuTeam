# Frentes de trabajo

Inicio diagnóstico/fundación: 2026-11-13. Cierres: no confirmados.
Todos los responsables humanos están POR_ASIGNAR.

| Frente                  | Rama sugerida           | Objetivo                   | Dependencia/bloqueo               | Estado local                                                      |
| ----------------------- | ----------------------- | -------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| Identidad               | task/auth-afiliacion    | Verificación y sesión      | API oficial USC ausente           | Fundación implementada, revisión pendiente                        |
| Viajes                  | task/trips-publicacion  | Vehículos/destinos/paradas | Datos y contrato de identidad     | Fase2 local en task/trips-publicacion; revisión/commit pendientes |
| Matching/reservas       | task/reservations-cupos | Atomicidad grupal          | Modelo de viajes                  | Pendiente                                                         |
| Recorrido               | task/ride-execution     | GPS foreground/QR interno  | Viajes/reservas                   | Pendiente                                                         |
| Comunicación/economía   | task/chat-costs         | WS/chat/costos sin lucro   | Viajes, decisiones PO             | Pendiente                                                         |
| Frontend/integración/QA | task/client-login       | Expo web/móvil y pruebas   | Teléfono físico y versión Expo Go | Fundación local; móvil físico no verificado                       |

Agente de fundación: Codex, main por excepción solicitada; no sustituye dueño humano.
Para cada avance, editar sólo fila propia y enlazar nuevo handoff desde PROGRESS.

## Frente activo de esta intervención

Codex implementa vehículos/publicación + consumidores Expo/contratos + migraciones nuevas
en task/trips-publicacion desde feature=e3841bc. Inicio2026-11-13, cierre humano sin confirmar;
responsable y revisor humanoPOR_ASIGNAR. Se coordinan schema, app.module, seed, guard de
capacidad auth/me y componentes compartidos como dependencias del flujo autorizado.
El checkpoint f637499 fue leído antes de cambiar de rama, sin copiarlo ni fusionarlo.
Fuentes privadas del usuario excluidas antes de switch, sin editar/mover/borrar originales.
No se necesita su integración para estas tareas aisladas; coordinación para futura fusión pendiente.

## Auditoría y preparación posterior — 2026-11-13

Frente Viajes: auditoría Codex del árbol existente, sin cambios runtime ni stage.
Revisión independiente del parche completada; dictamen humano propuesto APROBAR CON
CONDICIONES. Responsables/revisores de datos, backend, cliente, QA, documentación e
integración: POR_ASIGNAR. Evidencias nuevas y autorización de commit pendientes de
revisión humana; ningún frente se declara integrado. Sin sobrescribir trabajo de terceros.

Frente Matching/reservas: sólo [plan técnico](../development/FASE3_RESERVAS_PLAN.md),
con locks PostgreSQL, N identidades y pruebas concurrentes propuestas. No implementación;
comenzar después de revisión e integración autorizadas de Fase 2 y acuerdos PO.
Secuencia propuesta task→feature→dev→main y reconciliación f637499 en
[FASE2_REVIEW](../reviews/FASE2_REVIEW.md). Handoff de auditoría enlazado en PROGRESS.
