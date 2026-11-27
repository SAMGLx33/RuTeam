# Actualización en tiempo real

NestJS ofrece `GET /realtime` y `GET /realtime/trips/:id` como flujos SSE. La sesión web usa la cookie HttpOnly. En nativo usa el bearer existente en cabecera. El cliente SDK 54 usa `expo/fetch` para leer el flujo y conserva las consultas HTTP y su sondeo como recuperación. La conexión se restablece con espera incremental tras perder red o volver con la app activa. [Expo SDK 54, streaming fetch](https://github.com/expo/expo/blob/sdk-54/docs/pages/versions/v54.0.0/sdk/expo.mdx)

## Eventos

| Señal            | Origen y alcance                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `READY` / `PING` | Inicio de conexión y comprobación periódica. Al reconectar el cliente revalida consultas activas.                                            |
| `FEED`           | Cambio de estado o disponibilidad. Señal general para estudiantes vigentes, sin ID ni datos de viaje.                                        |
| `TRIP`           | Cambio de viaje, plazas, participación, parada o propuesta. El ID se entrega al conductor y a las cuentas con relación actual con el viaje.  |
| `CHAT`           | Mensaje persistido. Usa la política de conversación existente antes de entregar la señal.                                                    |
| `TRACKING`       | Cambio en la última ubicación efímera. El flujo se limita al conductor o participante confirmado de un viaje en curso.                       |
| `PERSON`         | Cambios propios de bandeja, lectura, membresía, grupos o plantillas. El flujo no incluye usuario, aviso ni identificadores de otras cuentas. |
| `SESSION_ENDED`  | Revocación, vencimiento o pérdida de acceso. El cliente reconsulta su identidad y cierra el flujo.                                           |

Los triggers llaman `pg_notify` dentro de la operación. PostgreSQL entrega a `LISTEN` sólo tras el commit. Cada réplica de Nest usa una conexión dedicada de escucha. El contenido del aviso es una clave interna. Nest agrupa señales recientes, valida sesión y acceso antes de emitir y aplica límites de conexión y de cola. Al reconectar, las consultas obtienen el estado actual de PostgreSQL. El flujo no tiene un historial aparte.

Las rutas de operación, chat, bandeja y ubicación validan cada consulta independientemente. El pase QR, cambios de parada y cierre mantienen las transacciones vigentes. La sesión de la API sigue siendo la autoridad.

## Operación

Permitir conexiones HTTP largas y desactivar buffering de respuestas SSE en el proxy. La API envía `X-Accel-Buffering: no`. Si se usa PgBouncer, la conexión que ejecuta `LISTEN` necesita un endpoint PostgreSQL directo o pooling por sesión. `DATABASE_URL` ya señala PostgreSQL en el entorno local. Si falla la escucha, se cierran los flujos, se reintenta la conexión y la app conserva HTTP.
