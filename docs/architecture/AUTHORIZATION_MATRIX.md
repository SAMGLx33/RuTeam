# Matriz de autorización del producto

Incremento A, transformación integral del 25/11/2026. **Diseño normativo pendiente de
verificación de implementación.** Fuente: PRODUCT_DEFINITION. La UI adapta navegación;
Nest valida sesión, correo, elegibilidad, capacidad, propietario y estado del recurso.
No hay actor ni permiso administrativo de producto. Operación de infraestructura es distinta.

## Dimensiones independientes

1. **Identidad/sesión:** cuenta individual autenticada con sesión válida y revocable.
2. **Correo:** dominio @usc.edu.co y control comprobado del buzón, por separado.
3. **Elegibilidad:** dominio declarado en el modo académico o fuente autorizada
   en modo oficial. Suspensión y revocación restringen el acceso.
4. **Preferencia:** pasajero o conductor y pasajero; elección editable que no concede permiso.
5. **Capacidad:** operación permitida ahora por condiciones institucionales/documentales.
6. **Recurso:** titular/propietario/participante, modalidad, fecha, estado, paradas y cupos.

No inferir matrícula desde dominio, correo confirmado, contraseña, foto/carné/QR o seed.
No inferir capacidad desde preferencia, menú visible ni flag enviado por el cliente.
El modo oficial sin fuente falla cerrado para viajes, conservando acceso limitado
expreso a la cuenta. Las etiquetas siguientes son semánticas; no obligan a crear seis enums.

## Permisos

«Propio» exige identidad de sesión y autorización del recurso en backend.
«Condicionado» exige las reglas indicadas y no se concede por la columna solamente.
Cada columna de producto requiere sesión válida y la política institucional configurada.

| Operación                                                                  | Sin sesión                                | Cuenta sin elegibilidad de viajes             | Estudiante pasajero                                              | Conducción inhabilitada, estudiante vigente                               | Conductor habilitado                                 |
| -------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Registrarse/iniciar/recuperar acceso                                       | Sí, dominio/DTO/límites y errores seguros | Sin elevar permisos; gestionar cuenta propia  | Cuenta propia                                                    | Cuenta propia                                                             | Cuenta propia                                        |
| Verificar/reemitir correo por token/cuenta                                 | Token/canal válido y controles            | Sí, cuenta propia                             | Sí, cuenta propia                                                | Sí, cuenta propia                                                         | Sí, cuenta propia                                    |
| Ver estado de cuenta/verificación y cerrar sesión                          | Sin datos privados                        | Sí, propia; logout aunque perdió elegibilidad | Sí, propia                                                       | Sí, propia                                                                | Sí, propia                                           |
| Completar nombre y preferencia de uso/onboarding básico                    | No                                        | Sí, propio; no habilita viajes                | Sí                                                               | Sí                                                                        | Sí                                                   |
| Feed, búsqueda, detalle de viajes y recomendaciones                        | No                                        | No                                            | Sí                                                               | Sí                                                                        | Sí; no recomendar su propio viaje como pasajero      |
| Preferencias privadas de movilidad y avisos de viajes                      | No                                        | No                                            | Propias                                                          | Propias                                                                   | Propias                                              |
| Confirmar/retirar participación y consultar la propia                      | No                                        | No                                            | Condicionado                                                     | Condicionado                                                              | Condicionado; nunca viaje propio                     |
| Proponer recogida o consultar propuestas propias                           | No                                        | No                                            | Sólo HACIA_USC compatible                                        | Igual                                                                     | Igual en viaje ajeno                                 |
| Iniciar «Convertirme en conductor» y gestionar vehículo/documentos propios | No                                        | No                                            | Sí, como onboarding voluntario; no publica                       | Sí, para completar/renovar                                                | Sí                                                   |
| Publicar y solicitar alternativas de recorrido de publicación              | No                                        | No                                            | No                                                               | No hasta recuperar habilitación                                           | Sí, condiciones/documentos/vehículo vigentes         |
| Consultar viajes propios históricos y estado de documentación              | No                                        | No                                            | Sólo si tiene recursos propios del proceso de conducción         | Sí, propios                                                               | Sí, propios                                          |
| Consultar participantes/decidir propuestas del viaje                       | No                                        | No                                            | No como pasajero; sólo contexto propietario si existe            | Lectura propia y decisiones sólo conforme a política de seguridad/estado  | Propietario, modalidad/estado compatibles            |
| Registrar abordaje o iniciar viaje                                         | No                                        | No                                            | No                                                               | No hasta cumplir condiciones exigidas                                     | Propietario; participación/estado/documentos válidos |
| Cancelar/finalizar viaje propio existente                                  | No                                        | No                                            | Sin facultad sobre viajes ajenos                                 | Propietario, transición de seguridad válida; no concede nueva publicación | Propietario, transición válida                       |
| Leer/marcar notificaciones internas                                        | No                                        | No                                            | Sólo destinatario                                                | Sólo destinatario                                                         | Sólo destinatario                                    |
| Chat/calificaciones/complementarios                                        | No                                        | No                                            | Sólo interacción/participación autorizada y función implementada | Igual                                                                     | Igual; sin facultad global                           |

