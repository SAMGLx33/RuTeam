# Evidencia real — 2026-11-13 (America/Bogota)

Estado del corte: PARCIAL; no integrado por PR en dev. Sin despliegue ni push.
Entorno Linux VirtualBox, Node22.22.3, npm12.2.2, PostgreSQL18.6 local temporal55432.
Referencia inicial7967674 y remoto existente preservados.

## Versiones instaladas

| Paquete          | Versión |
| ---------------- | ------- |
| @nestjs/core     | 11.2.10 |
| @prisma/client   | 7.10.1  |
| prisma           | 7.10.1  |
| expo             | 54.0.38 |
| expo-router      | 6.0.24  |
| react            | 19.1.0  |
| react-native     | 0.81.5  |
| react-native-web | 0.21.4  |
| typescript       | 5.9.3   |
| jest             | 30.5.2  |
| @playwright/test | 1.65.1  |

## Resultados observados

| Comando/acción                                | Resultado                                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| npm install / lockfile real                   | Instalación ejecutada; npm12 bloqueó scripts de dependencias no aprobados                                   |
| npm run db:generate                           | Prisma7.10.1 generado con --config prisma.config.ts                                                         |
| migrate dev inicial + db:migrate              | Dos migraciones aplicadas a desarrollo y test; sin reset                                                    |
| npm run db:seed (repetido)                    | Cuatro identidades + destino DEMO, conserva existentes                                                      |
| npm run db:test:setup                         | BD_test separada preparada sin borrar datos                                                                 |
| npm test                                      | 3 suites,27/27 aprobadas; HTTP/Supertest y PostgreSQL reales                                                |
| npm run test:e2e                              | 2/2 aprobadas, Chromium escritorio1280x720 e iPhone 13 web390x664                                           |
| npm run smoke                                 | 6/6 aprobadas contra API3000 y BDdesarrollo                                                                 |
| curl docs-json                                | 200 y documento OpenAPI real                                                                                |
| npm run lint / npm run typecheck              | Ejecutados sin errores; estáticos, no prueba de runtime                                                     |
| npm run build:web                             | Export Metro correcto,838 módulos; no Vite/Next                                                             |
| expo export --platform android --platform ios | Ambos bundles Hermes exportados;export final: 1120 Android / 879 iOS (caché Metro); ambos bundles generados |
| expo install --fix                            | Dependencies are up to date (SDK54)                                                                         |
| expo-doctor                                   | 18/18 checks passed                                                                                         |

Jest ESM emite aviso experimental de VM Modules de Node; no falla el test.
Playwright: Browser plugin no disponible; Chromium descargado en /tmp/ruteam-playwright.
Pruebas iniciales RED: auth404 antes de conectar módulos; logout de afiliación inactiva403;
web mantenía perfil tras logout por retirar query observado. Corregidos con pruebas GREEN.
No se presentan esos fallos previos como funcionalidad pendiente.

Prueba UI: login Laura403→Ana activa→GETauth/me200→editar→guardar→recargar→mismo valor
PostgreSQL; segundo contexto Diego docente/conductor demo aislado; logout en ambos.
Se revisaron capturas reales escritorio y móvil sin clipping/overlay. Capturas de sesión
(no versionadas) en /tmp/ruteam-desktop-{login,profile}.png y
/tmp/ruteam-mobile-web-{login,profile}.png. Son web móvil, no un teléfono con Expo Go.
Consola: ninguna excepción pageerror en el contexto principal; HTTP401 inicial sin sesión
y403 de inactivo son respuestas esperadas. No se afirma ausencia global de warnings de navegador.

## Auditoría de dependencias

