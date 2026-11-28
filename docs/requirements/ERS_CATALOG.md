# Catálogo ERS: interpretación vigente y fuente histórica

Actualización 26/11/2026. [PRODUCT_DEFINITION](PRODUCT_DEFINITION.md) prevalece sobre
criterios literales incompatibles. Se conservan RF-001..030/RNF-031..050, títulos,
prioridades e información histórica de la fuente abajo. No se reescribe el original
ni se acredita aprobación académica por esta anotación. RF-001 sin prioridad unívoca.

| ID oficial / extensión existente        | Interpretación vigente y edición pendiente del original                                                                                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-001/002/016; RQ-ACC-01               | El acceso académico utiliza el dominio exacto @usc.edu.co declarado con contraseña propia. Dominio, titularidad del buzón y matrícula son datos independientes. El modo oficial exige su fuente de acreditación.                    |
| RF-003/004/029; RQ-RUTA-01              | Dos modalidades con USC en un extremo institucional; conductor elige recorrido/condiciones, encuentro interior libre sin GPS propio, ubicaciones externas genéricas. No externo→externo aunque USC intermedia                       |
| RF-005/018; RQ-RUTA-01                  | Descubrimiento de viajes existentes por modalidad/horario/texto/paradas/proximidad según calidad de datos; sin solicitudes de transporte ni itinerario recalculado. UI sin coordenadas técnicas y sin inventar precisión geográfica |
| RF-006                                  | Sustituir Solicitar→aceptación por confirmación directa; cupos transaccionales en ese momento. Conductor consulta confirmados. Notificaciones, si existen, no son autorización ordinaria                                            |
| RF-007/012/015                          | Retiro futuro permitido libera plazas y conserva historial; lleno≠iniciado. Estados/actores explícitos, cambios esenciales no silenciosos; contradicción de penalidad sin resolver, ningún cobro automático                         |
| RF-013/024/022                          | Vehículos autogestionados y elegibilidad sin revisión ADMIN; conservar titularidad/capacidad/casco/licencia/SOAT y diferenciar declaración de verificación autorizada                                                               |
| RF-017                                  | Retirado del alcance funcional vigente por decisión explícita; conservar ID/historia. No panel/login/permisos/endpoints ni métricas administrativas como producto                                                                   |
| RQ-GRUPO-01 y RF-006                    | Grupos con identidad/consentimiento explícito, invitaciones temporales y lote atómico; no UUID público como código ni plazas retenidas indefinidamente. Individual seguro prioritario mientras falte mecanismo                      |
| Propuesta HACIA_USC                     | Nueva regla RN-PARADA-01, no inventar RF/HU oficial. Entidad separada, decide propietario, no cambia geometría ni confirma/consume plazas                                                                                           |
| RF-027                                  | Abordaje separado de participación, sólo confirmada y sin segunda plaza; QR interno seguro no acredita carné institucional                                                                                                          |
| RF-014/010/008/009/011/028/030          | Conservar objetivos compatibles de chat, ratings, economía y seguridad con participantes reales y privacidad. Retirar destinatario ADMIN; soporte legítimo pendiente. Sin pagos/multas/SOS ficticios                                |
| RNF-038/039/040/041/045/046/048/049/050 | Sesión/PII/consentimiento, rate limiting, historial, MVC/contratos y UX compartida siguen aplicando. Sin cuenta administrativa, sin secretos públicos, sin cobertura RNF inferida de tests                                          |

La consolidación del 26/11/2026 resolvió que RF-010 admite enteros de 1 a 5
y calcula la media aritmética por capacidad. Género/moto/exclusividad, fórmula
económica, penalidades y excepciones de plataforma siguen en OPEN_DECISIONS.
La rúbrica no se modifica unilateralmente. Ver
[edición académica precisa](ACADEMIC_REDEFINITION_CHANGES.md),
[trazabilidad actual](TRACEABILITY.md) y [UML](UML_CROSSWALK.md).
La correspondencia documental no acredita implementación ni porcentaje funcional.

## Transcripción/cotejo histórico del 13/11/2026

Todo el bloque siguiente preserva el texto de la fuente y sus divergencias en ese corte;
expresiones como ADMIN, docente/trabajador o aceptación ordinaria no son reglas vigentes.

# Catálogo de requisitos cotejado (derivado sin PII)

Cotejo: 2026-11-13, America/Bogota. Fuente privada ERS_RuTeam.doc, extraída íntegramente
con antiword0.37-17 en /tmp. Se conservan aquí los títulos y criterios del cuerpo de los
50 requisitos; saltos de línea/espaciado normalizados, sin reinterpretar desigualdades.
La prioridad procede de la matriz final, no de las tres alternativas impresas en cada ficha.
RF-001 falta en esa matriz: prioridad no unívoca. Las reglas incompatibles con las decisiones
explícitas del equipo se documentan como divergencias, no se activan automáticamente.
La fuente puede contener errores, no implica autorización institucional o normativa vigente.

Hash SHA256 ERS: d32bff7bfe9e7136322d1cbbf0a1541bcb3118d9017f9d822832a6de0a05c728.
La fecha de ficha de la ERS dice14/11/2026; se registra como dato de fuente, no fecha de esta sesión.
No se versionan originales, ficha de autores ni contactos. Política de prioridad y decisiones
abiertas: OPEN_DECISIONS. La sincronización documental no es cobertura funcional.

<a id="rf-001"></a>

## RF-001 — Autenticación por correo institucional

Sección: 3.2.1. Prioridad literal de matriz: **No unívoca: falta en matriz**.

- Comprobación de validez: El campo email debe terminar en @usc.edu.co. Contraseña > 8 caracteres.
- Secuencia exacta: Ingreso datos → Backend valida formato → Consulta BD → Compara Hash → Genera JWT.
- Situaciones anormales: Si el dominio no es valido, retorna Error 400. Si la BD no responde retorna Error 500.
- Parámetros: email (String), password (String).
- Generación de salidas: Token JTW y objeto JSON de usuario.
- Relaciones entradas/salidas: Credenciales validas → Hashing y match → Token de sesión.
- BD: Users: user_id (PK, Int, Auto Incremental), email (Varchar), password (Varchar, Required).

<a id="rf-002"></a>

## RF-002 — Gestión de perfiles de usuario

