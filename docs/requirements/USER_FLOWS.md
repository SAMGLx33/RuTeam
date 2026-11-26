# Recorridos completos de usuario

Recorridos del corte local del 25/11/2026. Contrastar cada uno con la [evidencia](../reviews/PRODUCT_TRANSFORMATION_DELIVERY.md).
Leer PRODUCT_DEFINITION/BUSINESS_RULES y AUTHORIZATION_MATRIX. Una tabla, endpoint,
botón o prueba aislada no termina un flujo. Backend Nest y PostgreSQL reales; adaptadores
externos controlados se identifican como pruebas, nunca acreditación institucional real.

## A — Crear cuenta e incorporarse como pasajero

Necesidad: entrar con una cuenta propia, comprender su verificación y descubrir viajes
sin conocer identificadores ni herramientas técnicas. Actor: nueva identidad individual.
Entrada: pantalla pública RuTeam con correo institucional, contraseña propia, crear cuenta,
recuperación y privacidad. No selector de personas sintéticas o acceso de desarrollo.

1. Registrar nombre mínimo, correo normalizado @usc.edu.co y contraseña propia de RuTeam.
   Nest valida formato/unicidad/límites y persiste hash scrypt con sal/parámetros;
   nunca contraseña institucional o reutilizable en texto plano.
2. Verificar control de correo mediante mecanismo real disponible, con token impredecible,
   caducidad/uso único/intentos limitados. Entrega SMTP/captura local y provider académico
   son adaptadores separados. Si no hay entrega, informar indisponibilidad sin decir enviado.
3. Establecer sesión por el flujo normal. Mostrar acreditación estudiantil pendiente,
   vigente, no elegible, vencida o revocada según evidencia. Correo confirmado no da viajes.
4. Completar identidad/preferencia «Quiero compartir viajes como pasajero» y persistir
   onboarding retomable. Cuenta pendiente sólo ve cuenta/verificación y datos básicos
   expresamente permitidos; al acreditarse accede al resto del proceso.
5. Configurar movilidad privada opcional cuando habilitado u omitirla. Concluir onboarding
   y abrir inicio pasajero con feed real/estados vacíos, nunca editor de perfil principal.
6. Abrir tarjeta/detalle, revisar condiciones y confirmar directamente si está habilitado
   y hay plazas. Backend revalida/ocupa transaccionalmente. Mis participaciones refleja
   estado/encuentro/cupos persistidos tras recarga.

Fallos: dominio inválido, duplicidad/tratamiento no enumerante, entrega fallida, token
expirado/usado, provider académico ausente, sesión expirada o API caída. Mostrar causa
comprensible y acción legítima; no fabricar permiso/usuario/confirmación. Prueba E2E:
recargar durante onboarding, retomar y comprobar que pasajero no ve publicar/propios.
Una cuenta inactiva/pendiente no pasa por URL directa ni HTTP de viaje.

## B — Autenticarse y habilitar conducción

Necesidad: conducir con la misma identidad y conservar capacidad pasajero. Entrada:
registro/preferencia o Perfil→Convertirme en conductor; no menú permanente de vehículos
para toda persona. Preferir conducir sólo persiste una intención.

Autenticar por correo/contraseña propia, establecer sesión y separar correo/matrícula.
Completar onboarding y registrar vehículo propio, licencia/SOAT, vigencias y titularidad.
Nest valida formato/capacidad/categoría/propiedad y procedencia documental. Declarar no
verifica oficialmente. En pruebas se usa provider aislado, sin endpoints que concedan
permiso a producción. Cuando la política lo habilita, servidor devuelve capacidad efectiva.
Navegación ofrece publicar y mis viajes; perfil mantiene vehículos/renovación. Publicar
revalida capacidad actual, conflictos de horario, puntos/condiciones y snapshot.

Fallos: matrícula pendiente, documento vencido/no acreditado, placa duplicada o recurso
ajeno. No crear viaje ni dar capacidad desde preferencia/DTO. Persisten solicitud de
habilitación y documentos propios según operación; renovar permite retomar sin otra cuenta.
Prueba: el mismo actor puede participar en viaje ajeno y no en el propio.

