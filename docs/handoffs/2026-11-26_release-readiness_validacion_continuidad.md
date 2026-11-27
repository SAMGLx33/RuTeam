# Relevo · Regresión de continuidad

- Fecha 26/11/2026, America/Bogota
- Rama `task/release-readiness` sobre `f7013ea`
- Área Integración
- Estado local para revisión

## Implementación

Ejecutar la regresión sobre una base PostgreSQL nueva y exclusiva de pruebas, con las 24 migraciones y los datos sintéticos. Conservar los escenarios históricos. La evidencia web usa navegador real, y las exportaciones nativas verifican el empaquetado.

## Integración y evidencia

Consultar la [evidencia de pruebas](../reviews/RELEASE_READINESS.md#validación-de-continuidad).

Para reproducir usa los [comandos y criterios del plan](../development/TEST_PLAN.md#pruebas-de-continuidad-del-producto). El estado de integración se mantiene en [preparación de entrega](../reviews/RELEASE_READINESS.md).

## Archivos del incremento

- Backend en `backend/src/modules/trips`, `auth`, `mobility`, `expenses`, `reservations`, `groups`, `chat` y `safety`. Configuración en `backend/src/config/environment.ts`.
- Persistencia en `backend/prisma/schema.prisma` y tres migraciones aditivas entre `20261126140000` y `20261126142000`.
- Pantallas en `frontend/app` y los módulos correspondientes de `frontend/src/features`. Las solicitudes reutilizan el cliente API, la sesión y los componentes compartidos.
- Contratos en `packages/contracts/src`, con proyecciones de movilidad y plantillas recurrentes como archivos nuevos.
- Pruebas en `backend/test/product-continuation.e2e.test.mjs` y `tests/web/continuation.spec.ts`, con ajustes al mock de cuenta y al retiro desde publicación.
- Guías de agentes, API, requisitos, modelo, autorización, decisiones, progreso, instalación, sprints y coordinación enlazados en [preparación de entrega](../reviews/RELEASE_READINESS.md#continuidad-funcional-del-26112026).

## Entorno de verificación

PostgreSQL local en `127.0.0.1:5432`. `db:test:setup` aplicó las 24 migraciones sobre bases independientes con sufijo `_test`. Se preservó la configuración de `.env`. Las exportaciones Android e iOS y Expo Doctor 18/18 verificaron el SDK. El smoke local obtuvo 6/6 con las sesiones sintéticas.

El inicio en modo watch superó el límite de Playwright al coincidir con otros procesos de TypeScript. La repetición arrancó el servidor con la API compilada y amplió el tiempo de espera de los servidores en una configuración temporal. Los casos, el export web, la API PostgreSQL y los perfiles Chromium siguieron siendo los del repositorio.

## Regresión HTTP y de dominio

La corrida general de Jest aprobó 201 de 206 casos. Las cinco pruebas de grupos quedaron interrumpidas por el tiempo de arranque de su hook. La repetición secuencial de grupos y continuidad aprobó los ocho casos, incluidas las tres pruebas de continuidad con PostgreSQL real. Las 33 suites y los 206 casos tienen evidencia de aprobación en conjunto.

La batería de continuidad comprueba matching y aviso real de una fecha recurrente, concurrencia, fallo por vigencia, reintento, cancelación de fechas, privacidad, custodia de sesiones, traslado de cupos y cierre seguro con matrícula expirada.

## Regresión web y compilación

Playwright verificó los 12 casos entre la corrida general y la repetición dirigida. La primera aprobó nueve escenarios. La repetición aprobó la edición y gestión de recurrencias en ambos perfiles de Chromium y el escenario de cuenta en la vista móvil. La corrida general había detectado un selector ambiguo en la prueba nueva y un fallo transitorio de captura de Chromium. La repetición con la API compilada construyó y sirvió el export web mediante `npm run build:web`.

Se verificaron `npm run db:generate`, `npm run db:test:setup`, `npm run typecheck`, `npm run lint`, `npm run format:check`, compilación NestJS, export web, smoke, Expo Doctor y `git diff --check`. Las pruebas usan datos sintéticos. La aceptación física y las integraciones externas permanecen pendientes.

## Reinicio de NestJS

En una base de prueba se guardó una plantilla con el trabajador detenido. Un segundo proceso NestJS detectó la fecha pendiente y publicó el viaje. Un tercer proceso ejecutó el reintento y la consulta confirmó una sola fecha con el mismo ID de viaje. La plantilla de prueba se canceló desde la API.