Sección: 3.2.2. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: Foto (JPG, PNG < 3MB), Estamento (estudiante, docente o trabajador), Rol (conductor o pasajero)
- Secuencia exacta: Envío de formulario multi-part → Subida de foto → Update en BD.
- Situaciones anormales: Archivo excede tamaño → aborta y notifica al usuario.
- Parámetros: photo (File), statement (Int), role (String).
- Generación de salidas: URL de la foto y confirmación HTTP 200.
- Relaciones entradas/salidas: Archivo de imagen → Compresión → Enlace público.
- BD: Profiles: profile_id (PK, Int, Auto Incremental) user_id (FK, Int), photo_url (Varchar), statement (Varchar), role (Varchar).

<a id="rf-003"></a>

## RF-003 — Publicación de trayectos

Sección: 3.2.3. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: (Hora salida – 30 minutos) > Hora actual, Cupos (1-4 dependiendo del vehículo), Coordenadas validas.
- Secuencia exacta: Selección origen y destino en el mapa → Selección vehículo a utilizar (debe estar previamente registrado) → Seleccionar cupos (máximo 1 para motocicleta y 4 para automóvil) → Seleccionar hora de salida → Ingreso de datos al sistema → Cruzar los datos → Validar las restricciones → guarda el trayecto en estado “Active”
- Situaciones anormales: Cruce de horario con otro viaje del conductor → Rechazo
- Parámetros: origin (Lat/Lng), destination (Lat/Lng), hour (Datetime) , cupos (Int), available_seats (Int)
- Generación de salidas: Id del viaje y confirmación.
- Relaciones entradas/salidas: Coordenadas → polilínea del mapa → renderizado de ruta.
- BD: Trips: trip_id (PK, Int, Auto Incremental) , origin (Point) , destination (Point), trip_status(Enum: Pending, In progress, Canceled, Finished)

<a id="rf-004"></a>

## RF-004 — Configuracion de reglas de viaje

Sección: 3.2.4. Prioridad literal de matriz: **Media/Deseado**.

- Comprobación de validez: Los ID de las reglas deben existir en un catálogo base.
- Secuencia exacta: Selección de los checkbox → Envío de arrays → Insert tabla pivote.
- Situaciones anormales: Array vacio → Inserta regla “Por defecto”.
- Parámetros: trip_id (FK, Int), trip_rules(Array[Int]).
- Generación de salidas: Tags en el UI del viaje.
- Relaciones entradas/salidas: Arrays IDs → Consulta catálogo → Descripciones de texto.
- BD: Trip_rules (Tabla pivote con FKs a Trips y catalogo)

<a id="rf-005"></a>

## RF-005 — Búsqueda y filtrado de viajes

Sección: 3.2.5. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: 4km > Radio de búsqueda > 0km.
- Secuencia exacta: envío de coordenadas → Backend aplica Haversine [15] → Filtro cupos > 1 → Retorno JSON ordenado.
- Situaciones anormales: Cero coincidencias → Retorna array vacío.
- Parámetros: destination (Point), radius (Float).
- Generación de salidas: Lista JSON de viajes.
- Relaciones entradas/salidas: Destino → Calculo de distancia geométrica → Lista ordenada
- BD: Lectura de la tabla “Trips”.

<a id="rf-006"></a>

## RF-006 — Solicitud de cupo bidireccional

Sección: 3.2.6. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: El viaje debe tener available_seats > 0 y estar “Active”.
- Secuencia exacta: Tap en “Solicitar” → Notificacion push a conductor → Conductor acepta o rechaza → Update available_seats.
- Situaciones anormales: Dos pasajeros solicitan el ultimo cupo al mismo tiempo → Bloqueo optimista (el primero en llegar lo toma, el segundo recibe error de “cupo agotado”).
- Parámetros: trip_id(Int), passenger_id(Int)
- Generación de salidas: Notificacion de estado (Aceptado/Rechazado) vía WebSockets [16].
- Relaciones entradas/salidas: Aceptación → avaliable_seats – 1.
- BD: Seats_reservations: state (Enum: Pendiente, Aceptada, Rechazada).

<a id="rf-007"></a>

## RF-007 — Políticas de penalización por cancelación

Sección: 3.2.7. Prioridad literal de matriz: **Media/Deseado**.

- Comprobación de validez: Tiempo restante para el viaje > 30 minutos.
- Secuencia exacta: Usuario cancela → Backend calcula la diferencia de tiempo → Si (Tiempo restante para el viaje > 30 minutos = True) , registra saldo negativo (penalización por cancelación).
- Situaciones anormales: Cancelación por fuerza mayor [RF-028] exime la lógica.
- Parámetros: seat_reservation_id (Int), timestamp_cancelation (DateTime).
- Generación de salidas: Registro de penalidad, alerta al usuario.
- Relaciones entradas/salidas: Delta tiempo < 30 → Generacion de deuda en “wallets”.
- BD: Wallets: debt(Float).

La [decisión económica](../development/COMPENSACIONES_COP.md) del 26/11/2026
preserva las fichas RF-008 y RF-009 siguientes como fuente histórica. El producto
usa gastos enteros, participación del conductor, condiciones publicadas y
declaraciones personales. [Definición vigente](PRODUCT_DEFINITION.md).

<a id="rf-008"></a>

## RF-008 — Cálculo de división de costos

Sección: 3.2.8. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: Distancia calculada debe ser > 0 km.
- Secuencia exacta: Al crear viaje, API retorna KM totales → Se multiplica por base_rate → Se divide entre cupos ofertados.
- Situaciones anormales: Falla en calculo de ruta → Aplica tarifa plana por defecto.
- Parámetros: km_totals (float), avaliable_seats (Int).
- Generación de salidas: String con precio sugerido (ej. $5.000 COP).
- Relaciones entradas/salidas: Formula (km × gas_factor) ÷ avaliable_seats.
- BD: Trips: suggested_contribution (Float).

<a id="rf-009"></a>

## RF-009 — Métodos de compensación integrados

Sección: 3.2.9. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: Selección válida de Nequi, DaviPlata o Efectivo.
- Secuencia exacta: Conductor añade 1 o 2 medios de pago (ej. Nequi y/o efectivo) → Pasajero ve medio de pago.
- Situaciones anormales: Pasajero no cuenta con ninguno de los medios de pagos ofrecidos por el conductor → Pasajero cancela viaje.
- Parámetros: metodo_pago (Array[String]).
- Generación de salidas: String con medios de pago ofrecidos por el conductor.
- Relaciones entradas/salidas: Confirmación de viaje.
- BD: Trips: payment_method (String)

