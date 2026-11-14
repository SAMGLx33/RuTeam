# Propiedad y revisores

Asignaciones humanas: todas POR_ASIGNAR; esta tabla propone responsabilidades técnicas.

| Rutas                                                       | Frente dueño          | Revisor cruzado                      | Contrato público            |
| ----------------------------------------------------------- | --------------------- | ------------------------------------ | --------------------------- |
| api/modules/auth, profiles, institutional-membership, users | Identidad             | QA                                   | login/me/logout/profile     |
| api/modules/vehicles, campus, trips                         | Viajes                | Reservas                             | destinations; viajes futuro |
| api/modules/matching, reservations                          | Matching/reservas     | Viajes                               | pendiente                   |
| api/modules/ride-execution, boarding                        | Recorrido             | Identidad                            | pendiente                   |
| api/modules/costs, compensations, chat, ratings, safety     | Comunicación/economía | Recorrido                            | pendiente                   |
| apps/client, tests/web                                      | Frontend/QA           | Identidad y dueño de cada consumidor | API v1                      |
| api/modules/administration                                  | Viajes + QA           | Identidad                            | pendiente                   |

Integrador de schema/migraciones/seed: POR_ASIGNAR (coordinación con todos los frentes).
Integrador Git/CI/lockfile/app.module/variables: POR_ASIGNAR. Ningún agente modifica esos
puntos de conflicto sin registrar el alcance. packages/contracts y API.md se revisan
con sus consumidores. Ver [API](../development/API.md). La fundación no asigna personas.
