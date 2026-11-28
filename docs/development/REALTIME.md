# Actualización en tiempo real

NestJS ofrece `GET /realtime` y `GET /realtime/trips/:id` como flujos SSE. La sesión web usa la cookie HttpOnly. En nativo usa el bearer existente en cabecera. El cliente SDK 54 usa `expo/fetch` para leer el flujo y conserva las consultas HTTP y su sondeo como recuperación. La conexión se restablece con espera incremental tras perder red o volver con la app activa. [Expo SDK 54, streaming fetch](https://github.com/expo/expo/blob/sdk-54/docs/pages/versions/v54.0.0/sdk/expo.mdx)

## Eventos

| Señal            | Origen y alcance                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `READY` / `PING` | Inicio de conexión y comprobación periódica. Al reconectar el cliente revalida consultas activas.                                               |
| `FEED`           | Cambio de estado o disponibilidad. Señal general para estudiantes vigentes, sin ID ni datos de viaje.                                           |
| `TRIP`           | Cambio de viaje, plazas, participación, parada o propuesta. El ID se entrega al conductor y a las cuentas con relación actual con el viaje.     |
| `CHAT`           | Mensaje persistido. Usa la política de conversación existente antes de entregar la señal.                                                       |
| `TRACKING`       | Cambio en la última ubicación efímera. El flujo se limita al conductor o participante confirmado sin ausencia ni descenso de un viaje en curso. |
| `PERSON`         | Cambios propios de bandeja, lectura, membresía, grupos o plantillas. El flujo no incluye usuario, aviso ni identificadores de otras cuentas.    |
| `SESSION_ENDED`  | Revocación, vencimiento o pérdida de acceso. El cliente reconsulta su identidad y cierra el flujo.                                              |

Los triggers llaman `pg_notify` dentro de la operación. PostgreSQL entrega a `LISTEN` sólo tras el commit. Cada réplica de Nest usa una conexión dedicada de escucha. El contenido del aviso es una clave interna. Nest agrupa señales recientes, valida sesión y acceso antes de emitir y aplica límites de conexión y de cola. Al reconectar, las consultas obtienen el estado actual de PostgreSQL. El flujo no tiene un historial aparte.

Las rutas de operación, chat, bandeja y ubicación validan cada consulta independientemente. El pase QR, cambios de parada y cierre mantienen las transacciones vigentes. La sesión de la API sigue siendo la autoridad.

## Recuperación del cliente

El navegador detecta la pérdida y el regreso de red. El cliente nativo usa el
resultado de HTTP y revalida al regresar a primer plano. La app indica cuándo
se perdió la conexión o se están reconectando HTTP o SSE. La lectura que
permanece visible durante el corte se identifica como desactualizada y se
conserva en memoria hasta cinco minutos desde la última validación de la sesión.
Al recuperar la conexión o recibir `READY` se consultan de nuevo los datos activos.
Una señal `SESSION_ENDED` limpia los datos privados y consulta la cuenta para
distinguir una sesión rechazada de un cambio de elegibilidad. El cierre de sesión
o cambio de cuenta cancela consultas y elimina los datos privados del cliente.

Las escrituras que todavía no salieron por falta de red informan que no fueron
enviadas. Una respuesta perdida después del envío informa resultado desconocido
y revalida consultas. Los rechazos de Nest muestran el error correspondiente.
Las mutaciones de TanStack Query se intentan en el momento de la acción y quedan
sin reenvío automático. Si se pierde la respuesta al enviar un mensaje, el
historial confirma el envío por `clientMessageId`, visible sólo a su remitente.
El reintento manual del mismo mensaje usa el mismo identificador.

## Operación

Permitir conexiones HTTP largas y desactivar buffering de respuestas SSE en el proxy. La API envía `X-Accel-Buffering: no`. Si se usa PgBouncer, la conexión que ejecuta `LISTEN` necesita un endpoint PostgreSQL directo o pooling por sesión. `DATABASE_URL` ya señala PostgreSQL en el entorno local. Si falla la escucha, se cierran los flujos, se reintenta la conexión y la app conserva HTTP.

SSE revalida la sesión y política de acceso vigente en cuentas académicas.
La configuración pública de acceso se puede leer durante el arranque de sesión.
Las consultas privadas permanecen ligadas a la cuenta.