<a id="rf-010"></a>

## RF-010 — Sistema de calificaciones

Sección: 3.2.10. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: 5 > Valor estrella > 1
- Secuencia exacta: Fin de viaje → Usuario califica (Conductor califica a pasajero y pasajero califica conductor) → Calculo promedio de calificaciones (BD).
- Situaciones anormales: Cierre forzoso de la app → El modulo de calificaciones aparece en el siguiente inicio de sesión.
- Parámetros: evaluated_id(Int), stars(Int), comment(String)
- Generación de salidas: Nuevo promedio de calificaciones en el perfil.
- Relaciones entradas/salidas: Formula (average_reviews + stars) ÷ total_reviews.
- BD: Ratings: stars (Int), comment(String).

La aplicación vigente de RF-011 usa contactos propios, acciones nativas
confirmadas y registros de incidencia de autor. La ficha siguiente conserva la
secuencia del original. [Definición vigente](PRODUCT_DEFINITION.md#seguridad-y-módulos-complementarios).

<a id="rf-011"></a>

## RF-011 — Botón de pánico y seguridad

Sección: 3.2.11. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: El trip_status debe estar “In progress”.
- Secuencia exacta: Presión prolongada por 3 segundos → Envía el viaje al contacto de emergencia vía WhatsApp API.
- Situaciones anormales: Sin internet → Envía SMS nativo vía API de Android/iOS.
- Parámetros: gps_actual (Point), emergency_contact (String)
- Generación de salidas: Mensaje SOS externo.
- Relaciones entradas/salidas: Tap → Generación URL wa.me o sms.
- BD: Emergency_contacts: tel (Varchar, required)

<a id="rf-012"></a>

## RF-012 — Historial de viajes

Sección: 3.2.12. Prioridad literal de matriz: **Media/Deseado**.

- Comprobación de validez: El campo “user_id” debe ser un id válido y corresponder al token de sesión activo.
- Secuencia exacta: El cliente envía solicitud GET a la API → Backend valida la sesión → Se consultan los registros en BD asociados al usuario en estados “completed” o “cancelled” → Se estructura la respuesta paginada y se envía al cliente.
- Situaciones anormales: Si el usuario no tiene viajes registrados, se retorna código HTTP 200 con un array vacío. Si falla la BD, se retorna Error 500.
- Parámetros: user_id (Int), page (Int), limit (Int). Generación de salidas: Objeto JSON conteniendo un array de viajes (origen, destino, fecha, tarifa, estado).
- Relaciones entradas/salidas: Entrada: user_id → Consulta SELECT → Salida: Lista de viajes.
- BD: Lectura en tabla “Trips”. Relación con tabla “Profiles” para obtener nombres de los acompañantes.

<a id="rf-013"></a>

## RF-013 — Gestión de vehículos registrados

Sección: 3.2.13. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: La placa (“license_plate”) debe cumplir expresión regular de formato colombiano (AAA123 o AAA12C). Modelo > 1990. Color seleccionado de catálogo.
- Secuencia exacta: Conductor ingresa datos del vehículo → Frontend valida regex de la placa → Backend verifica que la placa no esté registrada por otro usuario activo → Inserción en base de datos → Vehículo disponible para publicar viajes.
- Situaciones anormales: Si la placa ya existe, retorna HTTP 409 Conflict. Si faltan datos, HTTP 400 Bad Request.
- Parámetros: driver_id (Id), license_plate (String), brand (String), model_year (Int), color (String), vehicle_type (Enum: Car/Motorcycle).\
- Generación de salidas: Confirmación de registro exitoso y objeto del vehículo creado.
- Relaciones entradas/salidas: Datos del formulario → Validación de unicidad → Registro en BD asociado al conductor.
- BD: Tabla “Vehicles”. Campos: id (PK), driver_id (FK), license_plate (Varchar, UNIQUE), brand, model_year, color, vehicle_type.

<a id="rf-014"></a>

## RF-014 — Chat interno integrado

Sección: 3.2.14. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: Ambos usuarios (conductor y pasajero) deben estar asignados al mismo “trip_id”. El viaje debe estar en estado “scheduled” o “in_progress”.
- Secuencia exacta: Usuario abre el chat del viaje → Se establece conexión WebSocket (WSS) → Mensaje enviado se almacena temporalmente en caché/BD → Broadcast del mensaje al destinatario conectado. Situaciones anormales: Si el socket se desconecta, intentar reconexión exponencial. Si el viaje finaliza, deshabilitar el input de texto en el frontend (solo lectura).
- Parámetros: trip_id (Id), sender_id (Id), receiver_id (Id), message_content (Text).
- Generación de salidas: Notificación push si la app está en background y actualización del UI en tiempo real.
- Relaciones entradas/salidas: Payload de mensaje → Enrutamiento WSS → Renderizado en pantalla del destinatario.
- BD: Colección NoSQL o tabla temporal en SQL “ChatMessages” para almacenar el historial de mensajes por viaje hasta 24h después de finalizado.

<a id="rf-015"></a>

## RF-015 — Monitoreo de estado del viaje

Sección: 3.2.15. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: La transición de estados debe seguir un flujo lineal estricto: scheduled → in_progress → completed. cancelled puede ocurrir desde scheduled.
- Secuencia exacta: Conductor presiona “Iniciar Viaje” → Backend valida estado actual “scheduled” → Actualiza estado a “in_progress” → Dispara notificaciones a los pasajeros confirmados.
- Situaciones anormales: Intento de pasar de “completed” a “in_progress” arrojará error de máquina de estados (HTTP 400).
- Parámetros: trip_id (Id), new_status (String), driver_id (Id).
- Generación de salidas: Objeto del viaje actualizado y eventos SSE/WSS para actualizar la interfaz de los pasajeros.
- Relaciones entradas/salidas: Comando de cambio (Entrada) → Validación de regla de negocio → Estado mutado en BD (Salida).
- BD: Actualización (UPDATE) en el campo “status” de la tabla “Trips”. Se registra timestamp del cambio en log de auditoría.

<a id="rf-016"></a>

## RF-016 — Recuperación de contraseñas

Sección: 3.2.16. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: El correo ingresado debe poseer dominio “@usc.edu.co” y existir en la tabla “Users”.
- Secuencia exacta: Usuario solicita restablecimiento → Backend genera token temporal de 6 cifras o JWT → Servicio de correo envía el token → Usuario ingresa token y nueva clave → Backend encripta nueva clave y actualiza.
- Situaciones anormales: Si el correo no existe, retornar mensaje genérico “Si el correo existe, recibirá instrucciones”.
- Parámetros: email (String), recovery_token (String), new_password (String).
- Generación de salidas: Correo electrónico de confirmación de cambio exitoso.
- Relaciones entradas/salidas: Solicitud → Generación Token OTP → Validación → Hashing → Modificación de acceso.
- BD: Tabla “Users”. Se sobrescribe “password_hash”. Tabla temporal “RecoveryTokens”.

<a id="rf-017"></a>

## RF-017 — Módulo de administración

Sección: 3.2.17. Prioridad literal de matriz: **Media/Deseado**.

- Comprobación de validez: El usuario que realiza la petición debe poseer el rol “admin” (Validación de Claims del JWT).
- Secuencia exacta: Admin ingresa al panel → Frontend solicita métricas al backend → Backend ejecuta queries de agregación (COUNT, GROUP BY) → Frontend renderiza gráficos.
- Situaciones anormales: Intento de acceso por rol no autorizado lanza HTTP 403 Forbidden.
- Parámetros: admin_token (JWT), date_range (DateRange).
- Generación de salidas: Dashboard con KPIs: usuarios activos, viajes completados, reportes pendientes.
- Relaciones entradas/salidas: Petición autorizada → Consultas de agregación → JSON estructurado para gráficos.
- BD: Lectura sobre tablas “Trips”, “Users”, “SupportTickets” sin bloqueo transaccional.

<a id="rf-018"></a>

## RF-018 — Geolocalización en mapa interactivo

Sección: 3.2.18. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: Las coordenadas ingresadas no pueden ser nulas y deben restringirse al perímetro urbano de Cali y zonas aledañas (ej. Palmira, Yumbo, Candelaria, Jamundí, etc.).
- Secuencia exacta: App captura ubicación GPS del dispositivo → Llama API de Google Maps/Mapbox → Convierte Lat/Lng en dirección legible → Dibuja polilínea hacia destino.
- Situaciones anormales: Si GPS está desactivado, solicitar permisos. Si falla API externa, permitir ingreso de dirección manual.
- Parámetros: origin_lat (Float), origin_lng (Float), dest_lat (Float), dest_lng (Float).
- Generación de salidas: Mapa renderizado con marcadores de inicio, fin y ruta sugerida.
- Relaciones entradas/salidas: Coordenadas (Entrada) → Servicio cartográfico → Elementos UI del mapa (Salida).
- BD: Ninguna. Todo ocurre en memoria temporal y caché del cliente, excepto guardar coordenadas finales en “Trips”.

<a id="rf-019"></a>

## RF-019 — Calculadora de huella de carbono

Sección: 3.2.19. Prioridad literal de matriz: **Sin definir**.

- Comprobación de validez: La distancia del viaje calculada debe ser mayor a 0 km.
- Secuencia exacta: Al finalizar viaje, backend toma la distancia de la ruta → Aplica factor: (Distancia × Factor Emision Vehiculo) × (Pasajeros - 1) → Actualiza el acumulado de ahorro del usuario.
- Situaciones anormales: Errores de cálculo matemático (ej. distancia negativa por fallo de API) se asumen como ahorro 0 para ese viaje.
- Parámetros: trip_id (Id), distance_km (Float), passenger_count (Int).
- Generación de salidas: Actualización del widget “CO2 Ahorrado” en el perfil del usuario.
- Relaciones entradas/salidas: Datos del viaje → Fórmula matemática ambiental → Dato estadístico gamificado.
- BD: Actualización del campo “total_co2_saved” en tabla “Profiles”.

<a id="rf-020"></a>

## RF-020 — Eliminación de cuenta (Derecho al olvido)

Sección: 3.2.20. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: El usuario no debe tener viajes activos en curso ni saldos pendientes (deudas) en la plataforma.
- Secuencia exacta: Usuario solicita baja de cuenta en configuraciones → Backend verifica deudas/viajes pendientes → Procede con Soft Delete (inactivar) u ofuscación de datos personales PII → Cierra sesión.
- Situaciones anormales: Si hay viajes pendientes, retorna Error 409 y notifica que debe cancelar compromisos primero.
- Parámetros: user_id (Id), deletion_reason (String, opcional).
- Generación de salidas: Pantalla de confirmación de eliminación y redirección al login.
- Relaciones entradas/salidas: Solicitud → Validación de dependencias → Anonimización/Borrado lógico → Sesión terminada.
- BD: Tabla “Users”: set “account_status” = “inactive”, hash de PII.

<a id="rf-021"></a>

## RF-021 — Validación de género para trayectos en motocicleta

Sección: 3.2.21. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: Requiere identificar que “vehicle_type” = “motorcycle” en el viaje y leer el “gender” del pasajero.
- Secuencia exacta: Conductor de moto publica viaje → Pasajero intenta reservar → Backend valida género del pasajero desde su perfil → Si el pasajero es hombre, bloquea reserva.
- Situaciones anormales: Si el género no está definido, se fuerza a completar el perfil antes de reservar.
- Parámetros: passenger_id (Id), trip_id (Id).
- Generación de salidas: Aceptación de cupo (si es mujer) o alerta de restricción normativa local (si es hombre).
- Relaciones entradas/salidas: Regla de negocio sobre atributo (Género) → Filtro condicional excluyente.
- BD: Consulta lectura al campo “gender” en la tabla “Profiles” y “vehicle_type” en tabla “Vehicles” unida con “Trips”.

<a id="rf-022"></a>

## RF-022 — Gestión de implementos de seguridad (Casco)

Sección: 3.2.22. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: Campo booleano obligatorio si el vehículo publicado es “motorcycle”.
- Secuencia exacta: Interfaz de publicación de moto pregunta: “¿Cuentas con casco extra?” → Conductor selecciona Sí/No → Se añade atributo a las reglas del viaje → Pasajero visualiza el icono correspondiente en el feed.
- Situaciones anormales: Paso transparente si el vehículo es “car”.
- Parámetros: provides_helmet (Boolean).
- Generación de salidas: Tag visual en la publicación indicando “Casco incluido” o “Trae tu propio casco”.
- Relaciones entradas/salidas: Selección booleana → Etiquetado del viaje.
- BD: Campo booleano “provides_helmet” en tabla “Trips” (Nullable, requiere valor solo para motos).

<a id="rf-023"></a>

## RF-023 — Gestión de rutas recurrentes

Sección: 3.2.23. Prioridad literal de matriz: **Media/Deseado**.

- Comprobación de validez: Días seleccionados (ej. Lu-Mi-Vi) y horas dentro del rango de operación (5am-10pm).
- Secuencia exacta: Conductor selecciona origen, destino, y marca “Hacer recurrente” → Selecciona días → Backend agenda job (Cron/RabbitMQ) para publicar copias del viaje automáticamente 24h antes del inicio de cada instancia.
- Situaciones anormales: Si hay festivo (según API externa) el sistema puede consultar al conductor si mantiene la recurrencia.
- Parámetros: week_days (Array[Int]), recurring_time (Time), origin_coord (Point), dest_coord (Point).
- Generación de salidas: Viajes futuros auto-generados en el listado del conductor.
- Relaciones entradas/salidas: Plantilla de viaje → Multiplicador cronológico → Múltiples viajes generados.
- BD: Tabla “RecurringRoutes” con plantilla de datos y tabla “Trips” para las instancias materializadas.

<a id="rf-024"></a>

## RF-024 — Verificación de documentos vehiculares (SOAT)

Sección: 3.2.24. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: Archivo cargado en formato JPG/PDF (Max 5MB). La fecha de expiración ingresada debe ser futura.
- Secuencia exacta: Conductor registra vehículo → Sube imagen SOAT e ingresa fecha vigencia → Estado del vehículo queda “pending_validation” → Admin revisa y aprueba.
- Situaciones anormales: Si SOAT caduca, el sistema cambia automáticamente estado del vehículo a “suspended” y bloquea publicación de viajes.
- Parámetros: soat_file_url (String), soat_expiration_date (Date).
- Generación de salidas: Notificación “Vehículo habilitado para operar”.
- Relaciones entradas/salidas: Archivo documental → Aprobación humana/algorítmica → Estado operativo habilitado.
- BD: Actualización de campo “soat_expiration_date” y “verification_status” en tabla “Vehicles”.

<a id="rf-025"></a>

## RF-025 — Filtro de viajes exclusivo para mujeres

Sección: 3.2.25. Prioridad literal de matriz: **Media/Deseado**.

- Comprobación de validez: El perfil del conductor que habilita la opción debe poseer “gender” = “female”.
- Secuencia exacta: Conductora marca checkbox “Exclusivo Mujeres” → Viaje publicado con tag especial → Motor de búsqueda restringe visibilidad: si el buscador (pasajero) es masculino, el query excluye estos viajes.
- Situaciones anormales: Hombres modificando la petición HTTP para ver los viajes obtendrán error 403 si intentan apartar cupo.
- Parámetros: women_only (Boolean), passenger_id (Id).
- Generación de salidas: Feed de viajes depurado según género y preferencias de seguridad.
- Relaciones entradas/salidas: Bandera de seguridad → Intersección con género del cliente → Filtrado de feed.
- BD: Campo “women_only” (Booleano) en la tabla “Trips”.

<a id="rf-026"></a>

## RF-026 — Billetera Virtual Integrada (Wallet)

Sección: 3.2.26. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: Montos de recarga mayores a 5,000 COP. Saldo no puede ser negativo.
- Secuencia exacta: Usuario entra a Wallet → “Recargar” → Redirección a pasarela de pagos (ej. Nequi) → Pasarela retorna webhook de confirmación → Backend abona saldo a la cuenta.
- Situaciones anormales: Transacción rechazada por banco: se notifica al usuario y no se altera el saldo.
- Parámetros: user_id (Id), amount (Float), payment_method (String).
- Generación de salidas: Saldo actualizado en el UI y generación de recibo digital.
- Relaciones entradas/salidas: Webhook de pasarela de pago → Verificación de firma/Token → Incremento de Wallet interna.
- BD: Tabla “Wallets” (id, user_id, current_balance). Tabla “Transactions” para el log inmutable.

<a id="rf-027"></a>

## RF-027 — Validación de abordaje por Código QR

Sección: 3.2.27. Prioridad literal de matriz: **Media/Deseado**.

- Comprobación de validez: El string del QR debe ser un payload desencriptable por el backend (JWT o HMAC) conteniendo “trip_id” y “passenger_id”.
- Secuencia exacta: Pasajero abre su reserva, app genera código QR temporal → Conductor escanea QR con la app → Backend verifica que el pasajero pertenezca a ese viaje → Estado de la reserva cambia a “boarded”.
- Situaciones anormales: QR expirado o de otro viaje: Muestra alerta “Código inválido o no corresponde a este viaje”.
- Parámetros: qr_payload (String cifrado).
- Generación de salidas: Confirmación visual y sonora de abordaje exitoso para el conductor.
- Relaciones entradas/salidas: Código óptico cifrado → Validación criptográfica → Confirmación de presencia física.
- BD: Actualización estado de cupo en tabla “Bookings” (estado cambia a “boarded”).

<a id="rf-028"></a>

## RF-028 — Cancelación validada por soporte

Sección: 3.2.28. Prioridad literal de matriz: **Sin definir**.

- Comprobación de validez: El evento de cancelación debe ocurrir con menos de X horas de antelación para requerir evidencia.
- Secuencia exacta: Usuario cancela por fuerza mayor → Adjunta foto (ej. varada/accidente) → Sistema cobra penalidad provisional → Soporte aprueba evidencia → Sistema revierte la penalidad y restaura calificación.
- Situaciones anormales: Formatos de imagen no soportados o maliciosos son bloqueados en la subida.
- Parámetros: booking_id (Id), reason (Text), evidence_url (String).
- Generación de salidas: Ticket PQRS de cancelación generado, luego reembolso del saldo penalizado.
- Relaciones entradas/salidas: Evidencia documental → Intervención humana/Admin → Reversión de transacción automatizada.
- BD: Actualización de logs financieros en “Transactions” e inserción en tabla “SupportTickets”.

<a id="rf-029"></a>

## RF-029 — Integración de paraderos oficiales USC

Sección: 3.2.29. Prioridad literal de matriz: **Alta/Esencial**.

- Comprobación de validez: El punto seleccionado debe pertenecer a los perímetros de la universidad.
- Secuencia exacta: Al seleccionar “Destino”, el usuario puede pulsar un botón “Sedes USC” → Se despliega lista (Pampalinda, Centro, etc.) → Selecciona entrada específica → Coordenadas predefinidas se inyectan en el viaje.
- Situaciones anormales: Fuera del rango geográfico, sugerirá los paraderos, pero requerirá confirmación de que el usuario no pertenece al campus ese día.
- Parámetros: station_id (Int).
- Generación de salidas: Iconografía especial (Logo USC) en el mapa de destino y autocompletado de coordenadas exactas.
- Relaciones entradas/salidas: Selección de lista precargada → Inyección de lat/lng fijo exacto.
- BD: Catálogo estático “UscStations” (id, name, lat, lng).

<a id="rf-030"></a>

## RF-030 — Módulo de Peticiones, Quejas y Reclamos (PQRS)

Sección: 3.2.30. Prioridad literal de matriz: **Media/Deseado**.

- Comprobación de validez: El campo de texto no puede superar 500 caracteres, y debe existir una categoría seleccionada.
- Secuencia exacta: Usuario ingresa a Ayuda -> PQRS → Completa formulario → Backend genera Ticket ID único → Notifica a correos de soporte administrativo → Usuario hace seguimiento por ID.
- Situaciones anormales: Rate limiting previene creación masiva de spam (ej. máximo 3 tickets/día por usuario).
- Parámetros: user_id (Id), category_id (Int), description (Text), attachments (List[URL]).
- Generación de salidas: Número de radicado (Ticket ID) y confirmación de recepción.
- Relaciones entradas/salidas: Formulario de queja → Creación de ticket en sistema → Cola de atención de administradores.
- BD: Tabla “SupportTickets” (id, user_id, status, created_at, resolution).

<a id="rnf-031"></a>

## RNF-031 — Rendimiento en búsquedas

Sección: 3.3.1.1. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: El tiempo de respuesta al buscar coincidencias de viajes no debe superar los 1.5 segundos, soportando hasta 500 usuarios concurrentes haciendo consultas espaciales simultáneamente.
- Justificación: Métrica explícita exigida en la rúbrica del proyecto para garantizar fluidez.
- Métrica de validación: Pruebas de carga (ej. JMeter) evidenciando < 1.5s p95 bajo 500 hilos concurrentes.
- Dependencias tecnológicas: Índices espaciales (PostGIS / MongoDB 2dsphere), Caché en memoria (Redis).

<a id="rnf-032"></a>

## RNF-032 — Latencia de Notificaciones

Sección: 3.3.1.2. Prioridad literal de matriz: **Media/Deseado**.

- Descripción detallada: Las alertas push referentes a reservas o inicio de viaje deben ser entregadas al cliente en un máximo de 3 segundos.
- Justificación: Las decisiones de asignación de cupos deben tomarse en tiempo real.
- Métrica de validación: Logs de servidor y telemetría midiendo el delta de tiempo emisión- recepción (p90 < 3s).
- Dependencias tecnológicas: FCM) / APNs, WebSockets (WSS).