npm audit inicial44:1baja,34moderadas,9altas. Prisma7.9.1→7.10.1 y correcciones
compatibles sin --force redujeron a40:1baja,34moderadas,5altas,0críticas. Audit exit1
por alertas remanentes, no se etiqueta como aprobado. Incluye cadena Expo Router /
query-string / decode-uri-component, postcss y image-size; otras cadenas de herramientas
Expo/Jest/TypeScript. No se forzó Expo Router58 ni Expo52 propuestos por npm porque
rompen SDK54. Evaluación y correcciones compatibles siguen pendientes (D11).
No se ha realizado un scan de seguridad exhaustivo ni se afirma seguridad productiva.

## Límites de verificación

Expo Go físico/versiones reales no disponibles; no cámara/GPS/SecureStore en dispositivo,
no Windows, no carga/RNF, no concurrencia cupos aún (reservas no implementadas).
Sin referencias ERS/UML/rúbrica;30+20 posiciones de matriz son inventario provisional.
Pipeline GitHub aún no ejecutado en remoto. Protecciones de ramas no configuradas.
Red detectada autorizadamente:10.0.2.15/24 en VM, no demuestra acceso LAN de un teléfono.
API y PostgreSQL se usaron en puertos3000 y55432. Pruebas web levantaron3100/8082 y los
cerraron al finalizar; no confundir con demo8081. API3000, web8081 y PostgreSQL55432 se dejan iniciados para revisión local.
Pruebas3100/8082 sí cerraron sus servidores. Detención y reinicio en SETUP.

## Continuidad Fase 2 — 2026-11-13, America/Bogota

Esta sección es la evidencia vigente de task/trips-publicacion, sin commit autorizado.
La sección anterior permanece como histórico de fundación. No se promovió a dev.
Fuentes actuales: ERS33p extraída con antiword0.37-17 temporal, rúbrica4p y36pestañas
UML leídas. SHA256 originales idénticos antes/después; datos privados excluidos de Git.

| Estado       | Comando / comprobación                                                               | Resultado observado                                                                |
| ------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| aprobado     | npm test (base antes de cambios)                                                     | 3suites,27/27                                                                      |
| aprobado     | npm run db:generate                                                                  | Cliente Prisma7.10.1 generado                                                      |
| aprobado     | migración nueva phase2_vehicle_publication                                           | Aplicada a ruteam y ruteam_test sin reset                                          |
| aprobado     | migración nueva phase2_document_revisions                                            | Aplicada a ambas BD, ninguna migración aplicada editada                            |
| aprobado     | npm run db:seed / npm run db:test:setup                                              | Seed idempotente conserva existentes; DEM123/licencia y reglas/destinos sintéticos |
| aprobado     | npm run typecheck                                                                    | API,cliente,contratos y tests TS sin errores                                       |
| aprobado     | npm run lint                                                                         | Sin errores ni warnings de ESLint tras correcciones                                |
| aprobado     | npm test (final)                                                                     | 5suites,71/71,PostgreSQL real; incluye27tests previos                              |
| aprobado     | npm run test:e2e (final)                                                             | 4/4,Chromium desktop e iPhone13 viewport web                                       |
| aprobado     | npm run build:web                                                                    | Metro848módulos,export real                                                        |
| aprobado     | expo export --platform android --platform ios --output-dir /tmp/ruteam-phase2-native | 1130Android/1134iOS; ambos Hermes3.73MB                                            |
| aprobado     | npx expo-doctor apps/client                                                          | 18/18checks                                                                        |
| aprobado     | SHA256 de las tres fuentes                                                           | Sin modificación de originales                                                     |
| fallido      | npm audit --json                                                                     | exit1,40alertas:1baja/34moderadas/5altas/0críticas                                 |
| fallido      | npm audit fix --dry-run --json                                                       | exit1,added0/removed0/changed0; sin modificación de lockfile                       |
| no ejecutado | Expo Go en teléfono físico                                                           | No dispositivo/versión real confirmados; export no acredita teléfono               |
| no ejecutado | Windows, APK/AAB/IPA, carga/RNF, Lighthouse completo                                 | No se atribuyen resultados                                                         |
| bloqueado    | Verificación QR/afiliación USC oficial                                               | Sin convenio/interfaz autorizada; sólo DEMO                                        |
| bloqueado    | Género/moto, penalidades, fórmula cupos/tramos                                       | Requiere decisión PO, no automatizado                                              |

