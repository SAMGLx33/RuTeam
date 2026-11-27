# Handoff — seguimiento y conectividad

- Fecha 27 de noviembre de 2026. Rama local `task/trip-operations`.
- Incremento 4, §§21–22 y 25–26 de la especificación operativa. RF-015, RF-018 y RNF-032.
- Revisión humana por asignar.

## Cambios

- `TripLocation` conserva su entrada desde Seguridad y la operación de viaje.
  El conductor titular puede activar, pausar, reanudar y detener la compartición.
  Antes de suscribirse se verifica con Nest que el viaje y la cuenta estén
  autorizados. El observador se cancela al salir de la pantalla, pasar a segundo
  plano, perder conexión o autorización y cerrar el viaje o la sesión. La pausa
  conserva el último punto vigente y detenerlo solicita su retiro al servidor.
- El cliente usa `watchPositionAsync` de Expo en nativo. En navegador se usa la
  API Geolocation, de modo que el identificador de `clearWatch` coincida con
  el que devuelve el navegador. El adaptador web de SDK 54 asigna un identificador
  distinto al registro de Expo. Se usa sólo la muestra válida más reciente y
  se inicia como máximo un envío cada 15 segundos. Ninguna muestra se guarda en disco.
  [Fuente de Expo SDK 54](https://github.com/expo/expo/blob/sdk-54/packages/expo-location/src/ExpoLocation.web.ts)
- `TripDriverPosition.accuracyMeters` es nullable. GPS muestra hora de captura,
  antigüedad y precisión cuando se conoce. Si la precisión es desconocida o
  supera 100 m, se omite el marcador puntual y se conserva el esquema publicado.
  El mapa distingue el recorrido publicado de la ubicación observada. Los estados
  `AVAILABLE`, `STALE`, `NOT_SHARED` y `ENDED` mantienen la caducidad de dos minutos.
- La migración incremental `20261127040000_trip_location_accuracy` añade el campo
  de precisión y `Trip.trackingRevokedThroughAt`. `DELETE /trips/:tripId/location`
  usa la última hora enviada para invalidar peticiones demoradas que lleguen
  después de confirmar el retiro. Nest mantiene el bloqueo conductor → viaje.
  El descenso revoca la lectura GPS sin eliminar el acceso a contextos permitidos.
- El estado de conexión se muestra en las pantallas protegidas. El navegador
  detecta cambios de red y el cliente nativo revalida por HTTP y al regresar a
  primer plano. Los datos en memoria se indican como desactualizados durante el
  corte y se retiran cinco minutos después de la última validación de cuenta.
  `READY` en SSE repone las lecturas activas y `SESSION_ENDED` vuelve a validar
  la cuenta. Cierre, revocación o cambio de cuenta limpian las consultas y mutaciones privadas.
- El cliente separa rechazo HTTP, solicitud que no salió y resultado desconocido.
  Reconsulta lecturas ante un resultado incierto y deja a la operación original
  las reglas de autorización e idempotencia de Nest. La configuración de
  TanStack Query intenta la mutación en el momento de la acción. Un mensaje usa
  el mismo ID si se reintenta, y una lectura recuperada confirma su envío si el
  remitente encuentra ese ID en el historial. El destinatario no recibe
  `clientMessageId`.

## Pruebas

- `db:test:setup` aplicó las 30 migraciones del árbol local y datos sintéticos en
  PostgreSQL `ruteam_tracking_test` en el puerto 55432 usando variables de proceso.
- Jest de `trip-tracking.e2e.test.mjs` y `chat.e2e.test.mjs` pasó 2 suites y 3 casos.
  Cubren, entre otros, precisión con y sin reporte, muestras inválidas y revocadas,
  límite de envío, acceso, borrado, y deduplicación e identificador propio del chat.
- La comprobación de tipos del cliente, ESLint focalizado y `git diff --check`
  pasaron durante la implementación.
- Las pruebas Playwright de `safety.spec.ts` y `connectivity.spec.ts` cubren escritorio
  y viewport móvil web. Usan Chromium del caché local porque el plugin Browser no
  estuvo disponible. Los cuatro casos pasaron en la regresión web integral.
  La comprobación física en Expo Go queda pendiente.

## Continuidad

El seguimiento nativo requiere verificar permisos, pausa al pasar a segundo plano
y precisión en dispositivo. La proyección de SSE depende de la escucha PostgreSQL existente y la
operación conserva sondeo HTTP. La recuperación de conectividad no incorpora
almacenamiento persistente ni ejecución de acciones críticas diferidas.
