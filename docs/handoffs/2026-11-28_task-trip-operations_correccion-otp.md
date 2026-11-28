# Corrección de confirmación y reenvío OTP

28 de noviembre de 2026, America/Bogota. Rama `task/trip-operations`, base
`c1a1987`. Agente Codex. Responsable humano POR_ASIGNAR.

- Reproducido con teléfono y correo en `ruteam_otp_test` y `DEMO_MODE=false`.
  Volver a guardar el mismo contacto normalizado consumía el OTP vigente.
  Confirmarlo daba 400 y el estado perdía el contador, aunque el servidor
  devolvía 429 al intentar reenviar antes de 60 s.
- Guardar el mismo contacto conserva el OTP. Un cambio real lo invalida y
  mantiene visibles los límites de emisión. El cliente distingue espera,
  caducidad, intentos agotados, código incorrecto y falta de conexión.
- Para probar, habilitar la consola según [SETUP](../development/SETUP.md),
  mantener un secreto estable, registrar una cuenta con un contacto personal y
  entrar a Perfil → Cuenta y privacidad. Volver a guardar el mismo contacto.
  Tras la espera indicada, reenviar y verificar que el nuevo código aparece en
  NestJS. El anterior se rechaza. Confirmar el nuevo y completar
  `/recover-access`.

Verificación final en PostgreSQL aislado `ruteam_otp_test`.

- `npm run test -w @ruteam/api -- --runTestsByPath test/recovery-otp.e2e.test.mjs`
  pasó 8/8.
- `npm run test:e2e -- tests/web/recovery-otp.spec.ts --project desktop`
  pasó 2/2, un recorrido por canal.
- Pasaron los typechecks de API, cliente y contratos, y `git diff --check`.

Cambios locales sin commit. La corrección no requiere migración.
