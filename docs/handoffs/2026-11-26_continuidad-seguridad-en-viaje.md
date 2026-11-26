# Seguridad durante el viaje · RF-011

26/11/2026, America/Bogota. Codex. Responsables humanos de Viajes, QA y Producto
POR_ASIGNAR. Rama `task/driver-defined-routes`, base
`5af65f2d1c11f3b6091af21605a3eab21a50e163` con la transformación y continuidad
previas en el árbol. El punto de control y los logs están en
`/home/darik/RuTeam/.local-data/consolidacion-2026-11-26`.

RF-011 queda parcial. La ERS describe mensajería SOS y un registro de contactos.
La definición vigente permite consultar el contexto, compartir por el mecanismo
del sistema con selección humana del destinatario y llamar desde el marcador.
Un registro de incidentes, sus destinatarios, tratamiento y retención requieren
una decisión de Producto. La app no despacha, no registra contactos y no afirma
que se haya enviado un mensaje. El 123 es la línea única de emergencias en Cali.
[Decreto 457 de 2025 de Santiago de Cali](https://normagrama.cali.gov.co/compilacion/docs/d_alcacali_0457_2025.htm).

`GET /api/v1/trips/:tripId/safety` requiere sesión estudiantil vigente. Devuelve
dirección, estado activo, salida prevista, inicio real, última parada registrada
y próxima parada con un horario previsto cuando hay estimaciones publicadas.
El titular y los miembros de una participación confirmada sin ausencia pueden
acceder. Sin sesión devuelve 401, afiliación inactiva 403 y sin acceso al
recurso 404. No incluye coordenadas, teléfonos, nombres, matrículas o enlaces
externos. `Cache-Control: private, no-store`. Nest autoriza y aplica la política
de proyección. Prisma lee la misma participación que los otros servicios.

`/safety/[tripId]` se abre desde el viaje propio o la participación activa.
El resumen muestra su texto antes de abrir un selector del sistema que admite
texto. Si no existe, el texto se puede seleccionar manualmente. El flujo del 123
muestra la acción y solicita otra pulsación antes de abrir el marcador. La prueba
web intercepta el selector del sistema y finaliza antes de abrir el marcador.
El teléfono físico y el diálogo de selección real quedan pendientes de QA.
[React Native Share](https://reactnative.dev/docs/0.81/share) ·
[React Native Linking](https://reactnative.dev/docs/0.81/linking).

Sin migración, datos de prueba o variables nuevas para la consulta de seguridad.
Véanse el módulo `backend/src/modules/safety`, el contrato
`packages/contracts/src/trip-safety.ts`, la ruta Expo, las pruebas HTTP
`trip-safety.e2e.test.mjs` y el recorrido web `tests/web/safety.spec.ts`.

## QR y ubicación

Expo 54 incluye las versiones nativas de `expo-camera` ~17.0.10 y
`expo-location` ~19.0.8, según el manifiesto del paquete instalado y la
rama de fuentes SDK 54. El proyecto aún no tiene cámara integrada. El lector
propuesto usa `CameraView` y permisos en el momento de escanear, con fallback al
abordaje manual. Un token opaco aleatorio de propósito único se muestra al
pasajero, se persiste con hash, expira y se consume bajo el bloqueo
conductor → viaje junto con el registro de abordaje. El token se vincula a viaje,
participación, estudiante y parada; no contiene identidad, coordenadas ni
credenciales institucionales. QA debe comprobar un escaneo duplicado, pertenencia,
caducidad, parada, revocación y una cámara física antes de declarar el criterio.
[Expo Camera, SDK 54](https://github.com/expo/expo/tree/sdk-54/packages/expo-camera).

La alternativa de ubicación compatible es en primer plano. Un punto sólo se
obtiene tras permiso y acción explícita del propietario de un viaje activo; el
servidor limita frecuencia y consulta, identifica antigüedad y cesa en cierre o
cancelación. Evitar rastreo en segundo plano en Expo Go. El navegador necesita
contexto seguro para permisos de cámara y posición. Las compilaciones y un
viewport móvil no acreditan los sensores de un teléfono.
[Expo Location, SDK 54](https://github.com/expo/expo/tree/sdk-54/packages/expo-location).

Mensaje propuesto para revisión: `feat(safety): add trip context and explicit system handoffs`.
