# Confirmación de OTP en el registro

28 de noviembre de 2026, America/Bogota. Rama `task/trip-operations`, base
`c1a1987`. Responsable humano POR_ASIGNAR. Cambios locales.

Una cuenta recién creada empieza con el contacto pendiente. Antes del cambio,
`/auth/recovery/request` respondía igual con contacto pendiente o desconocido
y la interfaz mostraba un contador de vigencia. El servidor no emitía
`PASSWORD_RESET` sin confirmación. La prueba anterior confirmaba el contacto
desde el perfil antes de solicitar recuperación.

El registro académico inicia sesión y ofrece confirmar, corregir o aplazar.
El perfil mantiene la misma confirmación y muestra los tiempos del servidor.
La pantalla pública conserva la respuesta genérica y sólo cronometra el
reenvío. En consola académica, `ISSUED` incluye el código y `SKIPPED` incluye
el motivo interno sin datos del titular.

`PhoneNumberField` comparte el selector entre registro y perfil. Los prefijos y
longitudes proceden de `libphonenumber-js/min` 1.13.16, ya resuelto en el
lockfile. Los nombres españoles versionados se generaron con
`Intl.DisplayNames`. NestJS valida E.164 y la longitud por plan de numeración.
Números anteriores y contactos pendientes mantienen su persistencia. Las
pruebas utilizan PostgreSQL aislado y `DEMO_MODE=false`.

Para probar manualmente, seguir [SETUP](../development/SETUP.md), registrar,
confirmar con `CONTACT_CONFIRMATION`, cerrar sesión y solicitar recuperación
en `/recover-access`. Introducir el código `PASSWORD_RESET` de la consola,
cambiar la contraseña e iniciar sesión con la nueva. Repetir omitiendo la
confirmación si se quiere comprobar el diagnóstico `CONTACT_NOT_CONFIRMED`.

## Verificación

- En `ruteam_otp_test`, una consulta agregada de sólo lectura encontró una
  cuenta sintética anterior de Playwright con contacto confirmado por consola
  y cero contactos pendientes en esa muestra. Las cuentas de desarrollo
  quedaron fuera de la consulta.
- `npm run test -w @ruteam/api -- --runTestsByPath test/recovery-otp.e2e.test.mjs`
  pasó 9/9. La cuenta anterior de prueba sin contacto pudo configurarlo y
  confirmar por HTTP. Su estado confirmado persistió después de cerrar sesión.
- `npm run test:e2e -- tests/web/recovery-otp.spec.ts` pasó 4/4 con NestJS y
  PostgreSQL aislado. Teléfono se confirmó durante el registro y correo se
  omitió y retomó desde el perfil. Ambos se probaron en escritorio y móvil web.
- Pasaron `npm run typecheck`, ESLint en los archivos afectados y
  `git diff --check`. La corrección no requiere migración.
