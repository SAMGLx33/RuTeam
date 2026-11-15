# Handoff — PostgreSQL persistente y validación funcional del refactor

- Fecha/zona: 2026-11-14, America/Bogota. Recibos ISO UTC del15/11 corresponden a esa noche.
- Agente: Codex. Responsable humano, integrador y revisores: POR_ASIGNAR.
- Rama/HEAD/base: task/refactor-monorepo-structure / bab4e630784714f8fa58bcbf964ea5a48e37259a.
- Estado: VALIDADO LOCALMENTE; no integrado en feature/dev/main.
- Autorización: usuario ordenó expresamente crear desde cero el entorno de desarrollo/test,
  sustituir el temporal perdido y mantener las variables locales. No autorización Git.
- Modelo/esfuerzo propuesto siguiente agente: GPT-6 High; no se cambió configuración de modelo.

## Alcance y contexto leído

Recuperar/preparar PostgreSQL y comprobar Fase1/2 después del traslado, sin funcionalidades
nuevas, rediseño MVC o upgrades. Leídos AGENTS raíz/backend/frontend, CURRENT_STATUS,
PROGRESS, último handoff, ARCH_REFACTOR_REVIEW y REPOSITORY_STRUCTURE completos, scripts
setup/test-db/Prisma y configuración real; inspección Git/procesos/puertos previa.
No se cambian IDs/estados RF/RNF ni UML. Revalidación de identidad/perfil/vehículos,
documentos y publicación USC; reservas/Fase3 siguen sin implementar.

## Diagnóstico y entorno utilizado

El directorio /tmp/ruteam-pg-20261113 no existía, pg_ctl status exit4 y ambas conexiones
55432 sin respuesta. Búsqueda local acotada sin respaldo accesible;13 carpetas /tmp no
legibles y Docker sin permiso. No se afirma ausencia universal de backups externos.
Usuario eligió un entorno nuevo: no se recuperaron datos históricos ni se borraron ajenos.

PostgreSQL18.6 real, proceso del usuario local, datos persistentes fuera del checkout:
/home/darik/RuTeam/.local-data/postgresql-18/data. Socket privado y logs en el padre.
Sólo127.0.0.1:55432; bases ruteam y ruteam_test separadas. Rol ruteam y trust local como
configuración previa; puerto/socket/timezone guardados en postgresql.conf del clúster.
No otra versión de app. Se conserva el seed y la verificación sintética existentes.
.env completo idéntico al preflight, sin variables secretas nuevas ni overrides permanentes.
Sistema18/main5432, dueño postgres, no se conectó ni modificó. No autoinicio de sistema.

Bootstrap verificó puerto libre y destino inexistente antes de initdb; createdb sólo de
las dos bases autorizadas. Sin reset, dbpush, DROP o reescritura de migraciones.

## Migraciones, seed y datos

npm run db:generate/db:migrate/db:seed/db:test:setup aprobados. Las cuatro migraciones
históricas se aplicaron a ambas bases;4/4 checksums SHA256 coinciden con SQL local,
terminadas y sin rolled_back_at. SQL/schema no cambiaron.
Seed de desarrollo dos veces y test:setup dos veces: contenido/huellas y cantidades de
12 tablas iguales por base tras repetir. No se exponen filas, tokens ni credenciales.
[Recibo de integridad](../reviews/evidence/2026-11-14-postgresql-recovery/database-validation.json).

## Defecto corregido y archivos

Primer npmtest71/71; primer E2E0/4 falló por error de conexión. Traza de web8082 intentaba
API3000, aunque configuración exigía3100. Expo54 tenía APP_MANIFEST cacheado del otro
entorno. Mismo caso/assertions con --clear pasó y usó3100; no se relajó CORS/seguridad.

Cambio de configuración mínimo, conservando todo lo demás del refactor existente:
package.json añade -- --clear a dev:web/dev:client; playwright.config.ts añade --clear
al Expo8082. Variables/puertos/aislamiento/tests/assertions/endpoints/DTOs/políticas,
SQL, dependencias, lockfile y capas internas intactos. Revisión independiente favorable
al ajuste; no ejecutó tests. Coste esperado: recompilar caché al arrancar.

Documentos nuevos: POSTGRESQL_RECOVERY_DIAGNOSIS/VALIDATION, recibos JSON bajo
reviews/evidence/2026-11-14-postgresql-recovery y este handoff. Entradas nuevas en
PROGRESS/CURRENT_STATUS/WORKSTREAMS/EVIDENCE/ARCH_REFACTOR_REVIEW/SETUP/README, sin borrar
históricos. Inventario de cambios y hashes comparados al preflight en closeout.json.
El verificador reescribe su recibo por diseño: se guardó el resultado nuevo por separado
y se restauró su recibo anterior byte a byte, conservando evidencia histórica.

