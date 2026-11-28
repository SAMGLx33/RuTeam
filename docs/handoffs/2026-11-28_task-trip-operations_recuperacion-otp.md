# Recuperación por OTP

28 de noviembre de 2026, America/Bogota. Agente Codex. Responsable humano POR_ASIGNAR.
Rama `task/trip-operations`, base `c1a1987`. Cambios locales sin stage ni commit.

- El registro académico requiere un correo personal o un teléfono. La cuenta
  admite iniciar sesión con el contacto pendiente. El perfil enmascara el medio
  y exige la contraseña actual para agregarlo o cambiarlo.
- Auth distingue confirmación de contacto y recuperación. Al confirmar un medio
  nuevo, reemplaza al anterior y cancela recuperaciones pendientes. Al cambiar la
  contraseña, consume el permiso y revoca las sesiones en una transacción.
- La migración aditiva `20261128020000_recovery_otp` crea `RecoveryContact` y
  `RecoveryOtp` y amplía `AccountTokenPurpose`. Aplicada con seed únicamente en
  `ruteam_otp_test` de PostgreSQL local. El entorno y los datos de desarrollo se
  conservaron.
- Para activar el transporte de consola, seguir [SETUP](../development/SETUP.md).
  Las operaciones están en [API](../development/API.md). La consola académica
  opera en `development` y `DECLARED_DOMAIN`. No se verifica la titularidad por
  correo o SMS y no se concede acreditación institucional.
- La prueba web usa cuentas sintéticas y captura privada de la salida del
  backend mediante `RUTEAM_OTP_TEST_LOG`. La base debe terminar en `_test` y ser
  distinta de desarrollo. El recorrido físico en Expo Go y la regresión
  integral quedan pendientes.

## Verificación local

- `npm run db:generate`, `npm run typecheck`, `npm run lint` y `git diff --check`
  finalizaron correctamente.
- `npm run db:test:setup` preparó `ruteam_otp_test` con las 34 migraciones y el
  seed sintético.
- `npm run test -w @ruteam/api -- --runTestsByPath test/recovery-otp.e2e.test.mjs test/declared-access.e2e.test.mjs test/account.e2e.test.mjs`
  pasó 17/17 en PostgreSQL aislado. Incluyó dos validaciones OTP simultáneas y
  dos consumos simultáneos del permiso, ambos con una respuesta 200 y otra 400.
- `npm run test:e2e -- tests/web/recovery-otp.spec.ts` pasó 2/2 en Chromium de
  escritorio y móvil emulado. El flujo usó el registro, el perfil y la
  recuperación reales, con NestJS y PostgreSQL de pruebas.

## Commit propuesto

```text
feat(auth): add OTP-based account recovery with personal contact
```