## C — Preferencias → publicación → recomendación → participación

Necesidad: encontrar desplazamientos habituales sin búsqueda manual obligatoria.
Pasajero elegible configura campus, zona/lugares aproximados, días/franjas/sentido,
distancia aceptable y avisos; puede mantener varias preferencias y desactivarlas/eliminarlas.
Se guardan privadas, no como solicitud pública ni domicilio obligatorio.

Conductor habilitado publica el recorrido que eligió. Publicación persiste viaje/evento
y activa evaluación recuperable de recomendaciones según RECOMMENDATION_FLOW.
Feed Para ti consulta coincidencias actuales automáticamente; todos los viajes pueden
verse por separado. La coincidencia compatible muestra parada autorizada; la potencial
HACIA_USC permite proponer recogida, sin participar automáticamente ni cambiar ruta.
Una notificación interna persistida lleva a detalle autorizado; leído/no leído pertenece
al destinatario. Confirmar después revalida estado/cupos/paradas y consume una plaza real.

Fallos: preferencias sin resultados, provider geográfico caído, tarea demorada/reintentada,
viaje lleno/cancelado o elegibilidad cambiada. No mostrar notificación como reserva ni
estado viejo como disponible. Prueba: publicar otra cuenta y observar feed/aviso sin usar
búsqueda; reinicio/reintento no duplican notificación y última plaza sigue protegida.

## D — Descubrir un viaje no recomendado

Necesidad: explorar oportunidades ocasionales aunque no existan preferencias o coincidencia.
Inicio/Viajes disponibles→Todos/Desde/Hacia permite listado general de datos actuales.
Un viaje incompatible con preferencias no aparece como recomendado incorrectamente,
pero puede abrirse desde Todos si sigue disponible/autorizado. Filtros son secundarios.
Detalle muestra razones/calidad y condiciones reales; no inventar distancia, ETA, reputación
o cercanía textual. Si no hay parada compatible, no ofrecer confirmar sobre un punto de paso.

Prueba: cuenta sin movilidad ve listado general, viaje incompatible no aparece en Para ti,
fecha/dirección/estado cambiados actualizan lecturas sin crear solicitudes ni ocupar plazas.

## E — Cuenta autenticada no elegible

Necesidad: comprender restricción y gestionar cuenta/verificación sin falsa promesa de acceso.
Entrada: login válido con correo pendiente o matrícula pendiente/inactiva/vencida/revocada.
Servidor puede autenticar la cuenta; la pantalla explica el estado y acciones permitidas.
Perfil mínimo, verificación/reemisión, recuperación y logout siguen su política propia.
Feed, preferencias de viajes y operaciones de participación/conducción quedan restringidos.

No pedir contraseñas USC ni aceptar un QR cualquiera. No inventar método de acreditación
si falta convenio/provider. Si cambia elegibilidad durante sesión, servidor rechaza nuevas
operaciones y cliente limpia lecturas protegidas. Prueba HTTP/URL directa y dos sesiones;
logout propio funciona tras baja y token revocado no vuelve a abrir recurso.

## F — Cambiar preferencia/capacidad y perder vigencia documental

Pasajero usa Convertirme en conductor, completa requisitos y recibe capacidad del servidor.
La elección de uso se guarda aparte de documentos/eligibilidad. Tras habilitación aparecen
las acciones correspondientes sin duplicar identidad ni perder participación ajena.
Con fixture autorizado se vence licencia/SOAT; el backend impide nueva publicación/START
cuando faltan condiciones y UI orienta renovar. Con matrícula vigente conserva pasajero
más sus datos/historial/renovación autorizados. Identificadores ajenos nunca amplían acceso.
La política de cancelación/finalización del viaje existente respeta seguridad/propiedad,
no un bypass general de conducción. Cambiar capacidad no borra historial ni inventa permisos.

## G — Desplazamiento y ciclo de vida

