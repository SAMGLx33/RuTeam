# Relevo · Validación de la evolución

Fecha 26/11/2026, America/Bogota. Rama local `task/release-readiness` sobre `f7013ea`.

## Cambio

Las pruebas usan cuentas sintéticas y PostgreSQL local aislado. Registrar evidencias finales y diferencias entre pruebas completas, repeticiones y exportaciones.

## Integración

[Documentación](../reviews/RELEASE_READINESS.md) · [Validación](2026-11-26_release-readiness_evolucion_validacion.md)

## PostgreSQL, API y Jest

- `npm run db:generate` generó el cliente Prisma. `npm run db:test:setup` aplicó 27 migraciones y cargó fixtures en PostgreSQL local en el puerto 5432. Se usaron bases separadas con sufijo `_test`.
- `npm run test -w @ruteam/api -- --testTimeout=45000` ejecutó 35 suites. Aprobó 212 de 213 casos. El caso de alta energética leyó una compilación anterior al cambio de DTO.
- Tras la recompilación, la ejecución focalizada de `product-evolution` y `environment.test` aprobó los siete casos, incluido el alta con datos energéticos. La cobertura combinada acredita 213 casos en 35 suites.
- `npm run smoke` aprobó 6/6 en la API compilada sobre la base aislada. Las pruebas de push sustituyen la respuesta del proveedor y no envían a un dispositivo.

## Archivos y alcance

Backend en `mobility`, `vehicles`, `trips`, `reservations`, `realtime`, `chat` y `safety`. Contratos en `packages/contracts/src`. Las rutas Expo secundarias abren operación de viaje, agenda, actividades y preferencias. Las tres migraciones aditivas conservan las 24 anteriores. Montaje de SSE, preferencias, cola push y fuentes ambientales se describen en los documentos de desarrollo.

## Navegador y SDK

La corrida general de Playwright aprobó 10 de 14 casos. La repetición aprobó los cuatro restantes en escritorio y móvil web. El nuevo escenario comprueba que abrir Agenda permite consultar el viaje, que SSE actualiza el conteo de participantes antes del siguiente sondeo ordinario y que una preferencia se guarda y permanece al recargar. Se corrigió el estado accesible del selector y se acotó la prueba de publicación al viaje de su propio fixture.

Playwright compiló y sirvió el export web de `npm run build:web`. La API se ejecutó compilada en una base web de pruebas separada. Expo Doctor aprobó 18 de 18 comprobaciones con el SDK 54. La recepción push y la aceptación en Android/iOS físicos quedan pendientes.

Las exportaciones de Expo para Android e iOS terminaron en secuencia, después de Chromium. Los paquetes de verificación quedaron en `/tmp/ruteam-evolucion-android` y `/tmp/ruteam-evolucion-ios`. Los archivos de entorno y la rama original `sergio` se conservaron. El incremento sigue como cambios locales en `task/release-readiness`.

La comprobación final de tipos, ESLint, Prettier y `git diff --check` aprobó después de las exportaciones. Se verificó que el índice Git permaneciera vacío y que la rama original siguiera en `5af65f2`.