Resultados negativos de desarrollo (fallos corregidos, no pendientes): nueva prueba de
registro201 recibió404 antes de implementación; origenarray400 recibió500 y tarjeta
obsoleta409 recibió201 (3regresiones RED) antes de IsObject+revisión documental CAS.
Posteriormente69/69 y luego71/71 al completar casco/permisos. Primer E2E falló al cargar
Prisma ESM bajo tests CommonJS; tests/package.json type=module corrigió el cargador y
los cuatro flujos ejecutaron realmente. Typecheck detectó ReturnType de sobrecarga RHF;
se corrigió con interfaces de formulario explícitas. Lint detectó Date.now en render y
watch incompatible; se corrigió a initializer de estado y useWatch, sin desactivar reglas.
Formato invocado explícitamente sobre ignorefiles no tiene parser: se excluyeron del
comando y el formato de fuentes/docs se verifica con format:check. No es fallo de runtime.

E2E de publicación: Diego registra placa sintética→PENDING→admin en segundo contexto
revisa versión exacta→fecha pasada rechazada→coordenada vacía rechazada→publica USC
con2recogidas→listado tras recarga. Fixture Node limpia sólo los UUID creados por el test.
Capturas reales /tmp/ruteam-phase2-desktop.png y /tmp/ruteam-phase2-mobile-web.png,
inspeccionadas visualmente; UI sin clipping/overlay. Ningún pageerror en contexto principal.
Viewport móvil es navegador, no app nativa probada físicamente. Sin capturas de fuentes/PII.

Prueba concurrente HTTP: dos publicaciones del mismo conductor e intervalo devolvieron
[201,409], conteoBD+1; sin sobreposición. NO es prueba de último cupo/reservas (aún pendiente).
Sesiones y guards anteriores siguen pasando. Advertencias observadas: NodeVM experimental,
pg8.23.1 sobre consultas de cliente ocupado desde stack Prisma; no errores ni suite fallida.
No actualizar a pg9 para esconder aviso; compatibilidad del adapter debe revisarse aparte.

Revisión independiente estática: encontró aprobación obsoleta y origenarray; ambos con
regresión RED→GREEN. También se corrigió coordenada vacía como0 en UI con testE2E.
La revisión no ejecutó suites y no es aprobación humana ni integración. DEPENDENCY_REVIEW
registra cada alerta/decisión; no se introdujeron dependencias ni overrides nuevos.

Cierre operativo: se identificó y reinició únicamente el proceso Node de la demoAPI3000
iniciado por este agente, conservando Metro8081 y PostgreSQL55432. npmrun smoke6/6 tras
reinicio; sesión sintética Diego confirmó GETvehicles200(1registro), GETtrips/my200(0)
y GETtrip-rules200(3), luego logout sin imprimir tokens. API3000 ya carga Fase2.
Revisión local de78rutas cambiadas/nuevas: ninguna fuente privada/output/secretos conocidos;
originales privados0rastreados, SHA256 de las3fuentes iguales y0.gitkeep sobrantes.
No hubo commit, stage, PR, merge ni push. Diff y archivos nuevos permanecen revisables.

## 2026-11-13 — Repetición independiente durante auditoría de Fase 2

