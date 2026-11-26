# Definición vigente de RuTeam

Definición vigente del 25 de noviembre de 2026, ampliada por el encargo de
transformación integral del producto (incrementos A–G) y por la consolidación
funcional del 26 de noviembre de 2026. Prevalece sobre interpretaciones
históricas incompatibles. Consultarla antes de cambiar dominio, permisos o navegación.
Las reglas siguientes son requisitos y decisiones; su estado de ejecución se acredita
por incremento en PROGRESS, TRACEABILITY y EVIDENCE. Esta ampliación documental no
revalida las 117 pruebas ni la experiencia visual del corte anterior.

## Propósito y experiencia integrada

RuTeam conecta estudiantes vigentes USC con desplazamientos que otro estudiante ya
planea conducir. El conductor publica condiciones y recorrido; el pasajero descubre
viajes, recibe recomendaciones y confirma directamente. Buscar o guardar preferencias
no crea una solicitud de transporte. No hay asignación de conductor ni administración.
Una sola app Expo Router web/móvil consume la API Nest MVC y PostgreSQL reales.

La experiencia normal comienza con iniciar sesión o crear cuenta, continúa con verificación
y onboarding persistente y conduce a un inicio útil según capacidades. Perfil y formularios
viven en sus secciones; el inicio contiene viajes/datos reales, no una colección de enlaces.
Sin funcionalidades disponibles se informa su estado; no inventar estadísticas o acciones.

## Referencias de continuidad

- [Reglas y criterios de negocio](BUSINESS_RULES.md): índice RN y verificaciones requeridas.
- [Matriz de autorización](../architecture/AUTHORIZATION_MATRIX.md): sesión, elegibilidad,
  preferencia, capacidad y propiedad del recurso se validan separadamente.
- [Navegación objetivo](../architecture/FRONTEND_NAVIGATION.md) y
  [flujos de usuario](USER_FLOWS.md): acceso, onboarding, paneles y recorridos completos.
- [Recomendaciones y notificaciones](../architecture/RECOMMENDATION_FLOW.md): efectos
  persistentes, datos actuales, fallos y privacidad. No implica plazas reservadas.

## Identidad y elegibilidad

- **RN-IDENTIDAD-01.** Una identidad individual, sin cuentas duplicadas. Todos los
  usuarios autorizados al producto de viajes son estudiantes vigentes USC. Pasajero y
  conductor son capacidades compatibles. La preferencia de uso (pasajero o conductor
  y pasajero) no concede permisos. Conducir requiere habilitación efectiva y vehículo
  propio o autorización admitida por la política. No administración de producto.
- **RN-IDENTIDAD-02.** Control de correo, autenticación, estamento estudiantil y
  matrícula vigente son comprobaciones distintas. La fuente autorizada aún
  requiere acceso institucional. Producción falla cerrada sin esa acreditación.
  Fixtures sintéticos sólo en desarrollo y pruebas aisladas.
- **RN-CUENTA-01.** Cuenta autenticada y acceso a viajes son niveles distintos.
  Crear cuenta y autenticar una identidad mediante un mecanismo válido no acredita
  correo, condición estudiantil o conducción. La cuenta no elegible sólo accede a las
  operaciones propias de cuenta/verificación expresamente permitidas; no al feed o viajes.
- **RN-AUTH-01.** Autenticación convencional con correo institucional normalizado y
  contraseña propia de RuTeam, nunca contraseña del sistema USC. Decisión técnica del
  incremento: hash scrypt con sal aleatoria y parámetros justificados, comparación segura,
  sin claves/tokens reutilizables en texto plano. Sesión opaca revocable con expiración;
  cookie HttpOnly web y SecureStore móvil. Verificación de correo y recuperación mediante
  tokens impredecibles, limitados, expirables y de uso único cuando se implementan.
  SMTP/transporte real y provider académico tienen estados de integración separados.
- **RN-AUTH-02.** El login normal no muestra selectores de identidades, botones de
  desarrollo o proveedores institucionales inexistentes. Las cuentas de prueba usan el
  mismo formulario y ciclo de sesión; entrega de correo y acreditación sintéticas sólo
  en adaptadores de desarrollo/test aislados, imposibles de activar en producción.
- **RN-ONBOARDING-01.** Incorporación progresiva persistida y retomable: identidad mínima,
  verificación, preferencia funcional y movilidad opcional; habilitación de conducción
  sólo para quien la elige. Omitir movilidad no oculta todos los viajes. Un pasajero puede
  iniciar luego «Convertirme en conductor» sin crear otra cuenta ni obtener permisos por
  cambiar una preferencia. Backend deriva capacidades actuales en cada operación.
- **RN-VEHICULO-01.** Autogestión con formato, vigencia declarada, titularidad y
  capacidad validados por Nest. Una declaración no acredita verificación oficial.
  Validación externa de licencia y SOAT pendiente de acceso autorizado.
