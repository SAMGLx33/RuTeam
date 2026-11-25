# Definición vigente de RuTeam

Decisión de producto del 25 de noviembre de 2026. Esta referencia prevalece
sobre los flujos históricos incompatibles. Consultarla antes de cambiar el dominio.

## Identidad y elegibilidad

- **RN-IDENTIDAD-01.** Una cuenta por estudiante vigente USC. Pasajero y
  conductor son capacidades compatibles. Conducir requiere vehículo propio y
  elegibilidad vigente. Se retira la administración del producto.
- **RN-IDENTIDAD-02.** Control de correo, autenticación, estamento estudiantil y
  matrícula vigente son comprobaciones distintas. La fuente autorizada aún
  requiere acceso institucional. Producción falla cerrada sin esa acreditación.
  Fixtures sintéticos sólo en desarrollo y pruebas aisladas.
- **RN-VEHICULO-01.** Autogestión con formato, vigencia declarada, titularidad y
  capacidad validados por Nest. Una declaración no acredita verificación oficial.
  Validación externa de licencia y SOAT pendiente de acceso autorizado.

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

## Participación y recorrido

- **RN-PARTICIPACION-01.** Confirmación directa de un estudiante elegible en un
  viaje futuro abierto, con puntos autorizados en orden. Prohibidos viaje propio
  y doble participación. El propietario consulta las confirmaciones.
- **RN-CAPACIDAD-01.** Cada confirmación ocupa plazas con bloqueo transaccional.
  Un reintento no duplica filas ni ocupación. Un retiro futuro permitido libera
  plazas y conserva historial. Viaje lleno y viaje iniciado son estados distintos.
- **RN-GRUPO-01.** Consentimiento explícito de cada estudiante. Un lote confirmado
  conjuntamente es atómico. Invitaciones temporales no retienen plazas pendientes.
  Hasta contar con ese mecanismo, priorizar confirmación individual y conservar
  el historial anterior. No usar UUID de usuarios como códigos de invitación.
- **RN-PARADA-01.** Una propuesta de recogida pertenece a un viaje HACIA_USC.
  El propietario decide si incorpora el punto compatible con su recorrido.
  La decisión no altera la geometría, reserva plazas ni confirma participación.
- **RN-ABORDAJE-01.** Abordaje sólo con participación confirmada. Registra presencia
  con autorización del conductor y sin consumir una segunda plaza. Un QR interno,
  si se incorpora, se valida en servidor con expiración y uso único.
- **RN-ESTADO-01.** Programado, en curso, completado y cancelado describen el viaje.
  Cancelaciones conservan historial. Las condiciones esenciales aceptadas no se
  modifican silenciosamente. Sin multas automáticas.

## Seguridad y módulos complementarios

Sesiones revocables y con expiración, cookies seguras en web y almacenamiento
seguro en móvil. Verificar afiliación al autorizar operaciones. Limitar datos
expuestos, acceso por recurso, frecuencia de peticiones y geolocalización consentida.

Chat limitado a participantes autorizados para coordinar el viaje. Calificaciones
entre participantes reales después de terminar, sin duplicados o autocalificación.
Compensaciones sin lucro ni pasarelas automáticas. SOS y reporte no implican
despacho de emergencias. El alcance efectivo y la evidencia de estas funciones se
mantienen en la trazabilidad y los informes de entrega.

Consultas de servicios institucionales, verificación documental, geocodificación y
rutas dependen de proveedores aprobados. Un fallo del proveedor se informa de forma
explícita. Mantener el stack Nest, Prisma/PostgreSQL, Expo y contratos compartidos.
