# Handoff de continuidad SMTP

Fecha del equipo: 25 de noviembre de 2026, America/Bogota. Rama de origen
`task/driver-defined-routes`, commit `5af65f2` y transformación previa local.
El incremento se preparó en el snapshot aislado de continuidad.

## Entrega

- `compose.mailpit.yaml` define captura local con Mailpit 1.34.0, imagen fijada por
  digest, puertos publicados en `127.0.0.1`, patrón de alias aleatorios y sin
  reenvío de correo.
- `scripts/smoke-mailpit.mjs` prueba Nest y el adaptador real contra el buzón.
  Aísla PostgreSQL mediante `TEST_DATABASE_URL`, genera los datos de la cuenta,
  usa un puerto HTTP efímero y retira su cuenta al finalizar.
- [Guía de correo local](../development/MAILPIT.md) explica cómo reproducir el
  smoke, probar la interfaz y configurar un servidor SMTP aprobado.

## Resultado observado

Docker Engine 29.1.3 ejecutó la imagen oficial 1.34.0. Esta máquina no tenía el
complemento Compose, por lo que se ejecutó el comando equivalente documentado.
PostgreSQL `ruteam_mail_test` recibió las diez migraciones históricas y el seed.
Se usó el backend compilado de la línea base, con el transportador SMTP existente.

`node --env-file=.env scripts/smoke-mailpit.mjs` terminó con código 0. El flujo
registró una cuenta, recibió confirmación y recuperación por SMTP, verificó que
ambos enlaces fueran de uso único, revocó sesiones y rechazó las claves
anteriores. Un buzón confirmado con vigencia pendiente siguió recibiendo 403 en
el feed. El registro repetido y la solicitud de recuperación para una cuenta
ausente conservaron respuestas genéricas. El contenedor de prueba se retiró.

Artefactos privados con salida resumida en
`/home/darik/RuTeam/.local-data/continuidad-2026-11-25/`:
`mail-db-test.log`, `mailpit-bindings.log` y `mailpit-smoke.log`.
Se mantuvo `.env` intacto. La prueba no contactó buzones externos.

## Siguiente paso

Integrar la guía al setup y conservar el smoke como optativo. La entrega a un
buzón autorizado requiere infraestructura SMTP y remitente aprobados. La prueba
de navegación desde el enlace y UI SMTP completa se mantiene separada del smoke
por contrato HTTP. El incremento no requiere migraciones, contratos de API ni
cambios de autorización.