La renovación documental no retira por sí sola la capacidad pasajero. La pérdida de
matrícula sí restringe todas las operaciones del producto; no reutilizar una sesión vieja
para conservar datos o privilegios. No bloquear logout por estado académico.
La política concreta de mutaciones sobre un viaje existente al perder capacidad se revisa
antes de habilitarlas: lectura/renovación no implican permiso para START/BOARD/publicar.
No inventar un bypass general de «propietario» que ignore afiliación o seguridad.

## Aplicación y respuestas

Control de sesión de cuenta distinto del guard de estudiante y del permiso conductor.
El controller delega al caso de uso; mutaciones revalidan recursos dentro de su transacción.
El contrato de sesión devuelve estado/capacidades efectivos mínimos, nunca hashes,
verificadores, SMTP, documentos o ubicaciones privadas de terceros. Client no los asigna.

401 indica sesión no válida; 403 indica autorización insuficiente con sesión válida;
409 representa conflicto de estado/capacidad cuando corresponde. Respuestas públicas de
registro/recuperación no deben enumerar cuentas. Los códigos/DTO exactos se consolidan en
API/Swagger al implementar; esta matriz no crea endpoints por sí sola.

Al cambiar sesión o elegibilidad, invalidar/cancelar lecturas privadas para impedir que
un usuario vea caché de otro. Evitar servir feed almacenado a una cuenta no autorizada.
Cookies/CSRF/CORS/rate limit y SecureStore siguen aplicando también a cuenta convencional.

## Pruebas de aceptación negativas

Probar cada restricción tanto por HTTP como con URL directa/controles de interfaz:
pasajero publicando, driver con documentos vencidos, estudiante pendiente/revocado,
rol/capacidad inyectados, identificadores ajenos, datos/capacidades de caché antiguas,
recuperación de contraseña/sesión caducada y cierre tras baja. Verificar que preferir
conducir sólo inicia habilitación, y que driver conserva funciones de pasajero ajeno.
Ocultar botones no acredita autorización; HTTP200 aislado no acredita el flujo completo.

## Reglas añadidas en consolidación

Todos estos accesos requieren estudiante vigente. Los promedios públicos de
viajes se entregan a estudiantes autorizados a ver el viaje.

| Caso                               | Actor y contexto                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Enviar o leer evaluaciones propias | Propietario o pasajero que abordó en viaje completado. El otro rol se deriva del registro del viaje. Comentario sólo por autor  |
| Gestionar invitaciones de grupo    | Organizador, grupo abierto y viaje futuro disponible. Consultar y consentir con código y sesión; confirmar sólo el organizador  |
| Abordaje QR                        | Titular emite en contexto válido. El conductor del viaje usa el código en la parada vigente. Canje transaccional y de uso único |
| Seguridad y posición               | Propietario o participante confirmado sin ausencia, viaje en curso. Compartir/retirar posición está reservado al conductor      |
| Estimación COP                     | Sólo propietario. Edición en PROGRAMADO y consulta posterior del registro propio                                                |

## Economía y seguridad del cierre

| Recurso                       | Actor y condición                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Desglose y revisión económica | Conductor habilitado para revisión. Titular para desglose de viaje persistido.                                                                   |
| Condiciones económicas        | Mismas reglas de acceso que detalle publicado, reserva o invitación.                                                                             |
| Compensación por reserva      | Titular y propietario leen. Titular confirmado y abordado declara después del cierre. Conductor reconoce/discrepa. Titular cancela sin resolver. |
| Contactos                     | Cuenta propietaria. Se requiere estudiante vigente en la API del perfil protegido.                                                               |
| Incidencia                    | Durante el viaje, propietario o confirmado sin ausencia. Después, propietario o abordado. Historial del autor con sesión y elegibilidad.         |
| Ubicación                     | Propietario escribe durante viaje activo. Participantes autorizados leen. El estado final carece de coordenadas.                                 |

