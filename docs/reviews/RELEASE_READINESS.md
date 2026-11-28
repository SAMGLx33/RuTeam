# Preparación de entrega de RuTeam

Corte local del 26/11/2026, America/Bogota. Entrega académica el 28 de
noviembre de 2026. Revisión y aceptación humanas pendientes. Para producción
siguen bloqueando la acreditación oficial USC, la operación de proveedores,
la revisión de privacidad y las alertas de dependencias restantes.

Consulta el estado de la [continuidad funcional](#continuidad-funcional-del-26112026) para la rama, las migraciones y las pruebas del incremento más reciente.

## Punto de control y propuesta Git

El directorio original estaba limpio en `sergio` con HEAD
`5af65f2d1c11f3b6091af21605a3eab21a50e163`, nueve migraciones, índice vacío
y sin archivos nuevos. Los documentos del encargo corresponden a la punta
remota `task/driver-defined-routes`, confirmada mediante `git ls-remote --heads`
en `f7013ea3068bdbccc0b234e328f5c9f2097e8426`. Es descendiente de `5af65f2`
y está cuatro commits por delante de `origin/feature` `690d486`, sin
divergencia. Los cuatro commits figuran con autor Git Darik218. Las ramas
de aportes anteriores de refactor, publicación y README siguen disponibles.

Se creó la copia aislada `RuTeam-cierre-funcional` en HEAD separado, con
`f7013ea` y sus 18 migraciones. Ese commit contiene las 256 rutas del cambio
de continuidad que faltaban en la copia original. La revisión incluyó estado,
índice, contenido versionado y patrones de claves/tokens. `.env`, credenciales
de laboratorio y respaldos se guardan fuera de Git. La carpeta privada de
originales académicos y el inventario original de laboratorio del corte
anterior no estaban disponibles localmente. Se usaron referencias derivadas y
el historial rastreado.

Propuesta de un checkpoint para economía, seguridad y transiciones, con las
migraciones compatibles y pruebas correspondientes. Se puede separar el
override de dependencias si se vuelve a validar ese corte de forma independiente.

### Mensajes propuestos

- `feat(ruteam): close trip economics, safety and lifecycle notices`
- `fix(deps): patch Expo and Prisma transitive vulnerabilities`

La base remota `f7013ea` ya existe como un solo commit. Su separación retroactiva
generaría estados intermedios sin evidencia. La promoción sigue el flujo
`task/driver-defined-routes → feature → dev → main`, previa autorización
humana. El estado integrado mantiene su fuente en coordinación.

## Cambios verificables

- RF-008 y RF-009 aplican COP enteros, oferta congelada y declaración posviaje
  por pasajero abordado. El conductor reconoce o registra discrepancia.
  [Reglas](../development/COMPENSACIONES_COP.md) · [Contrato HTTP](../development/API.md)
- RF-011 incorpora contactos privados, incidencia del propio viaje y caducidad
  visible. El resumen y la coordenada compartible se revisan antes de delegar al
  dispositivo. [Autorización](../architecture/AUTHORIZATION_MATRIX.md)
- El cierre registra ausencias, vence propuestas, termina invitaciones abiertas,
  retira pases y elimina ubicación. El conductor conserva alcance de cierre
  tras pérdida de elegibilidad según la regla operativa vigente.
  [Modelo y migraciones](../architecture/DATA_MODEL.md)
- Avisos internos se escriben junto a la operación que los origina. Se cubren
  confirmación, nuevo pasajero, retiro, propuesta, decisiones, cancelación,
  inicio, recogida actual o próxima, finalización, nota y compensación. El chat
  mantiene aviso agregado y el matching su cola durable.
- Los cambios y riesgos de MVC, seguridad y dependencias se detallan en
  [auditoría](RELEASE_AUDIT.md). Los derivados académicos y la coordinación
  están en [backlog y registro](../requirements/RELEASE_ACADEMIC.md),
  [UML](../requirements/RELEASE_UML.md) y
  [handoff](../handoffs/2026-11-26_release-readiness.md).

## Matriz de requisitos y funcionalidades

La evidencia web se refiere a Chromium y datos sintéticos. La columna de
móvil físico se mantiene pendiente donde la experiencia lo requiere. Las fichas
históricas ajenas a la política vigente se mantienen por su ID.

| Requisito                                         | Funcionalidad                        | Backend                      | Frontend                             | Persistencia                                 | Autorización                          | Pruebas                                                      | Evidencia web                             | Evidencia móvil física | Integración externa                | Estado                                       | Riesgo | Dependencia                     | Trabajo pendiente                                     |
| ------------------------------------------------- | ------------------------------------ | ---------------------------- | ------------------------------------ | -------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ | ----------------------------------------- | ---------------------- | ---------------------------------- | -------------------------------------------- | ------ | ------------------------------- | ----------------------------------------------------- |
| [RF-001](../requirements/ERS_CATALOG.md#rf-001)   | Cuenta y elegibilidad USC            | Auth y proveedor             | Login/registro/verificación          | User y sesión                                | Cuenta y estudiante                   | account, auth                                                | Cuenta web                                | Pendiente              | Matrícula USC                      | Completo con integración externa pendiente   | Alta   | USC y SMTP                      | Acreditación institucional y validación operativa     |
| [RF-002](../requirements/ERS_CATALOG.md#rf-002)   | Perfil, onboarding y capacidades     | Profiles y Auth              | Perfil/onboarding                    | Profile y User                               | Cuenta propia                         | account, auth                                                | Perfil y recarga                          | Pendiente              | —                                  | Completo y verificado internamente           | Baja   | RF-001                          | Aceptación física                                     |
| [RF-003](../requirements/ERS_CATALOG.md#rf-003)   | Publicación desde/hacia USC          | Trips                        | Publicar y revisión                  | Trip, Stop, Event                            | Titular y vehículo elegible           | driver-routes, publication                                   | Publicación y detalle                     | Pendiente              | Cartografía                        | Completo con integración externa pendiente   | Media  | RF-001/024/029                  | Operación sostenida de mapas                          |
| [RF-004](../requirements/ERS_CATALOG.md#rf-004)   | Reglas y condiciones de viaje        | Trips                        | Selección y detalle                  | TripRuleSelection                            | Propietario/publicado                 | driver-routes, publication                                   | Publicación y detalle                     | Pendiente              | —                                  | Completo y verificado internamente           | Baja   | RF-003                          | Revisión humana de catálogo                           |
| [RF-005](../requirements/ERS_CATALOG.md#rf-005)   | Feed, búsqueda y matching            | Trips y Mobility             | Feed, tabs y preferencias            | MobilityPreference, RecommendationJob        | Estudiante vigente                    | mobility, publication                                        | Feed y aviso                              | Pendiente              | Cartografía                        | Completo con integración externa pendiente   | Media  | RF-003/018                      | Medir con operador real y demanda                     |
| [RF-006](../requirements/ERS_CATALOG.md#rf-006)   | Confirmación directa y grupal        | Reservations y Groups        | Detalle, grupos y participaciones    | Reservation/Member, Group                    | Individual y consentimiento           | driver-routes, groups                                        | Confirmación y grupos                     | Pendiente              | —                                  | Completo y verificado internamente           | Media  | RF-003                          | QA física                                             |
| [RF-007](../requirements/ERS_CATALOG.md#rf-007)   | Retiro de plaza e historial          | Reservations                 | Mis participaciones                  | Reserva cancelada y plaza                    | Titular antes de salir                | driver-routes, release-economics-safety                      | Retiro en grupos                          | Pendiente              | —                                  | Completo y verificado internamente           | Baja   | RF-006                          | Política vigente sin penalidad                        |
| [RF-008](../requirements/ERS_CATALOG.md#rf-008)   | Aporte exacto sugerido               | Expenses y Trips             | Revisión y detalle                   | Trip y estimación privada                    | Titular para gastos                   | expenses-policy, release-economics-safety, publication       | Importe y revisión                        | Pendiente              | —                                  | Completo y verificado internamente           | Baja   | RF-003                          | Aceptación de copy y política aprobada                |
| [RF-009](../requirements/ERS_CATALOG.md#rf-009)   | Métodos y registro voluntario        | Expenses                     | Detalle y compensación               | TripCompensation                             | Titular abordado y conductor          | release-economics-safety, publication                        | Métodos en detalle y pantalla de registro | Pendiente              | —                                  | Completo y verificado internamente           | Media  | RF-006/008/027                  | QA cruzada en móviles                                 |
| [RF-010](../requirements/ERS_CATALOG.md#rf-010)   | Calificación mutua y reputación      | Ratings                      | Pendientes, detalle y tarjetas       | TripRating                                   | Par después de abordar                | ratings-policy, ratings                                      | Publicación de nota y perfil              | Pendiente              | —                                  | Completo y verificado internamente           | Baja   | RF-015/027                      | Política de comentarios públicos pendiente            |
| [RF-011](../requirements/ERS_CATALOG.md#rf-011)   | Contactos y seguridad                | Safety                       | Perfil y seguridad                   | EmergencyContact y posición                  | Cuenta propia y actor de viaje        | trip-safety, trip-tracking, release-economics-safety, safety | Contacto, selector controlado y ubicación | Pendiente              | Dispositivo                        | Pendiente de aceptación humana               | Media  | RF-015                          | Permisos y acciones físicas                           |
| [RF-012](../requirements/ERS_CATALOG.md#rf-012)   | Historial propio                     | Trips y Reservations         | Mis viajes y participaciones         | Trip y Reservation                           | Conductor/titular                     | driver-routes, ratings, groups                               | Consultas en sesiones separadas           | Pendiente              | —                                  | Completo y verificado internamente           | Baja   | RF-006/015                      | QA física                                             |
| [RF-013](../requirements/ERS_CATALOG.md#rf-013)   | Vehículos autogestionados            | Vehicles                     | Perfil y vehículos                   | Vehicle y documento                          | Dueño                                 | vehicle, driver-routes, publication                          | Vehículos propios                         | Pendiente              | Licencia y SOAT                    | Completo con integración externa pendiente   | Alta   | RF-024                          | Verificación externa                                  |
| [RF-014](../requirements/ERS_CATALOG.md#rf-014)   | Chat y actualización en tiempo real  | Chat y SSE                   | Conversaciones, contador y reintento | Chat persistente y cursores                  | Partes y ventana de 24 h              | chat, product-evolution y evolution                          | Mensajes y reconexión                     | Pendiente              | Push remoto separado               | Implementado en web/API                      | Media  | RF-015                          | Dispositivos físicos                                  |
| [RF-015](../requirements/ERS_CATALOG.md#rf-015)   | Operación, paradas y cierre          | Reservations y Safety        | Seguimiento y resumen por rol        | Trip, Stop, pases y posición                 | Conductor y participante              | driver-routes, trip-tracking, product-evolution              | Operación y actualización de plazas       | Pendiente              | Ubicación consentida               | Implementado en web/API                      | Media  | RF-027                          | Validación física                                     |
| [RF-016](../requirements/ERS_CATALOG.md#rf-016)   | Recuperación de contraseña           | Account y SMTP               | Recuperar acceso                     | AccountToken y sesión                        | Uso único y expiración                | account, account-smtp                                        | Pantalla de recuperación                  | Pendiente              | SMTP operativo                     | Completo con integración externa pendiente   | Alta   | RF-001                          | Prueba con operador autorizado                        |
| [RF-017](../requirements/ERS_CATALOG.md#rf-017)   | Administración retirada por Producto | —                            | —                                    | Antecedentes históricos                      | Sin rol operativo                     | student-auth-policy                                          | Control de navegación                     | —                      | —                                  | Completo y verificado internamente           | Baja   | Decisión de Producto            | Preservar retiro del alcance                          |
| [RF-018](../requirements/ERS_CATALOG.md#rf-018)   | Mapas y geolocalización              | Campus, Places y Routing     | Mapa y selección                     | Geometrías y paradas                         | Puntos públicos y GPS consentido      | driver-routes, photon-geocoding, safety                      | Mapa y contingencia con datos controlados | Pendiente              | Teselas, Photon, OSRM y GPS físico | Completo con integración externa pendiente   | Media  | RF-029                          | Cobertura, política y QA real                         |
| [RF-019](../requirements/ERS_CATALOG.md#rf-019)   | Estimaciones ambientales y movilidad | Mobility y Vehicles          | Estadísticas y resumen posviaje      | Instantáneas y factores versionados          | Titular o pasajero abordado           | environment y product-evolution                              | Estadísticas y datos faltantes            | Pendiente              | FECOC y SIN como fuentes           | Cálculo de operación implementado            | Baja   | Cobertura de datos              | Ampliar combustibles y transporte público con fuentes |
| [RF-020](../requirements/ERS_CATALOG.md#rf-020)   | Ciclo de vida de cuenta              | Auth y cierre transaccional  | Cuenta y privacidad / estado         | User, AuthSession y AccountDeletionRequest   | Sesión propia y contraseña            | product-continuation                                         | continuation                              | Pendiente              | Política de conservación           | Solicitud y recuperación implementadas       | Alta   | Conservación y privacidad       | Definir ejecución irreversible y retención            |
| [RF-021](../requirements/ERS_CATALOG.md#rf-021)   | Validación de género en moto         | —                            | —                                    | —                                            | —                                     | —                                                            | —                                         | —                      | Política de datos                  | Pendiente                                    | Alta   | Equidad/privacidad              | Decisión de Producto                                  |
| [RF-022](../requirements/ERS_CATALOG.md#rf-022)   | Condición de casco                   | Trips y Vehicles             | Publicación/detalle                  | Trip.providesHelmet                          | Titular/consulta publicada            | driver-routes, publication                                   | Detalle de reglas                         | Pendiente              | —                                  | Completo y verificado internamente           | Baja   | RF-013                          | QA física                                             |
| [RF-023](../requirements/ERS_CATALOG.md#rf-023)   | Recurrencias, agenda y reutilización | Trips y Mobility             | Editar publicaciones y agenda        | Plantilla, ocurrencia y viaje                | Conductor titular o reserva propia    | product-continuation, product-evolution y evolution          | Agenda y recurrencias                     | Pendiente              | Acreditación de producción         | Implementado en entorno local                | Media  | RF-001/024/029                  | Validar proveedores y dispositivos                    |
| [RF-024](../requirements/ERS_CATALOG.md#rf-024)   | SOAT y licencia                      | Vehicles y elegibilidad      | Vehículos y habilitación             | VehicleDocument/DriverEligibility            | Dueño y vigencia                      | driver-routes, publication                                   | Pérdida de conducción                     | Pendiente              | Operador oficial                   | Completo con integración externa pendiente   | Alta   | Operador autorizado             | Acreditación oficial                                  |
| [RF-025](../requirements/ERS_CATALOG.md#rf-025)   | Filtro exclusivo para mujeres        | —                            | —                                    | —                                            | —                                     | —                                                            | —                                         | —                      | Política de datos                  | Pendiente                                    | Alta   | Equidad/privacidad              | Decisión de Producto                                  |
| [RF-026](../requirements/ERS_CATALOG.md#rf-026)   | Historial económico voluntario       | Expenses                     | Perfil, historial y posviaje         | Trip, TripExpenseEstimate y TripCompensation | Conductor titular o pasajero propio   | product-continuation y release-economics-safety              | continuation                              | Pendiente              | —                                  | Implementado en entorno local                | Baja   | RF-008/009                      | Aceptar recorridos y texto en móvil físico            |
| [RF-027](../requirements/ERS_CATALOG.md#rf-027)   | Abordaje y QR interno                | Reservations                 | Pase, cámara y alternativa manual    | Hash, expiración y abordaje                  | Titular emite, conductor canjea       | boarding-qr, driver-routes, release-economics-safety         | Manual y vías web del pase                | Pendiente              | Cámara física                      | Pendiente de aceptación humana               | Media  | RF-006/015                      | Escaneo real, negación de permisos y reintento        |
| [RF-028](../requirements/ERS_CATALOG.md#rf-028)   | Retiros, cancelación e interrupción  | Reservations, Trips y Safety | Mis viajes y Mis participaciones     | Trip, Reservation y TripEvent                | Conductor o titular según operación   | product-continuation, driver-routes y groups                 | publication                               | Pendiente              | Canal de apoyo                     | Cierre seguro y cancelación implementados    | Media  | RF-003/006/015                  | Aceptar recorrido y apoyo externo                     |
| [RF-029](../requirements/ERS_CATALOG.md#rf-029)   | Catálogo y exactitud de embarques    | Campus                       | Punto libre y catálogo               | CampusDestination                            | Estudiante y catálogo público interno | campus-timing, publication                                   | Selección de sede y punto textual         | Pendiente              | USC                                | Completo con integración externa pendiente   | Alta   | Coordenadas autorizadas         | Verificación operativa de puntos                      |
| [RF-030](../requirements/ERS_CATALOG.md#rf-030)   | Incidencias privadas                 | Safety                       | Historial, registro y resumen        | TripIncident por autor                       | Autor y contexto de viaje             | product-continuation y release-economics-safety              | continuation y safety                     | Pendiente              | Canal USC                          | Registro privado y exportación implementados | Alta   | Canal autorizado y conservación | Definir destinatario, consentimiento y retención      |
| [RNF-031](../requirements/ERS_CATALOG.md#rnf-031) | Búsqueda paginada                    | Trips/Mobility               | Feed y filtros                       | Índices/cursor                               | Por estudiante                        | mobility                                                     | Feed en dos tamaños                       | Pendiente              | —                                  | Parcial                                      | Media  | Perfil de datos                 | Benchmark de objetivo                                 |
| [RNF-032](../requirements/ERS_CATALOG.md#rnf-032) | Tiempo real y avisos                 | SSE y cola push              | Bandeja y pantallas actualizadas     | TripNotification y PushDelivery              | Sesión y destinatario/recurso         | product-evolution y evolution                                | SSE en Chromium                           | Pendiente              | Expo/FCM/APNs                      | SSE verificado y entrega push pendiente      | Media  | Credenciales y app nativa       | Validar tiempos de entrega física                     |
| [RNF-033](../requirements/ERS_CATALOG.md#rnf-033) | Precisión de ubicación               | Safety y Campus              | Mapa y antigüedad                    | Posición efímera                             | Dueño/participante                    | trip-tracking                                                | GPS controlado                            | Pendiente              | Cámara/GPS y catálogo              | Parcial                                      | Media  | Dispositivo y red               | Precisión física                                      |
| [RNF-034](../requirements/ERS_CATALOG.md#rnf-034) | Escalabilidad                        | Cola durable y locks         | —                                    | PostgreSQL                                   | Guardias                              | Concurrencia de reservas                                     | —                                         | —                      | Infraestructura                    | Parcial                                      | Media  | Capacidad operativa             | Carga multiinstancia                                  |
| [RNF-035](../requirements/ERS_CATALOG.md#rnf-035) | Consumo de datos                     | Paginación y DTOs            | Queries y mapas                      | Proyecciones                                 | Por recurso                           | API y e2e                                                    | Export y navegación                       | Pendiente              | —                                  | Parcial                                      | Baja   | Red móvil                       | Mediciones                                            |
| [RNF-036](../requirements/ERS_CATALOG.md#rnf-036) | Batería                              | Muestra puntual              | Primer plano                         | TTL                                          | Consentimiento                        | trip-tracking                                                | Flujo controlado                          | Pendiente              | Dispositivo                        | Parcial                                      | Media  | Expo Go                         | Medición física                                       |
| [RNF-037](../requirements/ERS_CATALOG.md#rnf-037) | Arranque en frío                     | Build Nest                   | Export Expo                          | —                                            | —                                     | Build                                                        | Carga visual                              | Pendiente              | Dispositivo                        | Parcial                                      | Baja   | Entorno                         | Cronometrar arranque                                  |
| [RNF-038](../requirements/ERS_CATALOG.md#rnf-038) | Protección criptográfica             | Scrypt y hashes              | Cookie y SecureStore                 | Secretos internos y datos privados           | Sesión y recurso                      | account-policy, auth                                         | Persistencia web                          | Pendiente              | TLS/cifrado gestionado             | Parcial                                      | Alta   | Despliegue                      | Revisión operativa de cifrado en tránsito y reposo    |
| [RNF-039](../requirements/ERS_CATALOG.md#rnf-039) | Rate limiting                        | Throttler                    | Manejo HTTP                          | Estado del proceso                           | Global y rutas críticas               | account, auth                                                | Login y reintento                         | Pendiente              | Proxy/cluster                      | Parcial                                      | Media  | Topología de producción         | Límites distribuidos                                  |
| [RNF-040](../requirements/ERS_CATALOG.md#rnf-040) | Minimización y privacidad            | DTO/servicio/repositorio     | Caché por cuenta                     | PII privada                                  | Recurso y autor                       | account y release-economics-safety                           | Perfiles propios y seguridad              | Pendiente              | Política                           | Parcial                                      | Alta   | Privacidad                      | Retención y auditoría operativa                       |
| [RNF-041](../requirements/ERS_CATALOG.md#rnf-041) | Trazabilidad persistente             | TripEvent y registros        | Historial                            | FK y transacciones                           | Por actor                             | driver-routes y release-economics-safety                     | Vistas de estado                          | Pendiente              | —                                  | Parcial                                      | Media  | Política de evidencia           | Inmutabilidad operacional y retención                 |
| [RNF-042](../requirements/ERS_CATALOG.md#rnf-042) | Respaldo PostgreSQL                  | Migraciones y API            | —                                    | Respaldo privado                             | Base aislada                          | Ensayo actual                                                | Health HTTP                               | —                      | Operación productiva               | Parcial                                      | Media  | Almacenamiento privado          | Programación y custodia operativa                     |
| [RNF-043](../requirements/ERS_CATALOG.md#rnf-043) | Recuperación medible                 | Migraciones y API            | —                                    | Restauración aislada                         | Operación técnica                     | Ensayo actual                                                | Health HTTP                               | —                      | Infraestructura                    | Parcial                                      | Media  | Respaldo representativo         | Establecer RTO/RPO de producción                      |
| [RNF-044](../requirements/ERS_CATALOG.md#rnf-044) | Disponibilidad                       | Health                       | Errores conectividad                 | Persistencia                                 | —                                     | Smoke                                                        | Errores controlados                       | Pendiente              | Infraestructura                    | Parcial                                      | Media  | Operación                       | Medición uptime                                       |
| [RNF-045](../requirements/ERS_CATALOG.md#rnf-045) | Integración Git                      | Ramas y CI                   | Mismo monorepo                       | Lock y migraciones                           | Revisión del equipo                   | Diff y checks                                                | —                                         | Pendiente              | —                                  | Pendiente de aceptación humana               | Media  | Integrador humano               | Promover según flujo task → feature                   |
| [RNF-046](../requirements/ERS_CATALOG.md#rnf-046) | Web/Android/iOS                      | Contratos                    | Expo Router                          | Sesión por plataforma                        | Guardias                              | Builds y Playwright                                          | Escritorio y móvil web                    | Pendiente              | Teléfono                           | Pendiente de aceptación humana               | Media  | Expo Go                         | Validación física                                     |
| [RNF-047](../requirements/ERS_CATALOG.md#rnf-047) | Sistemas operativos compatibles      | —                            | Expo SDK 54                          | —                                            | —                                     | Doctor/export                                                | Viewport móvil                            | Pendiente              | Dispositivos                       | Pendiente de aceptación humana               | Media  | Versiones reales                | Matriz física de OS                                   |
| [RNF-048](../requirements/ERS_CATALOG.md#rnf-048) | Experiencia mobile-first             | Estados HTTP                 | Una app responsive                   | —                                            | Capacidades                           | Playwright                                                   | Dos tamaños                               | Pendiente              | Dispositivos                       | Pendiente de aceptación humana               | Media  | QA físico                       | Ajustes y aceptación                                  |
| [RNF-049](../requirements/ERS_CATALOG.md#rnf-049) | Privacidad, términos y operación     | Controles de acceso          | Pantalla de privacidad               | Datos mínimos                                | Sesión, autor y contexto              | API y UI                                                     | Privacidad                                | Pendiente              | Revisión humana/institucional      | Parcial                                      | Alta   | Responsables y política         | Ratificar textos, conservación y canal                |
| [RNF-050](../requirements/ERS_CATALOG.md#rnf-050) | Accesibilidad                        | —                            | Roles, etiquetas y feedback          | —                                            | —                                     | Playwright y revisión visual                                 | Navegación con roles                      | Pendiente              | Dispositivos                       | Parcial                                      | Media  | Auditoría WCAG                  | Lector de pantalla y ensayo integral                  |

## Integraciones y aceptación

| Dependencia                           | Estado                                             | Evidencia para liberar                                    |
| ------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| Acreditación oficial de matrícula USC | Bloqueada por acceso a fuente legítima             | Verificación de estudiante vigente real y revocaciones    |
| Licencia y SOAT                       | Autogestión y vigencia internas                    | Acreditación mediante operador autorizado                 |
| SMTP                                  | Contrato probado con fixture                       | Entrega, recuperación y operación bajo dominio autorizado |
| Cartografía                           | Adaptadores configurables, errores explícitos      | Acuerdos, cobertura, cuotas y servicio sostenido          |
| Embarques USC                         | Catálogo y puntos textuales                        | Coordenadas verificadas y revisión operativa              |
| Push                                  | Pendiente                                          | Operador, privacidad y validación con dispositivos        |
| Canal institucional de incidencias    | Pendiente                                          | Responsable, autorización, conservación y canal operativo |
| Expo Go físico                        | Bloqueado por dispositivo y ruta LAN del anfitrión | [Guía QA](../development/MOBILE_TESTING.md)               |

## Regresión y recorridos

| Comprobación                   | Resultado                                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Línea base `f7013ea`           | 199/199 Jest en 31 suites. Chromium 9/10 en primera pasada y 1/1 en la repetición del recorrido móvil que agotó el tiempo.                                                                   |
| Regresión del corte            | 203/203 Jest en 32 suites, incluido PostgreSQL real. El corredor usó margen de 30 s para la VM.                                                                                              |
| Frontera económica y seguridad | Publicación, condiciones estables, costo cero e inválidos, privacidad, concurrencia, retiro, ausencia, QR manual, declaración/reconocimiento, historial, contactos, incidencias y caducidad. |
| Smoke                          | 6/6, contra la copia PostgreSQL restaurada, con login normal, cuenta vencida, sesión y revocación.                                                                                           |
| Migraciones y restauración     | 21/21 checksums y 340 restricciones validadas, conteos y relaciones idénticos. Registros postviaje y aviso leído recuperados a través de Nest.                                               |
| Navegación web del corte       | 10/10 en Chromium, cinco de escritorio y cinco de móvil web. Incluye publicación con aporte, métodos, alta de contacto, seguridad y persistencia de incidencia.                              |
| Exportaciones y Expo Doctor    | NestJS, Expo Web, exportaciones Android/iOS y Expo Doctor 18/18 aprobados. La copia de trabajo pasó install, validate/generate, typecheck y ESLint.                                          |
| Auditoría npm                  | 38 entradas generales y 16 con `--omit=dev`. Cuatro altas y cero críticas en ambos casos. PostCSS y Effect corregidos.                                                                       |
| Expo Go físico                 | Pendiente por dispositivo y conectividad de anfitrión a confirmar. NAT de VirtualBox observado. Nest y Metro respondieron desde la IP del invitado con una base exclusiva.                   |

El recorrido complementario en Chromium registró 27 comprobaciones de pantalla
y estado entre escritorio y tamaño móvil, con cero errores JavaScript.
Incluyó el registro de compensación reconocida, la estimación privada, el
historial del autor, chat y seguridad. Se confirmó el aviso leído tras
reiniciar Nest con la fuente sintética. La bandeja mostró el error de
conectividad ante una interrupción controlada y recuperó sus datos al volver
la conexión. Se revisaron visualmente las capturas del registro económico y
seguridad. El onboarding se cubrió en Playwright.

### Recorridos y límites de la evidencia

- **A, pasajero.** Nest y sus pruebas ejercitan cuenta, verificación, preferencias,
  feed, confirmación, comunicación, abordaje, nota y compensación. La acreditación
  desde la USC sigue pendiente, por lo que la transición de una cuenta recién
  registrada a estudiante real se comprueba por partes con fixtures autorizados.
- **B, conductor.** Cuenta elegible y vehículo del fixture publican. Se prueban
  condiciones económicas, propuesta, eventos de avance, QR, posición, cierre y
  reputación. Los proveedores de ruta y GPS se controlan donde aplica.
- **C, grupo.** Invitación, consentimiento, confirmación atómica, chat,
  abordaje, retiro individual e historial se cubren con HTTP real, navegador y
  los datos del ensayo de restauración.
- **D, seguridad.** Contactos, incidente privado, caducidad de posición y fin
  de seguimiento se ejercitan con datos sintéticos. La apertura real del
  marcador, cámara y ubicación física requiere un teléfono.
- **E, concurrencia.** Confirmación individual y grupal compiten por las
  últimas plazas bajo locks PostgreSQL. Declaraciones de compensación
  incompatibles dejan un único registro.
- **F, errores.** Proveedor no configurado, revocación, vigencia vencida,
  invitación expirada, reutilización del pase y cancelación tienen casos
  negativos. La conectividad física queda en QA.

El primer seed usó configuración local con proveedor oficial por defecto y rechazó fixtures.
Se repitió con el proveedor aislado correcto. Un intento posterior agotó la
transacción al calcular scrypt y motivó mover el cálculo fuera del lock.
Los fallos de las restricciones antiguas de avisos y propuestas se corrigieron
con migraciones aditivas. El override incompatible de image-size se retiró.
Las advertencias de deprecación de `pg` permanecen registradas.

La evidencia privada está en `RuTeam-cierre-evidencia`, junto al worktree.
Incluye reportes de pruebas, capturas web, diagramas, exportaciones y respaldo.
Jest y Chromium usaron tolerancias del runner de 30 y 120 segundos en la VM.
Se mantuvieron los límites y las comprobaciones de la aplicación.

El informe del respaldo se encuentra en [ensayo actual](POSTGRESQL_RESTORE_DRILL.md).
La entrega académica se somete a revisión humana con la evidencia disponible.
El estado de producción permanece bloqueado por las dependencias anteriores.

## Continuidad funcional del 26/11/2026

La copia de cierre quedó en la rama local `task/release-readiness`, HEAD `f7013ea`. La rama original se conserva en `sergio` con `5af65f2`. El trabajo de continuidad añade tres migraciones e integra las pantallas con el backend y la persistencia existentes.

- [Endpoints y contratos](../development/API.md#endpoints-de-continuidad)
- [Modelos, índices y migraciones](../architecture/DATA_MODEL.md#migraciones-de-continuidad-del-26112026)
- [Permisos](../architecture/AUTHORIZATION_MATRIX.md#permisos-de-continuidad)
- [Relación de requisitos](../requirements/TRACEABILITY.md#continuidad-de-producto-del-26112026)
- [Relevos por incremento](../handoffs/README.md#continuidad-del-producto)

### Mensajes propuestos para continuidad

- `feat(trips): generate and manage recurring publications`
- `feat(auth): support account closure and recovery`
- `feat(mobility): expose personal travel statistics`
- `feat(expenses): expose private economic history`
- `feat(safety): support safe interruption and private incident export`
- `feat(client): integrate map location and product navigation`
- `test(release): verify and document product continuation`

## Validación de continuidad

Evidencia de esta fase en el [relevo de validación](../handoffs/2026-11-26_release-readiness_validacion_continuidad.md). El registro conserva aparte los resultados históricos del cierre anterior. La prueba en dispositivos físicos y las dependencias institucionales siguen pendientes.

## Evolución ambiental y comunicación

El corte integra estimaciones RF-019, actualizaciones SSE, viaje activo y resumen por rol, agenda y actividades, reutilización de publicaciones y preferencias. El entorno de prueba aplica 27 migraciones. Las credenciales de push con recepción física y otros proveedores institucionales quedan como dependencias externas.

- [Fuentes y fórmulas](../development/ENVIRONMENTAL_METHOD.md)
- [Eventos y autorización](../development/REALTIME.md)
- [Preferencias, dispositivos y recibos](../development/NOTIFICATION_SETTINGS.md)
- [Endpoints](../development/API.md#endpoints-de-evolución-ambiental-y-comunicación)
- [Evidencia y relevos](../handoffs/README.md#evolución-ambiental-y-comunicación)

## Operación y movilidad cotidiana del 27/11/2026

La revisión de `task/trip-operations` se realiza sobre las cuatro migraciones
aditivas y los contratos del incremento. La validación local aprobó 224 casos
Jest, 18 casos Playwright, 6 comprobaciones de smoke y 18 de Expo Doctor. Ver
los resultados por comando y el alcance de cada prueba en el
[handoff de integración](../handoffs/2026-11-27_trip-operations_integracion.md).

Quedan pendientes revisión cruzada de módulos y prueba física de Expo Go.
Push remoto requiere un development build autorizado, dispositivo físico y
credenciales del proyecto. La vigencia institucional oficial, verificación
documental externa, atención institucional de incidencias, pagos, sanciones,
restricciones de género y eliminación irreversible conservan sus decisiones
pendientes.

## Integración de producto del 27/11/2026

El corte académico usa dominio USC declarado. El modo oficial queda sujeto a
la fuente acreditada. Se reprodujeron pruebas PostgreSQL y consultas públicas
a Photon, OSRM y OSM en Cali. Consultar [evidencia de integración](../handoffs/2026-11-27_trip-operations_integracion-producto.md).
GPS físico y recepción push requieren teléfono y configuración autorizada.