## Pruebas realmente ejecutadas

Linux, Node22.22.3/npm12.2.2, Nest11/Prisma7/Expo54, PostgreSQL18.6. Sin upgrades.
Tras corregir caché se repitió la batería completa, una suite DB a la vez:

- npm run typecheck, npm run lint, npm run format:check: exit0.
- npm test:71/71,5 suites, Supertest/PostgreSQL reales.
- npm run test:e2e:4/4, Chromium escritorio/móvilweb, registro→revisión ADMIN→viaje USC
  con dos recogidas→listado tras recarga; también perfil/inactiva y negativos existentes.
- npm run smoke:6/6 sobre API3000 y desarrollo.
- npm run build:api y npm run build:web: exit0.
- npx expo-doctor frontend:18/18; no teléfono físico.
- node scripts/verify-workspace-move.mjs y git diff --check: exit0,216 archivos/133gitkeep.

Además suite HTTP Fase2 en JSON32/32: caso concurrente aprobado con201/409 y conteo+1;
no confundirlo con reservas/último cupo. [Prueba](../reviews/evidence/2026-11-14-postgresql-recovery/concurrency.json).
Batería inicial fallida y un recibo que necesitó formato se conservan; no son pendientes
ni se presentan como aprobados. Resultados finales en functional-validation-after-cache-fix.json.

## Web y servicios finales

API3000 existente se reconectó al nuevo PG; Swagger200/16rutas, health200/databaseup.
La web normal8081 se reinició sólo después de identificar el proceso propio y se ejecutó
mediante el comando general corregido. Desktop1280x900 y móvilweb390x844: auth/me200,
Laura inactiva403, perfil modificado/persistido al recargar y valor original restaurado.
Sin aviso de conexión, fallos de red o pageerror; sin overflow horizontal. Capturas
sintéticas inspeccionadas fuera de Git en review-artifacts/2026-11-14-postgresql-recovery
bajo /home/darik/RuTeam. No logs/trazas/cookies/screenshots privados añadidos a Git.

Quedan API3000, Expo8081 y PostgreSQL propio55432 operativos. Test3100/8082 se cerraron.
PIDs actuales y verificación de datos/refs en closeout.json. No procesos ajenos detenidos.
Expo Go físico/LAN/Windows/CI remoto/carga y restauración NO EJECUTADOS/NO VERIFICADOS.
Avisos Node VM/pg8 y deuda audit anterior40/5altas siguen; no se ocultaron ni actualizaron.

## MVC y límites

Controllers→application→dominio/repositorios y Router→features/providers→services/API
conservados por hashes y lectura. No Prisma en React o aplicaciones/arquitecturas nuevas.
Health readiness con SELECT1 y membership.policy fuera de subcarpeta policies son deuda
previa preservada, no refactorizada. No integración USC oficial, reglas legales, pagos o Fase3.

## Reproducción, Git y siguiente paso

Desde /home/darik/RuTeam/RuTeam: inspeccionar git status y puertos. Tras reboot:

```bash
/usr/lib/postgresql/18/bin/pg_ctl -D /home/darik/RuTeam/.local-data/postgresql-18/data status
# Sólo si está detenido y55432 libre:
/usr/lib/postgresql/18/bin/pg_ctl -D /home/darik/RuTeam/.local-data/postgresql-18/data -l /home/darik/RuTeam/.local-data/postgresql-18/postgresql.log -w start
```

No volver a ejecutar initdb sobre datos existentes.

Repetir db:generate/db:migrate/db:seed/db:test:setup, después typecheck/lint/format:check,
npmtest, test:e2e y smoke SECUENCIALMENTE. Scripts completos/resultado en
[POSTGRESQL_RECOVERY_VALIDATION](../reviews/POSTGRESQL_RECOVERY_VALIDATION.md).
No duplicar API/web existentes ni copiar .env sobre otro archivo; no reset.

HEAD y ramas compartidas sin cambios; stage vacío, sin commit/push/PR/merge/rebase.
Feature sigue en e3841bc sin integrar Fase2 bab4e63; checkpoint f637499 aislado. Integrador
POR_ASIGNAR revisa y autoriza cada operación. Primero integrar Fase2 a feature, luego
verificar diff de refactor y decidir commit/publicación/PR; pruebas locales no son merge.
Mensaje de commit futuro propuesto en el handoff anterior; NO ejecutado.