- **RN-CAPACIDAD-CONDUCTOR-01.** Conducción inhabilitada por documentos no implica pérdida
  de capacidad pasajero si matrícula sigue vigente. No publicar hasta cumplir condiciones;
  permitir renovación propia e historial autorizado. Gestión de recursos existentes siempre
  verifica propietario y seguridad/estado; no asignar permisos sólo por mostrar navegación.

## Viajes y descubrimiento

- **RN-VIAJE-01.** Publicación por conductor elegible. Mantener límites de
  asientos de pasajeros según el vehículo y condiciones de casco aplicables.
- **RN-VIAJE-02.** DESDE_USC parte de un campus USC y termina fuera.
  HACIA_USC parte fuera y termina en la USC. Un punto intermedio universitario
  no habilita un viaje entre dos puntos externos. Desde USC se aborda en el
  encuentro de origen. Las paradas adicionales son de descenso o de paso.
- **RN-VIAJE-03.** El conductor selecciona el itinerario, fecha, horario,
  vehículo, condiciones y paradas. Los puntos de paso y las paradas autorizadas
  tienen funciones distintas. La geometría vial publicada se conserva.
- **RN-VIAJE-04.** El encuentro acepta texto libre asociado al campus y puede
  representar espacios interiores. Una ubicación general del campus es sólo
  referencia. En formularios, elegir direcciones, resultados o marcadores.
- **RN-BUSQUEDA-01.** Filtrar viajes existentes por sentido, horario, lugar,
  capacidad y paradas. Proximidad y texto son señales distintas. Pasajeros no
  publican solicitudes de transporte ni el matching modifica el itinerario.

## Preferencias, feed y recomendaciones

- **RN-MOVILIDAD-01.** Preferencias privadas, activables/editables/eliminables y múltiples
  cuando corresponda: campus, zona aproximada/lugares habituales, modalidad, días,
  franjas de ida/regreso, distancia aceptable a encuentro y avisos. No domicilio exacto
  obligatorio, coordenadas manuales ni publicación de solicitudes de transporte.
- **RN-RECOMENDACION-01.** Matching permanente recomienda viajes publicados según
  preferencias activas, sentido/campus/fecha/horario, proximidad/calidad, paradas, estado,
  capacidad y elegibilidad. Distinguir compatible para participar, potencial HACIA_USC
  para proponer recogida y no compatible. Texto/proximidad no autorizan abordaje;
  no inventar ETA intermedia. Sin modificación del recorrido ni ocupación automática.
- **RN-FEED-01.** «Viajes disponibles» ofrece Para ti, Desde USC, Hacia USC y listado
  general con datos del backend. Sin preferencias o sin coincidencias, permitir descubrir
  otros viajes. Detalle explica conductor/reputación existente, vehículo, horario, encuentro,
  recorrido, paradas, condiciones y plazas reales. El propietario gestiona su viaje;
  quien ya participa ve su estado; lleno/cerrado no permite confirmar.
- **RN-NOTIFICACION-01.** Nuevas coincidencias pueden generar notificaciones internas
  persistentes por destinatario/viaje/tipo, con lectura y enlace autorizado al detalle.
  Deduplicar, respetar preferencias, no recomendar al dueño su propio viaje y reflejar
  estados actuales tras cancelación/ocupación. No son plazas, correo, push ni tiempo real.
- **RN-RECOMENDACION-02.** Prefiltrar candidatos y preferencias en PostgreSQL con índices;
  no recorrer indiscriminadamente todas las cuentas en cada petición. Si hay trabajo
  asíncrono, persistirlo y recuperarlo tras reinicio con reintentos/deduplicación. Actualizar
  lecturas ante publicación/cancelación/cierre/cupos, preferencias, paradas y elegibilidad.

## Participación y recorrido

- **RN-PARTICIPACION-01.** Confirmación directa de un estudiante elegible en un
  viaje futuro abierto, con puntos autorizados en orden. Prohibidos viaje propio
  y doble participación. El propietario consulta las confirmaciones.
- **RN-CAPACIDAD-01.** Cada confirmación ocupa plazas con bloqueo transaccional.
  Un reintento no duplica filas ni ocupación. Un retiro futuro permitido libera
  plazas y conserva historial. Viaje lleno y viaje iniciado son estados distintos.
- **RN-GRUPO-01.** Consentimiento explícito de cada estudiante. Un lote confirmado
  conjuntamente es atómico. Las invitaciones opacas caducan a las dos horas o
  al llegar la hora de salida, lo que ocurra primero. Dar consentimiento no
  ocupa plazas. El organizador confirma todas las plazas del segmento escogido
  en una operación. Cada integrante recibe su participación individual y puede
  retirarse según la regla ordinaria. Conservar el historial anterior.
- **RN-PARADA-01.** Una propuesta de recogida pertenece a un viaje HACIA_USC.
  El propietario decide si incorpora el punto compatible con su recorrido.
  La decisión no altera la geometría, no reserva plazas y no confirma participación.