<a id="rnf-033"></a>

## RNF-033 — Precisión de geolocalización

Sección: 3.3.1.3. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: El margen de error del GPS integrado en la app no será superior a 15 metros de radio en condiciones ideales.
- Justificación: Esencial para coordinar puntos de recogida exactos.
- Métrica de validación: Pruebas de campo verificando la distancia entre la ubicación reportada y la ubicación real.
- Dependencias tecnológicas: API de Location Services nativa de iOS / Android.

<a id="rnf-034"></a>

## RNF-034 — Escalabilidad horizontal

Sección: 3.3.1.4. Prioridad literal de matriz: **Media/Deseado**.

- Descripción detallada: La arquitectura debe soportar un crecimiento (scale-out) para manejar proyecciones de hasta 15,000 registros simultáneos sin degradación.
- Justificación: Prepara la arquitectura de software para una futura expansión.
- Métrica de validación: Pruebas de estrés demostrando capacidad de instanciar nuevos nodos.
- Dependencias tecnológicas: Contenedores (Docker), Orquestación (Kubernetes / ECS).

<a id="rnf-035"></a>

## RNF-035 — Optimización de consumo de datos

Sección: 3.3.1.5. Prioridad literal de matriz: **Media/Deseado**.

- Descripción detallada: La aplicación no consumirá más de 50 MB de datos móviles por cada hora de viaje activo con el mapa abierto.
- Justificación: Considera el contexto económico de los estudiantes con planes limitados.
- Métrica de validación: Medición de transferencia de red en dispositivos de prueba.
- Dependencias tecnológicas: Compresión de payloads HTTP, caché vectorial de mapas.