## Permisos de continuidad

| Operación                                            | Permiso y condición                                                                                                                                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crear, editar, duplicar o generar viajes recurrentes | Conductor titular. Publicación sujeta a afiliación, documentos, vehículo, capacidad, ruta vigente y horario compatible. Las acciones de pausa y cierre de plantilla siguen disponibles al titular. |
| Desactivar, solicitar eliminación o revocar sesiones | Cuenta propia con sesión y contraseña actual. El cierre se serializa frente a operaciones de participación. Un viaje con participación activa impide el cierre.                                    |
| Consultar estado y recuperar                         | Titular con credenciales de RuTeam. Reactivación voluntaria disponible tras retirar toda solicitud abierta. La elegibilidad de estudiante se evalúa aparte.                                        |
| Consultar movilidad e historial económico            | Estudiante vigente. Movilidad propia. El conductor ve sus gastos y agregados de sus viajes. El pasajero ve sólo sus participaciones y sus declaraciones.                                           |
| Interrumpir viaje activo                             | Conductor titular con motivo y confirmación de cierre seguro. Mantiene el acceso de cierre previsto al caducar documentos.                                                                         |
| Retirar una plaza o revocar una invitación           | Titular de la participación o del consentimiento individual. El organizador puede revocar la invitación sin retirar reservas existentes.                                                           |
| Consultar o exportar incidencia                      | Autor del registro. Guardar exige contexto de viaje activo o historial de conducción/abordaje según el estado. Compartir exige decisión explícita en el cliente.                                   |

## Autorización de la evolución

| Recurso                                            | Permiso                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Energía de vehículo y reutilización de publicación | Dueño. Se verifica el campus, las paradas y geometría persistidos antes de confiar en los tiempos originales.                                                             |
| Resultado ambiental y alternativa                  | Conductor titular del viaje completado o pasajero abordado. Sólo el pasajero con reserva individual puede indicar su alternativa. Los datos de atribución son personales. |
| SSE                                                | Sesión y elegibilidad vigente. Antes de emitir chat, viaje o ubicación se verifica la relación con el recurso. La revocación cierra el flujo.                             |
| Operación del viaje                                | Conductor o miembro de una participación propia. El manifiesto y sus conteos son del conductor.                                                                           |
| Actividades y agenda                               | Sólo registros vinculados a la cuenta autenticada. Una previsión de plantilla no equivale a oferta.                                                                       |
| Preferencias y registros push                      | Titular con sesión vigente. El registro exige consentimiento y secreto de instalación. Logout, cambio de sesión y desactivación invalidan entregas de la sesión anterior. |

## Operación y datos personales

| Acción                                            | Alcance                                                                                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Editar descripción, publicación o informar demora | Conductor propietario con sesión de producto y viaje programado. Nest revalida la elegibilidad según el cambio y las referencias existentes. |
| Registrar descenso                                | Conductor propietario del viaje activo con pasajero a bordo y parada autorizada alcanzada.                                                   |
| Retirar participación programada                  | Solicitante antes del abordaje. El historial sigue visible a los actores autorizados.                                                        |
| Consultar GPS activo                              | Conductor o participante confirmado vigente que no haya descendido ni tenga ausencia.                                                        |
| Guardados, lugares, preferencias, agenda y avisos | Usuario autenticado, acceso a sus propios registros.                                                                                         |
| Responder a un deep link de aviso                 | Permisos de sesión y del endpoint de destino. El enlace no concede acceso.                                                                   |

Las maniobras se proyectan al conductor propietario. La estimación GPS conserva
las autorizaciones y las acciones manuales de llegada.

### Recuperación OTP en acceso declarado

| Operación                                                     | Autorización                                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Ver el medio enmascarado, solicitar o validar su confirmación | Sólo sesión propia vigente.                                                                         |
| Configurar o cambiar el medio                                 | Sesión propia y contraseña actual. El medio confirmado sigue vigente hasta confirmar el nuevo.      |
| Solicitar recuperación                                        | Público, sólo correo USC. Respuesta genérica y límites por cuenta, contacto e IP.                   |
| Validar un OTP de recuperación                                | OTP vigente y propio de la cuenta y del propósito. Concede un permiso temporal de restablecimiento. |
| Cambiar la contraseña                                         | Permiso opaco de un solo uso. Revoca las sesiones anteriores.                                       |

Los perfiles públicos nunca incluyen el medio de recuperación. La consola
local no verifica la titularidad ni concede acreditación USC.
