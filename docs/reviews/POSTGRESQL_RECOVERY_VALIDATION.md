# Recuperación PostgreSQL y validación funcional del refactor

Fecha: 2026-11-14 America/Bogota (recibos ISO UTC del15/11 equivalen a noche del14/11).
Agente Codex; responsable humano/integrador/revisores POR_ASIGNAR.
**Estado: VALIDADO LOCALMENTE.** Cumplidos los ocho criterios funcionales del prompt;
esto no autoriza stage/commit/PR/push/merge ni acredita Expo Go físico o CI remoto.

## Autorización y alcance

El usuario autorizó expresamente crear desde cero el entorno de desarrollo/pruebas que
sustituye al temporal perdido, conservando las variables locales. Se usó PostgreSQL REAL,
no una simulación de persistencia ni otra versión de la app. El seed y la verificación
institucional sintética ya configurados se conservaron, al igual que toda .env.
El clúster nuevo está en /home/darik/RuTeam/.local-data/postgresql-18/data, fuera de Git,
y usa127.0.0.1:55432. Bases ruteam y ruteam_test separadas, rol existente en configuración
ruteam, proceso propiedad del usuario local. Configuración de puerto/socket/timezone
persistida en postgresql.conf del nuevo clúster. Directorio/socket privados y trust local
como antes, sin exposición LAN de PostgreSQL. No autoinicio de sistema añadido.

El directorio original /tmp/ruteam-pg-20261113 ya no existía; pg_ctl status exit4 y
pg_isready exit2 en ambas bases. Búsqueda acotada sin respaldos accesibles;13 directorios
/tmp no legibles y Docker sin permiso de socket. No prueba inexistencia de backup externo.
No se recuperaron registros históricos: se crearon bases nuevas por decisión del usuario.
PostgreSQL18/main del sistema5432, propietario postgres, permaneció intacto y sin conexión
SQL por esta intervención. [Diagnóstico completo](POSTGRESQL_RECOVERY_DIAGNOSIS.md).

## Preparación e integridad

Se verificaron previamente puerto55432 libre y destino de datos inexistente. initdb18,
pg_ctl start y createdb de las dos bases exit0. No reset, db push, borrados o sobrescritura.
.env raíz coincide byte a byte con el preflight. Ninguna dependencia, SQL/schema, entidad,
endpoint, DTO, política de dominio o funcionalidad nueva se incorpora.

| Paso real                         | Resultado                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Conexión SQL a desarrollo y test  | Ambas UP, nombres distintos, mismo clúster55432 nuevo y esperado.                                        |
| npm run db:generate               | exit0, Prisma7 en backend/src/generated ignorado.                                                        |
| npm run db:migrate                | exit0, cuatro migraciones existentes aplicadas a desarrollo.                                             |
| _prisma_migrations                | 4/4 checksums SHA256 coinciden con archivos locales por base; finished_at presente y sin rolled_back_at. |
| npm run db:seed (dos veces)       | exit0; huellas/contenido y conteos de12tablas iguales después de segunda ejecución.                      |
| npm run db:test:setup (dos veces) | exit0; cuatro migraciones test y seed sin reset; idempotencia de12tablas también verificada en test.     |

[Bootstrap](evidence/2026-11-14-postgresql-recovery/bootstrap.json) y
[integridad/idempotencia](evidence/2026-11-14-postgresql-recovery/database-validation.json)
registran comandos, exit, checksums y cantidades, sin filas sensibles ni credenciales.
Las cuatro SQL históricas no cambian. No se confunde crear el nuevo entorno con recuperar
los datos del anterior ni con integrar el refactor en feature.

## Defecto de entorno encontrado y corrección mínima

Primera ejecución de esta sesión: Jest71/71, pero Playwright0/4; dos alertas de conexión
y timeout posterior. La traza mostró web8082 llamando aAPI3000, aunque la configuración
de tests exigeAPI3100. La caché de transformación de Expo SDK54 retenía APP_MANIFEST con
extra.apiUrl del otro entorno; el plugin instalado expo-inline-manifest lo inserta en web.
La configuración pública con override era correcta, pero el bundle cacheado no lo reflejaba.
No se corrigió relajando CORS o pasando los tests a desarrollo: eso habría roto aislamiento.

Diagnóstico controlado: mismo caso y assertions, sólo --clear al iniciar Metro; pasó y
las peticiones fueron a3100 con401/403/201/200/204 reales. Corrección general permanente:

- package.json dev:web y dev:client añaden -- --clear a los scripts Expo existentes.
- playwright.config.ts añade --clear al servidor Expo8082, conserva API3100/BD_test/CORS8082.

Son tres flags de configuración, no reglas de negocio. Variables y URLs locales intactas;
no workaround de sesión ni assertions debilitadas. Coste: caché recompilada al arrancar.
Revisión independiente sólo lectura sin hallazgos: confirmó diferencias exactas frente al
snapshot inicial y que Expo SDK54 transmite --clear a Metro resetCache. No ejecutó suites.
[RED/GREEN y red sanitizada](evidence/2026-11-14-postgresql-recovery/metro-cache-diagnosis.json).

Se conserva el fallo inicial en functional-validation.json. Un intento intermedio señaló
sólo formato de ese recibo JSON; se formateó y repitió la batería completa. El intento
consta en metadata-format-attempt.json. No son fallos pendientes ni se borran del historial.