<a id="rnf-036"></a>

## RNF-036 — Optimización de batería

Sección: 3.3.1.6. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: El uso en segundo plano de los servicios de ubicación no drenará más del 10% de la capacidad de la batería por hora.
- Justificación: Factor crítico para la retención y adopción diaria.
- Métrica de validación: Análisis de consumo energético en sesiones de prueba.
- Dependencias tecnológicas: Gestión eficiente de intervalos de sondeo GPS nativo.

<a id="rnf-037"></a>

## RNF-037 — Tiempo de arranque en frío (Cold Start)

Sección: 3.3.1.7. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: El aplicativo móvil debe cargarse completamente desde cero y mostrar la pantalla en menos de 4 segundos bajo redes 4G.
- Justificación: Atributo de usabilidad fundamental para evitar frustración.
- Métrica de validación: Medición del “Time to Initial Display” en Firebase Performance Monitoring.
- Dependencias tecnológicas: Optimización de assets, lazy loading.

<a id="rnf-038"></a>

## RNF-038 — Encriptación AES-256

Sección: 3.3.2.1. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: Las contraseñas y datos de identificación personal (PII) deben almacenarse cifrados en la base de datos utilizando el estándar AES-256.
- Justificación: Atributo indispensable de seguridad de la información.
- Métrica de validación: Auditoría de código estático (SAST) y revisión de esquemas de BD verificando el cifrado at-rest.
- Dependencias tecnológicas: Librerías de criptografía en el backend, conexión TLS para datos en tránsito.

