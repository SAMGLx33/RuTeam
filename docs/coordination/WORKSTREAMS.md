# Frentes de trabajo

Inicio diagnóstico/fundación: 2026-11-13. Cierres: no confirmados.
Todos los responsables humanos están POR_ASIGNAR.

| Frente                  | Rama sugerida           | Objetivo                   | Dependencia/bloqueo               | Estado local                                |
| ----------------------- | ----------------------- | -------------------------- | --------------------------------- | ------------------------------------------- |
| Identidad               | task/auth-afiliacion    | Verificación y sesión      | API oficial USC ausente           | Fundación implementada, revisión pendiente  |
| Viajes                  | task/trips-publicacion  | Vehículos/destinos/paradas | Datos y contrato de identidad     | Catálogo lectura; resto pendiente           |
| Matching/reservas       | task/reservations-cupos | Atomicidad grupal          | Modelo de viajes                  | Pendiente                                   |
| Recorrido               | task/ride-execution     | GPS foreground/QR interno  | Viajes/reservas                   | Pendiente                                   |
| Comunicación/economía   | task/chat-costs         | WS/chat/costos sin lucro   | Viajes, decisiones PO             | Pendiente                                   |
| Frontend/integración/QA | task/client-login       | Expo web/móvil y pruebas   | Teléfono físico y versión Expo Go | Fundación local; móvil físico no verificado |

Agente de fundación: Codex, main por excepción solicitada; no sustituye dueño humano.
Para cada avance, editar sólo fila propia y enlazar nuevo handoff desde PROGRESS.
