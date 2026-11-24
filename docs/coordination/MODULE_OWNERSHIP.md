# Propiedad y revisores

Asignaciones humanas: todas POR_ASIGNAR; esta tabla propone responsabilidades técnicas.

| Rutas                                                               | Frente dueño          | Revisor cruzado                      | Contrato público            |
| ------------------------------------------------------------------- | --------------------- | ------------------------------------ | --------------------------- |
| backend/src/modules/auth, profiles, institutional-membership, users | Identidad             | QA                                   | login/me/logout/profile     |
| backend/src/modules/vehicles, campus, trips                         | Viajes                | Reservas                             | destinations; viajes futuro |
| backend/src/modules/matching, reservations                          | Matching/reservas     | Viajes                               | pendiente                   |
| backend/src/modules/ride-execution, boarding                        | Recorrido             | Identidad                            | pendiente                   |
| backend/src/modules/costs, compensations, chat, ratings, safety     | Comunicación/economía | Recorrido                            | pendiente                   |
| frontend, tests/web                                                 | Frontend/QA           | Identidad y dueño de cada consumidor | API v1                      |
| backend/src/modules/administration                                  | Viajes + QA           | Identidad                            | pendiente                   |

Integrador de schema/migraciones/seed: POR_ASIGNAR (coordinación con todos los frentes).
Integrador Git/CI/lockfile/app.module/variables: POR_ASIGNAR. Ningún agente modifica esos
puntos de conflicto sin registrar el alcance. packages/contracts y API.md se revisan
con sus consumidores. Ver [API](../development/API.md). La fundación no asigna personas.

## Traslado estructural — 2026-11-14

Las rutas cambian; dueños y revisores por rol no cambian. Backend/frontend conserva
los módulos/funcionalidades existentes. Coordinación transversal temporal de estructura,
lockfile/CI/imports/AGENTS: refactor arquitectónico, responsable y revisor POR_ASIGNAR.
No concede permiso para implementar reservas o refactorizar módulos ajenos.

## Cambios del 24 de noviembre

`backend/src/modules/trips` es dueño de itinerario y matching; revisan Matching/reservas y Recorrido. `backend/src/modules/reservations` es dueño de solicitudes, cupos y transiciones que afectan la participación; revisan Viajes, Datos e Identidad. `packages/contracts/src/routes.ts`, el esquema y las dos migraciones son frontera de revisión compartida. Las asignaciones nominales siguen pendientes.