<a id="rnf-039"></a>

## RNF-039 — Limitación de tasa (Rate Limiting)

Sección: 3.3.2.2. Prioridad literal de matriz: **Sin definir**.

- Descripción detallada: Las APIs del backend restringirán el tráfico a un máximo de 100 peticiones por minuto por cada IP o JWT.
- Justificación: Previene ataques de denegación de servicio (DDoS).
- Métrica de validación: Simulación de ataque verificando código HTTP 429 Too Many Requests.
- Dependencias tecnológicas: Middleware de Rate Limiting en el API Gateway.

<a id="rnf-040"></a>

## RNF-040 — Enmascaramiento de PII

Sección: 3.3.2.3. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: Números de teléfono y cédulas de los usuarios nunca serán expuestos en peticiones HTTP del lado del cliente.
- Justificación: Salvaguarda la privacidad y previene el raspado de datos.
- Métrica de validación: Inspección de respuestas JSON de APIs públicas.
- Dependencias tecnológicas: Patrón DTO en el backend.

<a id="rnf-041"></a>

## RNF-041 — Trazabilidad inmutable de transacciones

Sección: 3.3.2.4. Prioridad literal de matriz: **Sin definir**.

- Descripción detallada: Cualquier movimiento de saldo generará un registro (log) transaccional inmutable que solo podrá ser auditado.
- Justificación: Previene el fraude interno y garantiza transparencia.
- Métrica de validación: Verificación en base de datos de que solo hay INSERTS, no UPDATES.
- Dependencias tecnológicas: Diseño de BD estilo libro mayor (Ledger).

