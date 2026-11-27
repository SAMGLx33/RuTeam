# Preferencias de avisos y push

La bandeja de PostgreSQL, SSE dentro de la app y push del sistema operativo tienen alcances distintos. El usuario puede activar o desactivar avisos de recomendaciones, mensajes, recordatorios de calificación, recurrencias y actualizaciones opcionales. La bandeja respeta estas preferencias y mantiene las cancelaciones, confirmaciones, cambios esenciales, compensaciones e incidencias. La persona puede seguir consultando chat, actividades y recurrencias desde sus pantallas.

## Infraestructura push

- El backend habilita registro y envío con `EXPO_PUSH_ENABLED=true`. Se puede usar `EXPO_PUSH_ACCESS_TOKEN` como credencial del servidor para la seguridad reforzada de Expo.
- Un cliente nativo habilitado necesita credenciales FCM/APNs, consentimiento y el token Expo del proyecto. El registro usa una sesión vigente, plataforma y un secreto de instalación. El detalle del dispositivo vinculado expone sólo el ID, plataforma y fecha.
- Cada aviso nuevo encola una entrega por dispositivo activo. La clave por aviso y dispositivo evita duplicados en PostgreSQL. La cola se reclama con lease y `SKIP LOCKED`. Tiene reintentos acotados y aplica las preferencias y revocación antes de enviar. Una pérdida de respuesta de la red puede dejar un envío de resultado incierto en el proveedor.
- El ticket confirma aceptación de Expo. El recibo confirma aceptación de APNs/FCM. `DeviceNotRegistered` revoca el dispositivo. La entrega en pantalla se comprueba en un teléfono. [API de envío, tickets y recibos](https://docs.expo.dev/push-notifications/sending-notifications/)

## Consentimiento y registro

La bandeja y las preferencias funcionan en web, Expo Go y compilaciones de RuTeam. En **Preferencias de avisos**, una compilación nativa configurada en un dispositivo físico ofrece **Activar avisos en este dispositivo** cuando Nest habilita el registro. Esta acción comprueba el permiso del sistema y registra el token con la sesión vigente. Android crea el canal **Avisos de RuTeam** antes de pedir permiso. `npm run dev:client` sigue abriendo Metro para Expo Go. [Configuración oficial](https://docs.expo.dev/push-notifications/push-notifications-setup/) · [Condiciones de Expo Go](https://docs.expo.dev/push-notifications/faq/) · [Referencia SDK 54](https://github.com/expo/expo/blob/sdk-54/docs/pages/versions/v54.0.0/sdk/notifications.mdx)

SecureStore conserva un secreto aleatorio de la instalación y el registro asociado a la sesión. La instalación puede volver a usar su secreto para acreditar la posesión del mismo token después de un nuevo consentimiento. Al volver a primer plano o rotar el token, el cliente verifica permiso y registro activo. Si cambia el token Expo, revoca el anterior y registra el nuevo. Una respuesta de registro incierta se puede comprobar en la lista de dispositivos y reintentar desde Preferencias. La revocación del dispositivo actual limpia su registro local. El cierre y el cambio explícito de cuenta invalidan también la sesión previa. Una sesión nueva exige su propio consentimiento.

## Apertura de avisos y enlaces internos

La pantalla bloqueada recibe un título y texto genéricos. Al pulsar un aviso, tanto en frío como con la aplicación iniciada, el cliente conserva el identificador del aviso y pide sesión cuando sea necesaria. Nest consulta el aviso propio mediante `POST /notifications/:id/read` y devuelve su disponibilidad vigente. La pantalla que abre el cliente consulta su recurso en Nest. Si la acción ya venció o el aviso pertenece a otra cuenta, se muestra un estado comprensible con acceso a la bandeja.

En una compilación instalada, el esquema `ruteam` permite estos destinos internos:

| Enlace                             | Destino                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `ruteam://open/trip/<id>`          | Detalle de viaje permitido para el estudiante                                     |
| `ruteam://open/chat/<id>`          | Conversación del viaje autorizada por Nest                                        |
| `ruteam://open/group/<código>`     | Formulario de grupo con el código cargado para consultar y consentir por separado |
| `ruteam://open/activity`           | Mis actividades                                                                   |
| `ruteam://open/activity/<id>`      | Actividad específica mientras figure en los pendientes de la cuenta               |
| `ruteam://open/records`            | Historial de mis participaciones                                                  |
| `ruteam://open/records/<id-viaje>` | Registro propio autorizado de un viaje                                            |

El código de invitación se conserva temporalmente en memoria y el cliente lo retira de la ruta interna. Los enlaces usan el esquema local de la app instalada. El formulario de ingreso por código permanece disponible. [Enlaces nativos de Expo Router](https://docs.expo.dev/router/advanced/native-intent/)

## Compilación de desarrollo opcional

Se conservan Expo SDK 54 y el identificador local `org.ruteam.demo`. La configuración incluye `expo-dev-client` y el plugin `expo-notifications`. Antes de compilar para validar push se requiere lo siguiente:

| Configuración                                             | Origen                                                                                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_EAS_PROJECT_ID`                              | UUID de un proyecto Expo existente y autorizado. Entra en `extra.eas.projectId` y es público.                                                       |
| `RUTEAM_ANDROID_PACKAGE` y `RUTEAM_IOS_BUNDLE_IDENTIFIER` | Identificadores de las apps registradas para ese proyecto. Los valores locales se pueden sobrescribir.                                              |
| `RUTEAM_ANDROID_GOOGLE_SERVICES_FILE`                     | Ruta local al `google-services.json` de la app Firebase cuyo paquete coincide con Android.                                                          |
| FCM v1 en Expo                                            | Credencial privada de la cuenta de servicio del proyecto Firebase, administrada en Expo por el equipo.                                              |
| APNs en Expo y firma iOS                                  | Credencial privada de Apple Push Notification service, firma y aprovisionamiento del equipo para ese bundle ID con la capacidad Push Notifications. |
| `EXPO_PUBLIC_API_URL`                                     | Dirección de la API alcanzable desde el teléfono de prueba.                                                                                         |
| `EXPO_PUSH_ENABLED=true`                                  | Entorno en el backend del ensayo autorizado. `EXPO_PUSH_ACCESS_TOKEN` es opcional y exclusivo del servidor.                                         |

Usa variables del proceso o el `.env` local ignorado. Conserva los archivos de Firebase y las credenciales fuera del repositorio. [Configuración de FCM v1](https://docs.expo.dev/push-notifications/fcm-credentials/) · [Configuración de credenciales de envío](https://docs.expo.dev/push-notifications/push-notifications-setup/#get-credentials-for-development-builds)

Con Android SDK y `adb` instalados, conecta el teléfono con depuración USB y verifica que `adb devices` lo reconozca. Desde el directorio `frontend`, con las variables anteriores preparadas:

```bash
npx expo install --check
npx expo run:android --device
npx expo start --dev-client --lan
```

`run:android` compila, instala e inicia Metro. Usa el último comando para reanudar Metro en sesiones posteriores. En macOS con Xcode y el dispositivo aprovisionado se puede ejecutar `npx expo run:ios --device`. `run` puede crear directorios nativos locales. [Compilación local de depuración](https://docs.expo.dev/guides/local-app-development/)

En un ensayo físico, verifica consentimiento concedido y denegado, lista y revocación, cambio de cuenta, autenticación posterior al aviso, recepción en primer plano y segundo plano y apertura en frío. Registra el resultado junto con la versión del teléfono y la compilación. La recepción física y la configuración FCM/APNs quedan pendientes de un proyecto y un equipo autorizados.

## Disponibilidad y recordatorios de movilidad

- Cada viaje guardado puede activar un aviso individual mientras esté lleno. Un trabajador vuelve a leer el viaje, la elegibilidad, las participaciones y la compatibilidad del horario antes de registrar el aviso. Al procesar la solicitud la consume en la misma transacción. Cuando se vuelve a llenar, el estudiante puede solicitar otro aviso. El cupo se decide al confirmar y puede cambiar después del aviso.
- La preferencia `reminders` controla los recordatorios opcionales. `reminderLeadMinutes` acepta 15, 30 o 60. Las cuentas que no hayan elegido un valor reciben el predeterminado de 30 minutos.
- Los recordatorios de salida, recogida, propuesta aceptada y vencimiento de documentos se calculan desde sus fechas vigentes en PostgreSQL. Las salidas recurrentes se consideran cuando ya existe el viaje publicado. La lista de actividades sigue mostrando documentos que vencen durante los próximos 30 días.
- El trabajador comprueba los estados vigentes al emitir. Los registros del viaje, la participación o el documento permanecen como datos fuente. La clave única del aviso combina el destinatario, el tipo, el registro de origen y la fecha del evento. Una reprogramación puede producir un recordatorio para la hora nueva. Los avisos registrados alimentan la misma bandeja y cola push que los demás eventos.
