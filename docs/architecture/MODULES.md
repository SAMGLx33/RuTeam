# Módulos y límites funcionales

Diseño vigente25/11, bajo PRODUCT_DEFINITION. Carpetas o decisiones de diseño no
acreditan implementación. Consultar API/TRACEABILITY/PROGRESS para alcance verificado.
Mantener MVC por módulo y ubicaciones existentes coherentes; no crear placeholders
para aparentar cumplimiento ni trasladar módulos por una preferencia de nomenclatura.

| Dominio                                | Responsabilidad vigente                                                                                               | Frontera                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| auth/profiles/institutional-membership | Identidad estudiantil, elegibilidad, sesión revocable y perfil propio                                                 | Fuente autorizada separa correo/autenticación/estamento/matrícula; permisos desde servidor                 |
| vehicles                               | Autogestión de vehículo/documentos y elegibilidad de conducción                                                       | Declarado/aportado/formato/vigencia≠verificado oficialmente; sin revisor ADMIN operativo                   |
| campus                                 | Referencias institucionales ampliables y encuentros interiores                                                        | Campus por identidad, texto libre válido sin GPS propio; catálogo sintético no certificado                 |
| trips                                  | Publicación de conductor, modalidades, snapshot de ruta/puntos/condiciones, matching existente y propuestas de parada | Externo→externo rechazado; propuesta sólo HACIA_USC y separada de plazas; geometría inmutable              |
| reservations                           | Participación confirmada directa, integrantes, capacidad, idempotencia, retiro e historial                            | Lock conductor→viaje; revalidación transaccional; grupos sólo con consentimiento; sin aprobación ordinaria |
| ride-execution/boarding                | Transiciones/abordaje conforme al corte efectivo                                                                      | Presencia≠participación y sin segundo consumo de plaza; códigos internos seguros si se implementan         |
| chat/ratings                           | Comunicación privada del viaje e interacción real finalizada                                                          | Sólo participantes autorizados, sin autoevaluación/duplicados/ratings ficticios                            |
| costs/compensations/safety             | Costos sin lucro, registro económico y seguridad consentida                                                           | Sin pasarelas/multas ni despacho de emergencia ficticios; políticas pendientes explícitas                  |
| common/infrastructure/health           | Guardas, errores, config, Prisma/adaptadores y readiness                                                              | Capacidades transversales, no contenedor general del negocio                                               |

administration deja de ser un dominio funcional. Retirar endpoints/pantallas/permisos y
su dependencia para publicar. Registros antiguos necesarios para auditoría se conservan
como datos históricos, sin conceder acceso ni transformar exusuarios en estudiantes.

La unidad transaccional puede leer identidad/licencia/vehículo/campus para validar el
agregado, con responsabilidades acordadas; no autoriza Prisma en React ni escrituras
ajenas sin coordinación. Integración central de schema/contratos y revisión cruzada según
MODULE_OWNERSHIP. Test de solapamiento no sustituye test de última plaza.

[Historial de módulos anteriores](../history/2026-11-24-guides.md) y ADR0002 describen
la base del24, incluidas solicitud/aceptación y revisión sintética ahora retiradas.