## Resultados actuales de la batería completa

Linux, Node22.22.3/npm12.2.2, PostgreSQL18.6, Nest11/Prisma7/Expo54 sin upgrades.
Suites PostgreSQL ejecutadas secuencialmente sobre test; smoke usa desarrollo3000.

| Estado                       | Comando exacto                                           | Resultado actual                                                      |
| ---------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| APROBADO                     | npm run typecheck                                        | exit0                                                                 |
| APROBADO                     | npm run lint                                             | exit0                                                                 |
| APROBADO                     | npm run format:check                                     | exit0                                                                 |
| APROBADO                     | npm test                                                 | 71/71,5 suites, HTTP/Supertest/PostgreSQL reales                      |
| APROBADO                     | npm run test:e2e                                         | 4/4, Chromium desktop y viewport móvil web                            |
| APROBADO                     | npm run smoke                                            | 6/6 sobre API3000 y desarrollo                                        |
| APROBADO                     | npm run build:api                                        | exit0                                                                 |
| APROBADO                     | npm run build:web                                        | exit0; export web, no teléfono                                        |
| APROBADO                     | npx expo-doctor frontend                                 | 18/18                                                                 |
| APROBADO                     | node scripts/verify-workspace-move.mjs                   | 216archivos/133gitkeep, inventario/permisos/grafo/enlaces preservados |
| APROBADO                     | git diff --check                                         | exit0; no stage                                                       |
| NO EJECUTADO / NO VERIFICADO | Expo Go físico, Windows, CI remoto, carga y restauración | No se atribuyen resultados                                            |

[Recibo final secuencial](evidence/2026-11-14-postgresql-recovery/functional-validation-after-cache-fix.json).
Node VM Modules y aviso de pg8 query ocupada siguen como warnings; no se ocultan ni se
actualizan dependencias para silenciarlos. Las 40 alertas/5 altas de audit siguen como
riesgo del último análisis previo; npm audit no se repitió ni se reparó en esta tarea.

## Comportamiento observado y arquitectura

- Identidades activas/inactiva, sesión/perfil persistente y permisos comprobados de nuevo.
- E2E registra vehículo PENDING, otro contexto ADMIN revisa versión documental; publica
  viaje USC con2recogidas, rechaza fecha/entrada inválida y persiste el listado tras recarga.
- HTTP PostgreSQL valida vehículo ajeno, placa, capacidad, documentos y destino USC exclusivo.
- Prueba concurrente existente repite dos publicaciones superpuestas: exactamente201/409,
  conteo +1. Se obtuvo además resultado JSON individual de la suiteHTTP32/32 para ese caso.
  Esto no es prueba de último cupo o reservas, que siguen sin implementar.
- Web normal localhost8081 se reinició mediante npm run dev:web corregido después de los
  E2E3100. En desktop1280x900 y móvilweb390x844: login activo, inactiva403, auth/me200,
  cambio de perfil persistente tras recarga y restauración del valor original. Sin aviso
  de conexión, fallos de red o pageerror; sin overflow horizontal. Capturas inspeccionadas.
- Health3000 devuelve200/database=up; Swagger200/16rutas; auth/me sin sesión401 esperado.
- Controllers→application→dominio/repositorios y Router→features/providers→services/API se
  conservan por cotejo y lectura. Health readiness Prisma directo y membership.policy son
  preexistencias preservadas, no refactorizadas. No frontend/arquitecturas paralelos.

[Concurrencia](evidence/2026-11-14-postgresql-recovery/concurrency.json),
[web8081 tras reinicio normal](evidence/2026-11-14-postgresql-recovery/browser-8081.json),
[servicios y bases](evidence/2026-11-14-postgresql-recovery/live-services.json).
Browser plugin no disponible; Playwright usado. Cookies/tokens/trazas crudas no se copian
al repo; sólo red sanitizada. Capturas sintéticas fuera de Git en
/home/darik/RuTeam/review-artifacts/2026-11-14-postgresql-recovery.

El recibo antiguo inventory-after.json del refactor fue conservado byte a byte: se archivó
el resultado NUEVO de cada ejecución del verificador bajo esta carpeta y se repuso el
recibo anterior, sin reescribir su evidencia histórica. Las fuentes funcionales existentes,
contratos, tests/assertions, schema/SQL y lockfile mantienen sus hashes iniciales.

## Git, documentación y próximo paso

Rama/HEAD siguen task/refactor-monorepo-structure/bab4e630784714f8fa58bcbf964ea5a48e37259a.
Sin stage, commit, push, PR, merge, rebase o cambios a main/dev/feature/task-trips.
Feature sigue sin integrar Fase2; primero revisión/integración autorizada de Fase2 y luego
revisar un diff de refactor limpio. Se preservan registros anteriores y se añaden PROGRESS,
CURRENT_STATUS, EVIDENCE, ARCH_REFACTOR_REVIEW y handoff nuevo; SETUP explica persistencia.

Responsable POR_ASIGNAR debe revisar estos resultados y las tres flags, resolver/aceptar
riesgos pendientes y autorizar por separado commit local, publicación y PR. No se concede
aprobación remota por tener tests locales verdes. Expo Go físico e integración USC real
siguen pendientes. Tras reboot iniciar el clúster persistente según SETUP; los datos ya no
residen en /tmp. No volver a ejecutar initdb sobre el directorio creado.