- **RN-ABORDAJE-01.** Abordaje sólo con participación confirmada. Registra presencia
  con autorización del conductor y sin consumir una segunda plaza. El pasajero
  puede mostrar un QR opaco de dos minutos. El titular lo escanea desde móvil
  habilitado y el servidor coteja viaje, parada, estado y uso previo. La acción
  manual aplica las mismas condiciones de abordaje.
- **RN-ESTADO-01.** Programado, en curso, completado y cancelado describen el viaje.
  Cancelaciones conservan historial. Las condiciones esenciales aceptadas no se
  modifican silenciosamente. Sin multas automáticas.

## Seguridad y módulos complementarios

Sesiones revocables y con expiración, cookies seguras en web y almacenamiento
seguro en móvil. Verificar afiliación al autorizar operaciones. Limitar datos
expuestos, acceso por recurso, frecuencia de peticiones y geolocalización consentida.

- **RN-CALIFICACION-01 (RF-010).** En un viaje completado, cada pasajero que
  abordó puede evaluar una vez al conductor y el conductor puede evaluar una
  vez a cada pasajero que abordó. Ausentes, retirados y terceros quedan fuera.
  Cada nota es un entero de 1 a 5 inclusive. La reputación combina suma de
  estrellas y cantidad de evaluaciones y se calcula por capacidad histórica
  evaluada. Si no hay evaluaciones, la interfaz muestra «Sin calificaciones».
  El comentario opcional, de hasta 500 caracteres, se limita al historial del
  evaluador. La reputación compartida muestra promedio y cantidad.
- **RN-COSTO-01.** El conductor puede guardar, antes del inicio, una estimación
  privada de combustible, peajes y estacionamiento en pesos colombianos
  enteros. El total sólo suma esos tres conceptos. Las reglas para calcular un
  aporte y registrar compensaciones quedan abiertas.
- **RN-SEGUIMIENTO-01.** En un viaje en curso, el titular puede publicar
  voluntariamente una posición capturada en primer plano y retirarla. Sólo
  personas autorizadas del viaje pueden consultar la muestra. Se conserva un
  punto durante un máximo de dos minutos de visibilidad y se exige un intervalo
  de al menos 15 segundos entre actualizaciones. El cierre elimina la muestra.
- **RN-SEGURIDAD-01.** En un viaje en curso, los participantes autorizados
  consultan un resumen mínimo. Pueden revisarlo y entregarlo al selector
  nativo de destinos o seleccionar el texto. La acción de emergencias en Cali
  abre el marcador con el 123 tras confirmación. El destino y el último paso
  permanecen bajo control del usuario.
- Chat y avisos internos se limitan a sus destinatarios autorizados. Ver
  [trazabilidad](TRACEABILITY.md) para evidencia y límites por plataforma.

Consultas de servicios institucionales, verificación documental, geocodificación y
rutas dependen de proveedores aprobados. Un fallo del proveedor se informa de forma
explícita. Mantener el stack Nest, Prisma/PostgreSQL, Expo y contratos compartidos.

## Estado de la transformación y decisiones abiertas

La base revisada registra autenticación sintética, búsqueda manual, publicación,
confirmación individual/cupos, propuestas y ciclo básico. Ese antecedente no acredita
registro convencional, correo verificado, onboarding, navegación por capacidades, feed,
preferencias ni notificaciones del nuevo encargo. Incremento A define estos flujos;
B–G requieren implementación/evidencia, revisión visual y autorización API por recurso.

Fuente institucional de estudiante vigente, verificación documental autorizada, SMTP
operativo, proveedores cartográficos y Expo Go físico se acreditan por separado. Un
bloqueo externo no impide construir cuentas/sesiones/onboarding internos; tampoco
permite dar acceso a viajes sin elegibilidad. Conservar módulos complementarios compatibles
(chat, ratings, grupos con consentimiento, costos sin lucro, QR, seguimiento y SOS)
según su estado efectivo, sin pestañas o botones de éxito ficticio.

Entrega académica 28/11/2026, seis integrantes y sprints≤2 días. No convertir los bloques
A–G en siete sprints ni inventar actas/aceptación. Sin Git writes automáticos ni cambios
al estado integrado por un avance local. Los originales académicos privados se preservan;
[la especificación de cambios](ACADEMIC_REDEFINITION_CHANGES.md) mantiene sus IDs y límites.

## Continuidad operativa

La USC identifica institución y sede por catálogo. Una dirección de fuente institucional
describe el sitio. El equipo verifica por separado las coordenadas operativas para encuentros.
Una alternativa seleccionada conserva geometría y estimaciones viales; los eventos de
progreso almacenan tiempos reales. Las preferencias usan la sede y franja de la recogida
disponible. La llegada a una parada es ordenada; abordar o registrar ausencia es explícito.

La conversación del viaje coordina a conductor y pasajeros confirmados. El retiro revoca
el acceso. El viaje completado permite lectura durante 24 h al conductor y quienes abordaron.
Las notificaciones internas pueden abrir una conversación cuando sigue disponible.