<a id="rnf-042"></a>

## RNF-042 — Políticas de Backups

Sección: 3.3.3.1. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: El sistema ejecutará copias de seguridad incrementales automatizadas diariamente a las 2:00 AM.
- Justificación: Protege la integridad del historial de viajes y billeteras virtuales.
- Métrica de validación: Verificación de la existencia de los archivos de volcado (dump).
- Dependencias tecnológicas: Cron jobs, AWS S3 / Azure Blob Storage, scripts de BD.

<a id="rnf-043"></a>

## RNF-043 — Tiempo Objetivo de Recuperación (RTO)

Sección: 3.3.3.2. Prioridad literal de matriz: **Media/Deseado**.

- Descripción detallada: En caso de caída crítica del servidor, el sistema deberá restaurarse a completa operatividad en máximo 4 horas.
- Justificación: Garantiza que un fallo se solucione antes de la jornada académica matutina.
- Métrica de validación: Simulación de desastre (Disaster Recovery Test).
- Dependencias tecnológicas: IaC, Scripts de DR.

<a id="rnf-044"></a>

## RNF-044 — Disponibilidad y Uptime

Sección: 3.3.4.1. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: La plataforma debe garantizar un Uptime del 99.9% en el horario comprendido entre las 5:00 AM y las 10:00 PM (Hora Colombia).
- Justificación: Corresponde al horario crítico de movilidad hacia el campus universitario.
- Métrica de validación: Monitoreo mediante herramientas APM (ej. Datadog / New Relic) demostrando > 99.9% de disponibilidad mensual en dicha franja.
- Dependencias tecnológicas: Balanceador de carga, Auto-scaling group, Arquitectura Cloud.

<a id="rnf-045"></a>

## RNF-045 — Mantenibilidad mediante GitFlow

Sección: 3.3.5.1. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: El código fuente estará modularizado y alojado en un repositorio controlando el versionamiento mediante el flujo GitFlow.
- Justificación: Metodología obligatoria para la evaluación ágil y colaborativa del equipo de desarrollo.
- Métrica de validación: Revisión del árbol de commits y ramas en el repositorio (GitHub/GitLab).
- Dependencias tecnológicas: Git, Plataforma de repositorios.

<a id="rnf-046"></a>

## RNF-046 — Interoperabilidad Multiplataforma

Sección: 3.3.6.1. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: El frontend será desarrollado con un framework que soporte renderizado nativo tanto en ecosistemas iOS como Android.
- Justificación: Garantiza cobertura total independientemente del dispositivo.
- Métrica de validación: Aplicación compilable y funcional tanto en formato .apk/.aab como .ipa.
- Dependencias tecnológicas: Flutter, React Native o .NET MAUI.

<a id="rnf-047"></a>

## RNF-047 — Compatibilidad con Sistemas Operativos Heredados

Sección: 3.3.6.2. Prioridad literal de matriz: **Media/Deseado**.

- Descripción detallada: La aplicación debe ejecutarse sin errores fatales en móviles a partir de Android 10 (API 29) e iOS 14.
- Justificación: Asegura la inclusión tecnológica socioeconómica.
- Métrica de validación: Pruebas de instalación exitosa en dispositivos con dichas versiones.
- Dependencias tecnológicas: Configuración de minSDK / Target SDK.

<a id="rnf-048"></a>

## RNF-048 — Diseño Usable y Mobile-First

Sección: 3.4.1.1. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: El 100% de las funciones operativas core deben ser accesibles a una sola mano en pantallas de smartphones promedio.
- Justificación: Los estudiantes utilizarán la aplicación principalmente en tránsito.
- Métrica de validación: Evaluación heurística de UI/UX confirmando zonas de alcance del pulgar (Thumb Zone).
- Dependencias tecnológicas: Framework de desarrollo frontend móvil, diseño UI/UX responsive.

<a id="rnf-049"></a>

## RNF-049 — Cumplimiento Normativo (Términos legales)

Sección: 3.4.1.2. Prioridad literal de matriz: **Alta/Esencial**.

- Descripción detallada: El sistema debe requerir la aceptación explícita de Términos y Condiciones que definan el servicio como “transporte sin fines de lucro”.
- Justificación: Protege a los estudiantes y a la plataforma de multas gubernamentales.
- Métrica de validación: Existencia del contrato legal y log de aceptación por cada usuario.
- Dependencias tecnológicas: Asesoría jurídica para la redacción de los T&C.

<a id="rnf-050"></a>

## RNF-050 — Accesibilidad (Estándar WCAG 2.1)

Sección: 3.4.1.3. Prioridad literal de matriz: **Media/Deseado**.

