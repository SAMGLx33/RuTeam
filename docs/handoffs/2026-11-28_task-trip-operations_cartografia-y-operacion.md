# Cartografía y operación del viaje

28/11/2026, America/Bogota. Trabajo local en `task/trip-operations`,
HEAD de partida `9d5f12b`. El cambio conserva 34 migraciones y el flujo OTP.

## Incremento

- El asistente mantiene las alternativas viales al volver al recorrido y
  presenta las paradas, la distancia, la duración y las maniobras asociadas.
  Si publica con una alternativa firmada, Nest verifica que corresponda al
  itinerario vigente.
- El mapa mantiene las referencias de GPS y lugares habituales en la vista
  local. Si una cámara deriva de ellas conserva la protección al caducar
  la observación.
- La operación separa posición observada, proyección, distancia restante,
  hora publicada y ETA GPS. El conductor sigue registrando cada llegada
  mediante una acción explícita.
- El matching aplica la salida demorada a la estimación de recogida. El
  chat identifica el historial temporalmente desactualizado y espera
  conectividad para ejecutar nuevas acciones.

## Entorno y verificación

Nest y Metro respondieron mediante `dev:api` y `dev:web` en modo académico
declarado. El catálogo real tiene Pampalinda, Sede Centro y Palmira sin
coordenadas de encuentro autorizadas. Nest mantiene el bloqueo de publicación
para esas referencias. El ensayo público de Photon, OSRM y XYZ consta en
[Experiencia cartográfica](../development/MAP_EXPERIENCE.md).

El recorrido web opcional se ejecuta con `RUTEAM_OTP_TEST_LOG` apuntando a
un archivo temporal privado y con `TEST_DATABASE_URL` aislada. Las cuentas
se crean con los formularios ordinarios. Photon, OSRM y la sede de prueba
son sintéticos. El auxiliar usa el puerto local 3199 y conserva el viaje
finalizado en la base de pruebas. El archivo de consola OTP se elimina
al finalizar la validación.

Queda la prueba física de cámara, GPS, SecureStore y gestos con Expo Go
compatible con SDK 54. Sigue la [guía de red local](../development/MOBILE_TESTING.md)
para VirtualBox antes de escanear el QR de Metro.

## Evidencia obtenida

- El recorrido de dos cuentas con OTP pasó en escritorio y web móvil. Usó el
  asistente y las pantallas de GPS y QR, junto con solicitudes HTTP bajo las
  mismas sesiones para confirmar, comunicar, cerrar, calificar y reconocer
  una compensación. El pasajero perdió acceso a la ubicación tras el descenso.
- Playwright integral aprobó 22 casos. Omitió cuatro casos de recuperación
  que requieren captura privada del transporte OTP. Los dos casos de
  recuperación en escritorio pasaron en una ejecución focalizada.
- Jest integral obtuvo 225 de 239 casos. Hubo 13 tiempos de espera agotados
  y una respuesta 401 en onboarding tras el agotamiento del caso que crea
  la sesión. Las cinco suites afectadas aprobaron sus 29 casos en una
  repetición focalizada con 20 s por caso. La prueba de navegación obtuvo
  3 de 3 casos. El smoke obtuvo 6 de 6 y Expo Doctor 18 de 18.
- Prisma, tipos, estilo, lint, compilación Nest y exportación de web, Android
  e iOS completados. Expo Go entregó el manifiesto de SDK 54 desde la VM.

## Archivos

- Frontend en `components/maps` y en las pantallas de publicación, selección
  de lugares, búsqueda, seguimiento, navegación, preferencias y chat.
- Backend en `mobility/application/mobility.service.ts`.
- Pruebas en `route-progress.test.mts`, `institutional-registration.spec.ts`,
  `support/mobility-journey.ts` y `playwright.config.ts`.
- Documentación en `API`, `MAP_EXPERIENCE`, `MOBILE_TESTING`, `PROGRESS`
  y `TRACEABILITY`.

Mensaje propuesto `feat(trips): refine private maps and route guidance`.
