# Propiedad técnica y revisión cruzada

Asignaciones humanas POR_ASIGNAR. Propuesta funcional vigente25/11/2026;
leer PRODUCT_DEFINITION antes de editar. No asigna personas ni acredita integración.

| Rutas / frontera                                                                       | Frente dueño                       | Revisión cruzada / contrato                                                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| backend/src/modules/auth, profiles, institutional-membership, users                    | Identidad/seguridad                | QA y Viajes; sesión, estudiante, capacidades, perfil propio                                   |
| backend/src/modules/vehicles, campus, trips                                            | Viajes/vehículos/campus            | Identidad, Matching y Recorrido; elegibilidad, modalidades, encuentro, publicación/búsqueda   |
| backend/src/modules/reservations y matching existente en trips                         | Matching/participaciones           | Viajes, Identidad y Datos; confirmación directa, ocupación, cancelación, idempotencia y grupo |
| Propuestas de parada en módulo de viajes, ride-execution/boarding cuando implementados | Recorrido con Viajes               | Matching y QA; propietario decide propuesta, geometría inmutable, ninguna plaza automática    |
| backend/src/modules/costs, compensations, chat, ratings, safety                        | Comunicación/economía/seguridad    | Identidad y Recorrido; consumidores de participación y estado, privacidad e historial         |
| frontend y tests/web                                                                   | Frontend/integración/QA            | Dueño backend de cada consumidor e Identidad; una app Expo compartida y contrato API          |
| packages/contracts, API, schema/migraciones/seed                                       | Integrador transversal POR_ASIGNAR | Todos los consumidores, Datos y QA; un escritor coordinado por intervención                   |

La administración no es un módulo funcional del producto. El retiro de accesos,
rutas y dependencias administrativas corresponde a Identidad con Viajes/vehículos
y Frontend. Datos conserva sólo auditoría histórica necesaria. La existencia de una
carpeta antigua no autoriza recuperar permisos/paneles ni flujos de aprobación ADMIN.
Los operadores de PostgreSQL, despliegue e infraestructura son responsabilidades técnicas.

Integrador Git/CI/lockfile/app.module/variables POR_ASIGNAR; cambios requieren alcance
coordinado. Cada servicio conserva MVC modular, aplicación/dominio/repositorios; React
no decide elegibilidad ni cupos. No mover matching sólo por la tabla de propiedad:
la ubicación implementada en trips se mantiene mientras sea coherente.

Leer WORKSTREAMS para dependencias y PROGRESS/handoff para resultados reales. Las
[asignaciones anteriores](../history/2026-11-24-guides.md) son antecedentes; no se heredan
permisos de edición global ni integración por cambiar rutas externas.