Conductor publica DESDE_USC o HACIA_USC con campus institucional, encuentro libre interior
y extremo externo elegido cartográficamente; vista previa coincide con snapshot guardado.
Pasajero confirma directamente en par autorizado; desde USC aborda en origen. HACIA_USC
permite propuesta compatible separada, decide dueño, después confirma si aún hay plaza.
Abordaje registra presencia sin segunda plaza. Inicio, recogida intermedia, finalización,
cancelación y retiro permitido siguen actores/precondiciones y conservan historia.
No exigir que todo pasajero hacia USC ya haya abordado en el origen si su recogida es posterior;
validar el punto y el momento conforme a la política efectiva de recorrido.

Reintento por red y carrera de última plaza muestran el resultado real, sin contador sólo
visual. Viaje lleno no equivale a iniciado. Chat/ratings/costos/QR/SOS se incorporan sólo
según implementación y permisos efectivos; pendientes no tienen botones ficticios.
Prueba: último cupo201/409, cancelación/inicio concurrentes, autorización del propietario,
paradas/estado correctos y consulta de historial. Complementarios requieren evidencia propia.

## Evidencia de cada recorrido

Registrar necesidad/actor/entrada/precondiciones, reglas Nest, datos persistidos,
consumidores, fallo/recuperación, respuesta visual y test E2E. Inspeccionar capturas de
escritorio/móvil y negativas de menú/URL/API. No publicar correos reales, tokens, documentos,
preferencias privadas o imágenes de carnés. Expo Go físico, SMTP real, provider académico y
mapas viales operativos son integraciones/pruebas distintas de fixtures y viewport web.

## H — Calificar un viaje completado

El conductor cierra el viaje después del abordaje. El participante habilitado
abre el aviso y consulta su lista de personas evaluables. Elige de una a
cinco estrellas y puede registrar un comentario privado. Tras enviar y
recargar, la calificación permanece en su historial y la reputación compartida
muestra el nuevo promedio en la capacidad evaluada.

Errores verificables incluyen faltas de abordaje, acceso ajeno, rango
inválido y dos envíos al mismo tiempo. El reintento no modifica una nota ya
confirmada. La nota compartida sólo expone la media y su cantidad.

## I — Compartir un tramo en grupo

El organizador elige el tramo y el número de integrantes, y entrega un código
temporal. La otra persona abre el flujo de grupos, consulta las condiciones y
consiente individualmente. El código puede rotar y vence al llegar la hora de
salida o al cumplir dos horas. Antes de confirmar, los integrantes pueden
retirar su consentimiento y el organizador puede revocar la invitación.

Tras reunir todos los consentimientos, el organizador confirma. Si sigue abierto
el viaje y hay plazas, todos reciben participaciones individuales y avisos en
una transacción. Si faltan plazas, se informa el conflicto y se preservan cupo
e historial. Cada participante confirmado puede retirarse desde su participación
según las condiciones del viaje.

## J — Abordar y consultar seguridad en viaje

El pasajero confirmado solicita el QR y lo muestra al titular. Desde un móvil
compatible el conductor escanea el código en la parada autorizada. El código
caducado, usado o de otra parada se rechaza. El conductor también puede usar el
abordaje manual. La validación del escáner físico corresponde al
[procedimiento de Expo Go](../development/MOBILE_TESTING.md).

Durante un viaje activo, el titular puede compartir voluntariamente una muestra
de ubicación. Sólo participantes autorizados acceden a la última muestra vigente.
El panel de seguridad ofrece un resumen mínimo para revisar antes de compartir y
un paso de confirmación para abrir el marcador del 123 en Cali. El usuario elige
el destino y completa la acción en su dispositivo.

## K — Estimar costos privados

El conductor abre «Costos estimados» del viaje y registra combustible, peajes y
estacionamiento en COP enteros. El sistema devuelve la suma guardada. Recargar
conserva los importes. Después de iniciar la estimación permanece consultable
para el titular. Las fichas públicas del viaje permanecen libres de costos
privados del conductor.