- Descripción detallada: La interfaz de usuario debe proveer contrastes de color adecuados (ratio 4.5:1) y etiquetas para lectores de pantalla.
- Justificación: Asegura inclusión de estudiantes con discapacidades visuales.
- Métrica de validación: Auditoría pasando con > 90% en herramientas como Google Lighthouse.
- Dependencias tecnológicas: Atributos semánticos/aria-labels en el framework móvil.

## Enmienda funcional del 24 de noviembre de 2026

Los criterios anteriores conservan el cotejo de la ERS. La enmienda aplica sólo a los requisitos siguientes y conserva sus IDs.

| Requisitos                    | Cambio que debe reflejar la ERS                                                                                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-003, RF-004                | El conductor define ambos extremos, puntos ordenados, permisos de operación, vías y condiciones. La USC puede asociarse a cualquier punto de encuentro. Mantener validaciones de vehículo, afiliación, capacidad y agenda. Guardar geometría cuando se aporta o elige y distinguir su ausencia. |
| RF-005                        | Buscar próximos viajes por cercanía a abordaje y descenso autorizados, ventana de salida, sentido y cupos. Preservar el radio de la ERS. Una plaza disponible admite un pasajero. Match no cambia el itinerario.                                                                                |
| RF-006, RF-012, RF-015        | Solicitud de grupo con par ordenado de paradas, aceptación del dueño y capacidad atómica por viaje. Conservar miembros e historial. Cancelar desde PROGRAMADO o avanzar EN_CURSO → COMPLETADO. RF-007 conserva la contradicción pendiente de decisión.                                          |
| RF-018, RF-027, RF-029        | Distinguir catálogo DEMO, puntos internos por nivel/acceso, catálogo oficial, ruta consultable y posición del dispositivo. El QR futuro debe vincular al participante con su parada seleccionada y reserva confirmada.                                                                          |
| RNF-031, RNF-035, RNF-039–041 | Filtrar antes de devolver datos, paginar búsqueda y limitar operaciones y geometrías. Datos de búsqueda mínimos. Conservar eventos y estados; las mediciones y garantías completas de la ERS siguen pendientes de evidencia.                                                                    |
| RNF-046–048, RNF-050          | Una app Expo Web/Native. Experiencia usable con mapa base opcional, permisos y errores explícitos cuando una integración se habilite. Validación física y conformidad de accesibilidad requieren pruebas propias.                                                                               |

## Nota de evolución 25/11/2026

Para RF-001/002 y recuperación, la implementación local incorpora contraseña propia,
enlaces de buzón y recuperación y elegibilidad separada. Para RF-005, añadir preferencias
privadas, listado general y conciliación de compatibilidad directa/potencial. Para RF-006,
la participación ordinaria sigue siendo directa y atómica. Los avisos internos se vinculan
a nuevas coincidencias y no adjudican plazas. Los textos/identificadores archivados de
la ERS y la prioridad pendiente de RF-001 se conservan. Consultar
[trazabilidad vigente](TRACEABILITY.md) y [cambios académicos](ACADEMIC_REDEFINITION_CHANGES.md).

## Nota de continuidad

RF-014 tiene una implementación REST compartida con avisos persistentes.
Actualización en tiempo real y push requieren una evolución separada. Las políticas
de lectura tras finalizar y retención se mantienen en la definición y el informe de
continuidad. En ese corte se mantenía pendiente la decisión RF-010 sobre rango
y fórmula. La consolidación posterior la resuelve.

## Consolidación funcional del 26 de noviembre

La transcripción histórica de RF-010 conserva el criterio excluyente y la
fórmula originales. El encargo vigente aprueba el intervalo entero 1–5
inclusive y la media aritmética por capacidad evaluada en viajes completados.
La evaluación exige la pareja conductor y pasajero con abordaje, y una clave
única de viaje, evaluador y evaluado. Los estados de implementación de grupos,
QR, estimaciones privadas, seguimiento, seguridad y RF-010 se registran en
[trazabilidad](TRACEABILITY.md#consolidación-funcional-26112026).

## Implementación de continuidad del 26/11/2026

| ID histórico | Alcance vigente                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-019       | Estadísticas de movilidad por rol, mes y alcance. Estimaciones con factores versionados y contraste voluntario.                                  |
| RF-020       | Gestión de sesiones, desactivación, registro de solicitud, consulta y recuperación. Ejecución del borrado sujeta a política de conservación.     |
| RF-023       | Recurrencias independientes de los viajes de cada fecha, generación durable y edición con alcance futuro.                                        |
| RF-026       | Historial de gastos propios, condiciones de viaje y compensaciones voluntarias en COP.                                                           |
| RF-028       | Retiro con motivo opcional, cancelación programada, cancelación de fechas recurrentes e interrupción segura. Gestión de apoyo externo pendiente. |
| RF-030       | Categorías operativas, historial privado del autor y exportación voluntaria. Canal institucional pendiente.                                      |

RF-021 y RF-025 siguen en definición de Producto. Consulta las [reglas vigentes](PRODUCT_DEFINITION.md#continuidad-funcional-del-26112026).

## Alcance actualizado de la evolución

RF-019 incluye estimaciones reproducibles de operación, atribución y contraste voluntario de movilidad. RF-014 usa chat persistente con actualización SSE y recuperación HTTP. RF-015 suma una vista operativa por rol. RF-023 conserva la independencia de fechas en agenda y permite revisar una publicación como plantilla. RNF-032 distingue señales de primer plano de push remoto y mantiene pendiente la comprobación de entrega física. Las fichas anteriores conservan la transcripción original.

## Interpretación vigente de la operación

RF-003 y RF-004 incorporan edición versionada y preservación de condiciones.
RF-005 incorpora preferencias privadas, guardados y filtros de aportes. RF-006
impide solapar confirmaciones individuales y grupales. RF-012 y RF-015 proyectan
abordaje y descenso y preservan publicaciones vencidas. RF-018 distingue precisión
y caducidad del punto compartido. RF-019 añade procedencia del descenso dentro
de la estimación de tramos. RF-023 comparte validación temporal con publicaciones
manuales. RNF-032 conserva la bandeja y SSE con entrega push condicionada a un
dispositivo y proveedor configurados. Consultar [cobertura](TRACEABILITY.md#operación-del-viaje-y-movilidad-cotidiana).

## Actualización funcional de RF-001

El acceso académico usa el dominio exacto `@usc.edu.co` declarado. La
transcripción de la fuente institucional conserva su contexto histórico.
