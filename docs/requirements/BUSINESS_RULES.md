# Índice de reglas y verificaciones del producto

Incremento A, transformación integral, 25/11/2026. El texto normativo único reside en
[PRODUCT_DEFINITION](PRODUCT_DEFINITION.md); este índice relaciona reglas con casos
verificables y no duplica un segundo catálogo funcional. Los IDs RN son internos estables;
no renumeran RF/RNF/HU oficiales. Los escenarios de esta tabla son **requeridos**, no
pruebas aprobadas ni cobertura atribuida al incremento A.

| Regla vigente                              | RF/RNF o extensión cotejada relacionada                     | Caso verificable esencial                                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN-IDENTIDAD-01/02                         | RF-001/002, RQ-ACC-01                                       | Todos los usuarios de viajes son estudiantes vigentes; cuenta, correo, estamento y conducción no se confunden; sin ADMIN                                                                     |
| RN-CUENTA-01                               | RF-001/002/016                                              | Cuenta autenticada pendiente permite sólo cuenta/verificación; feed/publicar/participar rechazados por API y ruta directa                                                                    |
| RN-AUTH-01/02                              | RF-001/016, RNF-038/039/040                                 | Registro/login normal con contraseña RuTeam scrypt y sesión real; correo token expirado/uso único/recuperación/rate limit; ningún selector o endpoint de fixture accesible como login normal |
| RN-ONBOARDING-01                           | RF-002 y ampliación de UX sin nuevo HU oficial              | Preferencia no concede conducción; proceso se guarda/retoma y movilidad se puede omitir sin perder listado general                                                                           |
| RN-CAPACIDAD-CONDUCTOR-01 / RN-VEHICULO-01 | RF-013/024/022                                              | Pasajero inicia habilitación voluntaria; licencia/vehículo/documentos vigentes y fuente legítima donde se exige; expiración retira conducción pero no pasajero institucionalmente vigente    |
| RN-VIAJE-01..04                            | RF-003/004/029, RQ-RUTA-01                                  | Ambas modalidades por campus institucional, encuentro interior libre; externo→externo denegado; desde USC sólo abordaje origen; ruta/condiciones persistidas                                 |
| RN-BUSQUEDA-01                             | RF-005/018, RQ-RUTA-01                                      | Buscar no crea viaje ni solicitud; texto/proximidad/paso no equivalen a recogida autorizada; dirección y horario coherentes                                                                  |
| RN-MOVILIDAD-01                            | RF-002/005/018 y ampliación nueva sin RF inventado          | Varias preferencias privadas, activar/editar/eliminar, zona aproximada y horarios; no domicilio público ni solicitud de transporte                                                           |
| RN-RECOMENDACION-01/02                     | RF-005, RNF-031/035/040                                     | La recomendación exige un segmento autorizado. La exploración general incluye viajes elegibles aunque no coincidan con las preferencias.                                                     |
| RN-FEED-01                                 | RF-005/018, RNF-048/050                                     | Para ti y listado general desde backend; cuenta sin preferencias descubre viajes; tarjetas/detalle usan plazas/reputación/datos reales                                                       |
| RN-NOTIFICACION-01                         | Relación con avisos RF-006/014/015 y RNF-032/040            | Notificación persistente propia sin duplicados, lectura y deep link autorizado; no dueño como pasajero ni plaza automática; interna≠push/tiempo real                                         |
| RN-PARTICIPACION-01 / RN-CAPACIDAD-01      | RF-006/007/012/015                                          | Confirmación directa transaccional, no propio/duplicado, último cupo; retiro/cancelación/inicio concurrentes preservan capacidad e historia                                                  |
| RN-GRUPO-01                                | RQ-GRUPO-01                                                 | Consentimiento individual y lote atómico. Invitación opaca, caducidad, revocación y competencia por cupos con confirmaciones individuales                                                    |
| RN-PARADA-01                               | RQ-RUTA-01 y regla nueva sin RF oficial atribuido           | HACIA_USC conecta el origen externo publicado y la sede USC. Las propuestas quedan como historial.                                                                                           |
| RN-ABORDAJE-01 / RN-ESTADO-01              | RF-027/012/015                                              | Presencia sólo confirmada y sin segunda plaza; transiciones válidas, diferencia lleno/iniciado y recogidas intermedias hacia USC                                                             |
| Seguridad y complementarios compatibles    | RF-008/009/010/011/014/028/030, RNF-038..050 según catálogo | Acceso por recurso/participante, mínimos datos, sin lucro/cobros/SOS falsos; funciones pendientes no se presentan operativas                                                                 |

En conflictos, aplicar definición vigente y registrar divergencia original en
ERS_CATALOG/UML_CROSSWALK. Dudas de métricas, penalidades, costos/género o fuentes
institucionales no se resuelven inventando una prueba o cambiando una prioridad.
API/TRACEABILITY y evidencias del integrador acreditan qué se implementó y verificó.
Ver [permisos](../architecture/AUTHORIZATION_MATRIX.md), [flujos](USER_FLOWS.md) y
[recomendaciones](../architecture/RECOMMENDATION_FLOW.md).

## Reglas precisadas en la consolidación del 26/11

| Regla              | Fuente     | Caso verificable esencial                                                                                                                                                    |
| ------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN-CALIFICACION-01 | RF-010     | Tras finalizar, sólo conductor y pasajeros abordados se evalúan de a dos en capacidades opuestas. Duplicado concurrente no sesga la media por capacidad. Comentario privado. |
| RN-ABORDAJE-01     | RF-027     | Código opaco de dos minutos y de un solo uso, validado en viaje y parada correctos. Se conserva el abordaje manual y la plaza original.                                      |
| RN-SEGUIMIENTO-01  | RF-015     | Titular autorizado publica una muestra voluntaria. Otra cuenta ajena no la consulta. Se oculta tras dos minutos y se elimina al cerrar.                                      |
| RN-SEGURIDAD-01    | RF-011     | Contexto mínimo durante el viaje. Selector y marcador requieren una acción del usuario.                                                                                      |
| RN-COSTO-01        | RF-008/009 | Sólo titular antes del inicio, valores enteros por categoría y suma exacta. El dato privado no aparece en el viaje público.                                                  |