Nueva ejecución de esta intervención; no sustituye ni modifica la evidencia histórica.
Linux, Node 22.22.3/npm 12.2.2; PostgreSQL 18.6 local en 55432, bases ruteam/ruteam_test
separadas. UTC 2026-11-14 02:24:42–02:25:34 = 2026-11-13 21:24:42–21:25:34 Bogota.
Comandos/resultados/salidas exactos duraderos:
[results.json](../reviews/evidence/2026-11-13-fase2-audit/results.json) y
[informe con tabla completa](../reviews/FASE2_REVIEW.md#4-verificación-repetida-en-esta-sesión).

| Estado                            | Comandos y resultado real                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APROBADO                          | npm run db:generate; npm run db:migrate (sin pendientes); npm run db:seed (huellas iguales); npm run db:test:setup (sin reset); npm run typecheck; npm run lint: todos exit0, en ese orden. |
| APROBADO                          | npm run test: 71/71, cinco suites, incluye HTTP/PostgreSQL.                                                                                                                                 |
| APROBADO                          | npm run test:e2e: 4/4 Chromium, desktop y viewport móvil web; no teléfono.                                                                                                                  |
| APROBADO                          | npm run smoke: 6/6, API3000 existente; npx expo-doctor apps/client: 18/18; git diff --check: exit0.                                                                                         |
| APROBADO                          | Checksums _prisma_migrations: 4/4 coinciden en cada BD; seed conserva 12 tablas; .env sin cambios.                                                                                          |
| FALLIDO                           | npm audit --json: exit1; 1 baja/34 moderadas/5 altas/0 críticas. No se aplicaron fixes.                                                                                                     |
| NO EJECUTADO en esta intervención | Exports/builds de bundles, carga, rollback/restauración, Windows y CI remoto; consultar únicamente evidencia histórica cuando corresponda.                                                  |
| BLOQUEADO POR ENTORNO             | Expo Go físico y LAN del teléfono. Doctor y web no acreditan esas capacidades.                                                                                                              |

Los servicios existentes no se reiniciaron ni duplicaron. Playwright usó puertos libres
3100/8082 y cerró sus procesos. Concurrencia probada aquí: publicación superpuesta del
mismo conductor [201,409], no último cupo de reservas. Ninguna reserva implementada.

## 2026-11-14 — Evidencia del traslado de workspaces

Nueva intervención local; resultados históricos anteriores se conservan íntegros.
Linux/Node22.22.3/npm12.2.2, versiones sin cambios. Base bab4e63 publicada, refactor sin
stage/commit en task/refactor-monorepo-structure. No integrado en feature/dev/main.

[Resultados antes](../reviews/evidence/2026-11-14-arch-refactor/baseline.json),
[después](../reviews/evidence/2026-11-14-arch-refactor/postmigration.json),
[HTTP/env](../reviews/evidence/2026-11-14-arch-refactor/http-and-env.json) y
[review completo](../reviews/ARCH_REFACTOR_REVIEW.md) registran comandos/exit/entorno/límites.
216 archivos originales,133gitkeep, permisos y sufijos preservados. Sólo7 excepciones
config/docs dentro de workspaces; schema/SQL/dominio/React funcional/contratos idénticos.

| Estado                       | Resultado realmente observado                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| APROBADO                     | check:env, db:generate, typecheck, lint, format:check, build:api, build:web; Doctor frontend18/18; exports Android/iOS.                 |
| APROBADO                     | npm ci limpio aislado exit0;1309objetos lock iguales tras remapear rutas; verificador de equivalencia pasa.                             |
| FALLIDO POR ENTORNO          | npm test28pasadas43fallidas71; dos suites HTTP afectadas por conexión aBD55432 ausente. No71/71 en esta sesión.                         |
| FALLIDO POR ENTORNO          | db:migrate/db:seed/db:test:setup; smoke falla health503 incluso con API iniciada. No seed idempotente/checksumsDB actuales acreditados. |
| BLOQUEADO / NO EJECUTADO     | test:e2e y publicación concurrente201/409: falta BD_test.                                                                               |
| FALLIDO                      | npm audit exit1:40alertas,1baja34moderadas5altas0críticas; nofix.                                                                       |
| NO VERIFICADO / NO EJECUTADO | Expo Go físico/LAN, CI remoto, Windows, carga/rollback/restauración.                                                                    |

Playwright (Browser plugin no disponible), escritorio1280x900 y móvilweb390x844: antes
requests aAPI3000 ECONNREFUSED; después auth/me401/login500, health503, Swagger200/web200.
Sin pageerror/overlay/overflow visible; error real en login no se sustituye por éxito.
Capturas sintéticas inspeccionadas fuera de Git en review-artifacts/2026-11-14-architecture
bajo /home/darik/RuTeam; rutas completas en JSON browser. El caso histórico health200+errorUI
no se pudo reproducir exactamente en este entorno sin BD. No afirmar corrección funcional.
Sólo se arrancaron procesos propios API3000/Expo8081; no PostgreSQL ni otra API. .env intacto.

Además se ejecutó npm run dev:client: Metro LAN en8081 sirvió manifiesto Android200,
SDK54 y URL API3000. Se detuvo la instancia propia y se restauró dev:web8081, nunca dos
servidores simultáneos en ese puerto. No equivale a funcionamiento en un teléfono.

## 2026-11-14 — Nueva ejecución con PostgreSQL persistente autorizado

Se conserva la evidencia anterior de entorno bloqueado. El usuario autorizó un clúster
nuevo de desarrollo/test, no recuperación ficticia de datos ni otra versión del producto.
Root .env idéntico, bases ruteam/ruteam_test en55432, PG5432 no usado.

| Estado                       | Comandos/resultados de ESTA ejecución                                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APROBADO                     | db:generate/db:migrate/db:seed/db:test:setup; cuatro migraciones y checksums correctos por base. Seed repetido sin cambios en12tablas por base.                                                                                   |
| APROBADO                     | npm run typecheck; npm run lint; npm run format:check: exit0.                                                                                                                                                                     |
| APROBADO                     | npm test:71/71,5 suites, PostgreSQL real. Concurrencia de publicaciones201/409 con conteo+1.                                                                                                                                      |
| APROBADO                     | npm run test:e2e:4/4, escritorio y viewport móvil web; registro→ADMIN→publicaciónUSC2paradas→recarga.                                                                                                                             |
| APROBADO                     | npm run smoke:6/6, API3000/desarrollo; health200/databaseup y Swagger200.                                                                                                                                                         |
| APROBADO                     | npm run build:api; npm run build:web; npx expo-doctor frontend18/18; verificador216/133; git diff --check.                                                                                                                        |
| FALLO INICIAL CORREGIDO      | Primer E2E0/4 por manifiesto cacheado con API3000 en8082; traza y caso --clear1/1 demuestran solución; comandos generales/harness corregidos, sin debilitar assertions. Un recibo JSON requirió formato antes de repetir batería. |
| NO EJECUTADO / NO VERIFICADO | Expo Go físico/LAN, Windows, CI remoto, carga/restauración. Audit no repetido: su deuda histórica40/5altas sigue abierta.                                                                                                         |

[Recibos de comandos](../reviews/evidence/2026-11-14-postgresql-recovery/functional-validation-after-cache-fix.json),
[migraciones/seed](../reviews/evidence/2026-11-14-postgresql-recovery/database-validation.json),
[RED/GREEN cache](../reviews/evidence/2026-11-14-postgresql-recovery/metro-cache-diagnosis.json),
[informe](../reviews/POSTGRESQL_RECOVERY_VALIDATION.md).
Web normal8081 reiniciada por comando general corregido: auth/me200, perfil guardado y
recargado, inactiva403 y ausencia de mensaje de conexión en desktop1280x900/móvilweb390x844.
Original de perfil restaurado tras la comprobación. Sin pageerror o fallos de red; sólo
identidades sintéticas existentes. Capturas inspeccionadas fueraGit en review-artifacts/
2026-11-14-postgresql-recovery bajo /home/darik/RuTeam. No prueba de dispositivo nativo.
