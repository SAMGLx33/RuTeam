# Matriz de autorización del producto

Incremento A, transformación integral del 25/11/2026. **Diseño normativo pendiente de
verificación de implementación.** Fuente: PRODUCT_DEFINITION. La UI adapta navegación;
Nest valida sesión, correo, elegibilidad, capacidad, propietario y estado del recurso.
No hay actor ni permiso administrativo de producto. Operación de infraestructura es distinta.

## Dimensiones independientes

1. **Identidad/sesión:** cuenta individual autenticada con sesión válida y revocable.
2. **Correo:** dominio @usc.edu.co y control comprobado del buzón, por separado.
3. **Elegibilidad:** estudiante vigente acreditado por fuente autorizada y política actual.
   Pendiente, no elegible, vencido o revocado no acceden a operaciones de viajes.
4. **Preferencia:** pasajero o conductor y pasajero; elección editable que no concede permiso.
5. **Capacidad:** operación permitida ahora por condiciones institucionales/documentales.
6. **Recurso:** titular/propietario/participante, modalidad, fecha, estado, paradas y cupos.

No inferir matrícula desde dominio, correo confirmado, contraseña, foto/carné/QR o seed.
No inferir capacidad desde preferencia, menú visible ni flag enviado por el cliente.
Fuente institucional real ausente falla cerrada para viajes, conservando acceso limitado
expreso a la cuenta. Las etiquetas siguientes son semánticas; no obligan a crear seis enums.

## Permisos

«Propio» exige identidad de sesión y autorización del recurso en backend.
«Condicionado» exige las reglas indicadas y no se concede por la columna solamente.
Toda columna de estudiante requiere sesión válida, correo verificado y matrícula vigente.

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
