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

La transformación añade `backend/src/modules/mobility` como responsabilidad de
movilidad y recomendaciones, incluidos feed, detalle y avisos internos. Viajes
y participaciones conservan el dominio transaccional e invocan la cola cuando cambia
la disponibilidad. Identidad revisa elegibilidad de destinatarios y QA valida
deduplicación, recuperación de leases y privacidad. Responsables humanos POR_ASIGNAR.

Continuidad 26/11: Cartografía revisa `geocoding` y el catálogo con Viajes. Datos valida
sede y fechas persistidas. Participaciones depende del contrato de recorrido para el
avance. Comunicación es dueña de `chat` y coordina avisos con Mobility. Personas POR_ASIGNAR.

En consolidación, Comunicación mantiene `ratings` y el aviso de calificación.
Participaciones mantiene `groups` y reutiliza sus reglas de tramo, vigencia y
bloqueo para confirmación y QR. Seguridad mantiene contexto y última posición.
Economía mantiene `expenses`; Producto revisa futuras reglas de reparto.
Los contratos transversales y las migraciones se revisan con Datos y QA.

Para el corte de cierre se mantienen las fronteras existentes. Trips conserva
el importe y los métodos de publicación. Expenses valida el cálculo y los
registros por participación. Safety custodia los datos de autor. Reservations
orquesta el cierre. Mobility mantiene las vistas del aviso. Revisiones
humanas y promoción quedan POR_ASIGNAR en los frentes y el handoff de cierre.

## Responsabilidades de continuidad

| Responsable técnico          | Cambios integrados                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| Trips                        | Calendario, trabajador durable, plantilla, ocurrencia y reutilización de geometría.               |
| Auth + Reservations + Groups | Confirmación sensible, revocación, cierre transaccional, solicitudes y consentimiento individual. |
| Mobility                     | Agregados personales y bandeja durable.                                                           |
| Expenses                     | Historial de gastos, aportes y registros de compensación por rol.                                 |
| Reservations + Safety        | Cierre seguro, pases, ubicación, contexto y exportación de incidencias.                           |
| Frontend                     | Publicación, pantallas de cuenta e historiales, cierre operativo y selección de ubicación.        |

## Responsabilidades de evolución

| Área                        | Responsabilidad                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| Mobility / Vehicles         | Catálogo de factores, energía, proyecciones y preferencias.                                         |
| Trips / Reservations        | Plantillas verificadas, captura de entradas ambientales y cierre.                                   |
| Realtime / Auth             | Conexión SSE, sesiones y reevaluación de permisos.                                                  |
| Safety                      | Operación, QR, seguimiento y contexto posviaje.                                                     |
| Mobility / plataforma móvil | Registro y cola push. La aplicación nativa habilitada requiere un adaptador del SDK y credenciales. |
