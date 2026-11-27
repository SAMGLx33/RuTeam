# Revisión del traslado backend/frontend — 2026-11-14

Agente Codex; responsables humanos POR_ASIGNAR. Estado **PARCIAL POR ENTORNO**.
Dictamen **APROBAR CON CONDICIONES para revisión estructural**; **NO APROBAR integración
actualmente**. La conservación estructural está demostrada; no están aprobados los flujos
PostgreSQL, ni Expo Go físico, ni ejecución CI remota. No hay autorización Git de escritura.

## Base e integración

Rama task/refactor-monorepo-structure; HEAD/base bab4e630784714f8fa58bcbf964ea5a48e37259a,
igual a task/trips-publicacion y origin/task/trips-publicacion después de fetch real.
Feature/main/dev siguen en e3841bc; no existe origin/feature. La prueba ancestral Fase2→
feature devuelve1: NO integrada. Checkpoint documental f637499 sigue aislado. Ninguna
ref compartida o task/trips-publicacion modificada por este refactor. Stage vacío.

Rama nueva autorizada desde el commit Fase 2, no desde una copia prototipo. Primero
revisar/integrar Fase 2 a feature; después comparar el refactor contra feature en ese estado.
No presentar PR que introduzca inadvertidamente Fase 2. Un merge/cherry-pick futuro sólo
con autorización, árbol limpio y preservando historia; no se ejecutó aquí.

## Equivalencia y límites arquitectónicos

Movimiento físico de directorios completos apps/api→backend y apps/client→frontend,
con ocultos, permisos y outputs ignorados; apps se retiró sólo con rmdir al quedar vacío.
216 archivos originales:177 backend y39 frontend;133 .gitkeep (119/14) preservados.
Mismos sufijos, módulos MVC verticales, features/rutas/componentes/adaptadores Expo.
Código bajo backend/src, frontend/app y frontend/src, SQL/schema, tests de API y contracts preservan
contenido; ningún endpoint, firma pública, regla o estado RF/RNF cambia. No reservas.

[Manifest antes](evidence/2026-11-14-arch-refactor/inventory-before.json),
[manifest después](evidence/2026-11-14-arch-refactor/inventory-after.json) y
`node scripts/verify-workspace-move.mjs` comprueban SHA256, permisos, inventario exacto,
.gitkeep, módulos/features, ausencia de workspaces antiguos y grafo/enlaces npm.
El helper es verificación del corte de traslado, no gate que congele futuras funciones.
El verificador previo falló por ausencia esperada de los destinos; su primera ejecución
bajo sandbox no podía invocar Git, y se repitió con permisos de ejecución adecuados.
Después del movimiento todos sus checks aprueban. No usar esa limitación como fallo de app.

### Siete excepciones dentro de los workspaces, una a una

| Archivo destino          | Diferencia autorizada respecto al original                                            |
| ------------------------ | ------------------------------------------------------------------------------------- |
| backend/package.json     | Sólo dev/test: ../.env y ../node_modules/jest, mismos scripts/identidad/dependencias. |
| backend/prisma.config.ts | Sólo dotenv ../../.env→../.env; schema/migrations/datasource iguales.                 |
| backend/prisma/seed.ts   | Sólo ese path dotenv; negocio del seed byte a byte equivalente.                       |
| frontend/app.config.ts   | Sólo dotenv ../../.env→../.env; conserva Expo Router y extra.apiUrl.                  |
| frontend/tsconfig.json   | Sólo alias contracts ../../packages→../packages; sin cambiar strict.                  |
| backend/AGENTS.md        | Referencia raíz y responsabilidades MVC obligatorias para futuros agentes.            |
| frontend/AGENTS.md       | Referencia raíz y responsabilidades Router/features; check compatible sin upgrades.   |

Archivo adicional único en los workspaces: frontend/.env.example, sólo URL pública sin
credenciales. No se crea frontend/.env ni se modifica root .env. Configs/imports raíz
cambiados: workspaces package.json; lockfile; ESLint frontend glob; gitignore generated;
fixture Node de publication.spec.ts importa Prisma desde backend. Scripts raíz/Playwright/
Jest/tsconfig.tests/Compose conservan significado y no precisan sustitución de paths.
CI mantiene instalación y scripts npm por nombre; añade format:check y Doctor frontend.
No se afirma ejecución GitHub Actions. No plantillas, capas internas nuevas o app paralela.

## Npm, Prisma y entorno

Workspaces backend/frontend/packages/*, nombres @ruteam/api/@ruteam/client/@ruteam/contracts.
Lockfile reproducido con --package-lock-only --ignore-scripts; enlaces reconstruidos con
npm install --ignore-scripts; npm ci aislado exit0,1238 paquetes. No nuevas dependencias
ni upgrades:1309 entradas antes/después, equivalencia TOTAL de objetos tras remapear rutas.
[Recibo de instalación](evidence/2026-11-14-arch-refactor/installation.json).

Node22.22.3/npm12.2.2/Nest11.2.10/Prisma7.10.1/Expo54.0.38/Router6.0.24/React19.1/
RN0.81.5/TS5.9.3/Playwright1.65.1. No cambio de versiones. Cuatro migraciones SQL y schema
idénticos; no migración nueva, reset, borrado o db-push. No se verificaron checksums de
_prisma_migrations en vivo porque el clúster configurado no existe. No reutilizar recibos
históricos como consulta de hoy. Seed idempotente está preservado por fuente, NO revalidado
en BD hoy; su comando falló antes de escribir por conexión rechazada.

.env original conservado (comprobación booleana sin guardar su contenido/huella privada).
Backend dotenv/scripts desde backend apuntan a raíz; Expo conserva carga raíz sin override.
EXPO_PUBLIC_API_URL proceso domina: observado default localhost3000 y override3100 para
Playwright. Extra público efectivo sólo apiUrl y router de Expo; sin secretos.
No se cambia el origen real de configuración por inferencia. frontend/.env.example ofrece
URL pública separada; no copiar claves de backend a EXPO_PUBLIC. SETUP explica LAN/CWD.

## Pruebas realmente ejecutadas

Linux local. [Baseline](evidence/2026-11-14-arch-refactor/baseline.json) y
[resultados posteriores](evidence/2026-11-14-arch-refactor/postmigration.json) incluyen
comandos exactos, exit, duraciones y resúmenes. Salida cruda sólo fuera de Git en /tmp;
estos recibos derivados y el informe son evidencia duradera. No logs/caches/builds versionados.

| Estado posterior         | Comando real                                                 | Resultado y límite                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APROBADO                 | npm run check:env                                            | Diagnóstico Node/Git/psql, no garantiza BD configurada.                                                                                                                      |
| APROBADO                 | npm run db:generate                                          | Prisma7 generado en backend/src/generated, ignorado.                                                                                                                         |
| FALLIDO POR ENTORNO      | npm run db:migrate                                           | Config/prisma.config correcto; no conexión a127.0.0.1:55432, sin aplicar cambios.                                                                                            |
| FALLIDO POR ENTORNO      | npm run db:seed                                              | Mismo destino ausente; no valida idempotencia en vivo.                                                                                                                       |
| FALLIDO POR ENTORNO      | npm run db:test:setup                                        | ECONNREFUSED55432, sin crear/resetear bases.                                                                                                                                 |
| APROBADO                 | npm run typecheck; npm run lint; npm run format:check        | exit0, no pruebas de dominio en producción.                                                                                                                                  |
| FALLIDO POR ENTORNO      | npm test                                                     | exit1:28 aprobadas/43 fallidas/71,5 suites (3 aprueban,2 fallan); errores BD55432. No71/71.                                                                                  |
| BLOQUEADO / NO EJECUTADO | npm run test:e2e                                             | Falta PostgreSQL_test; no lanzar suite que espera readiness imposible. Concurrencia de publicaciones201/409 y flujo registro/revisión/publicación de Fase2 no repetidos hoy. |
| FALLIDO POR ENTORNO      | npm run smoke                                                | Inicialmente API ausente; repetido con API: health503, falla aserción PostgreSQL. No6/6.                                                                                     |
| APROBADO                 | npm run build:api; npm run build:web                         | Compilación/export reales, no aprobación de login.                                                                                                                           |
| APROBADO                 | npx expo-doctor frontend                                     | 18/18, no prueba de teléfono.                                                                                                                                                |
| APROBADO                 | npm exec -w @ruteam/client -- expo export --platform android | Bundle exportado; no Android físico/APK.                                                                                                                                     |
| APROBADO                 | npm exec -w @ruteam/client -- expo export --platform ios     | Bundle exportado; no iPhone/IPA.                                                                                                                                             |
| FALLIDO                  | npm audit --json                                             | 40 alertas:1baja/34moderadas/5altas/0críticas, sin fixes.                                                                                                                    |
| APROBADO                 | node scripts/verify-workspace-move.mjs; git diff --check     | Equivalencia y whitespace; no stage.                                                                                                                                         |
| NO EJECUTADO             | CI remoto, Windows, rollback/restauración/carga              | No atribuir resultados.                                                                                                                                                      |
| NO VERIFICADO            | Expo Go físico/WiFi real/SecureStore nativo                  | Sin teléfono observado.                                                                                                                                                      |

La batería pura de baseline fue20/20, no71/71. Las suites HTTP del npmtest posterior
pudieron validar ocho casos adicionales sin BD, pero el conjunto falla; no ocultar43fallos.

## Navegador y servicios reales

Antes no había API3000/Expo8081/PG55432; PG del sistema5432 ajeno no se tocó. Se inició
una sola instancia propia Expo para baseline y se detuvo antes del mv. Tras mover se
iniciaron API3000 y Expo8081 desde los scripts raíz ya ajustados, sin duplicar puertos.
Se dejan esas dos instancias propias para inspección; sus PIDs finales en final-checks.json.
No se arranca/crea/reinicia PostgreSQL ni se altera configuración para ocultar su ausencia.
Se probó también npm run dev:client con Metro LAN en8081: manifiesto Android200, SDK54,
apiUrl3000; se detuvo esa instancia propia y se restauró una sola web8081.
[Recibo Metro LAN](evidence/2026-11-14-arch-refactor/metro-lan.json); no teléfono ni Expo Go físico.

Flujo observado: localhost8081→login DEMO→petición real→error real del backend.
Browser plugin no disponible; Playwright Chromium, escritorio1280x900 y móvilweb390x844; título observado “RuTeam”.
Identidad/título/contenido significativo comprobados; sin pageerror, framework overlay o
overflow visible. Capturas inspeccionadas; consola tiene respuestas esperadas401 y500,
no se declara consola libre de errores HTTP. No login/perfil/publicación funcional aprobados.

Antes: GETauth/me y POSTlogin localhost3000 ECONNREFUSED, mensaje de conexión. Después:
GETauth/me401 sin sesión y POSTlogin500 por BD ausente; web200, Swagger docs-json200
con16paths, health503 y CORS localhost8081 correcto. Esto acredita transporte HTTP hasta
Nest, no database=up ni corrección de la condición histórica health200+UI fallida reportada
por equipo; esa condición exacta no se pudo recrear con el entorno actual.
[HTTP y entorno efectivo](evidence/2026-11-14-arch-refactor/http-and-env.json),
[browser antes](evidence/2026-11-14-arch-refactor/browser-baseline.json),
[browser después](evidence/2026-11-14-arch-refactor/browser-postmigration.json).
Capturas sintéticas duraderas fuera de Git: /home/darik/RuTeam/review-artifacts/2026-11-14-architecture/.
No tocar el cliente para fabricar un éxito o cambiar el mensaje funcional fuera del alcance.

## Hallazgos y riesgos

| ID     | Severidad / tipo          | Estado y disposición                                                                                                                                                                   |
| ------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ENV-01 | Alto para demo / previo   | BD configurada55432 y directorio temporal desaparecidos. Bloquea HTTP/seed/concurrencia; responsable suministra/restaura entorno autorizado y repite suites. No recreación silenciosa. |
| DEP-01 | Alto / heredado           | 40avisos/5altas; lockfile idéntico en paquetes. Tratamiento compatible o aceptación humana separada, no resolución por mover carpetas.                                                 |
| QA-01  | Evidencia / pendiente     | Expo Go físico/LAN y CI remoto no observados; no extrapolar bundles.                                                                                                                   |
| MVC-01 | Deuda previa / preservada | health.controller SELECT1 readiness y domain/membership.policy fuera de subcarpeta policies. No se refactoriza durante traslado; evaluar en tarea distinta si procede.                 |
| CWD-01 | Limitación previa         | Dotenv relativo a CWD conservado. npm -w trabaja desde workspace; invocar comandos manuales desde otro CWD requiere config correcta, no robustez nueva inventada.                      |
| GIT-01 | Proceso / pendiente       | Fase2 publicada pero sin integrar; refactor depende de ella. Sin stage, commit, PR, merge/push ni permisos remotos inferidos.                                                          |

No defectos Critical/Important/Minor atribuibles al traslado en revisión independiente.
Se cotejaron216archivos/133gitkeep/1309objetos lock completos. Revisor sólo lectura, sin
suites propias: sus comprobaciones no sustituyen ejecuciones del agente implementador.

### Asuntos apartados por el revisor y resolución del agente

| Asunto considerado     | Resolución explícita y costo/límite                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| HTTP/seed/concurrencia | Bloqueados por ENV-01, no aprobados; promover sin repetirlos arriesga demo no funcional.                      |
| Error navegador previo | Transporte observado después; condición histórica health200 no reproducida. No claim de corrección funcional. |
| Expo Go/LAN            | NO VERIFICADO; QA debe probar dispositivo real antes de declarar hito móvil.                                  |
| Deuda MVC              | Preservar fuente cumple alcance; cambiarla aquí introduciría riesgo funcional no autorizado.                  |
| Dotenv/CWD             | Conservar y documentar scripts correctos; invocación manual fuera de CWD sigue limitada.                      |
| Dependencias           | 40/5 reales y no mitigadas; tarea específica antes de aceptación final.                                       |
| Cierre documental      | Se completa con este review, AGENTS, handoff, PROGRESS y evidencia nueva antes de entregar.                   |
| CI remoto              | No ejecutado; integrador verifica pipeline después de autorización de publicación.                            |
| Integración feature    | Primero Fase2, luego diff estructural revisado; evita introducir cambios funcionales inadvertidos.            |

## Privacidad, diff y condición de revisión humana

Fuentes privadas ignoradas y no tocadas, ningún original rastreado. Sin .env, secretos,
PII real, dumps, generated, outputs, screenshots o logs crudos nuevos dentro del commit
propuesto. Sólo derivados JSON/Markdown y helper de comprobación. .env.example público
contiene URLlocalhost sin credenciales. El scanner señaló cuatro coincidencias de correo
en avisos deprecated de glob del lockfile: se cotejaron idénticas al commit base, contactos
públicos de metadata npm preexistente, sin nuevos datos del equipo. No se reproducen
direcciones ni se altera metadata de dependencias para ocultarlas. Los manifests históricos de Fase2 conservan sus
paths/hashes de entonces; enlaces actuales/planes futuros se actualizan por contexto.

Git sin stage muestra eliminaciones apps/* y archivos destino untracked, NO renames
indexados. Son216 movimientos físicos comprobados; reconocerá renames al stage autorizado.
Inventario exhaustivo de cambios reales al cierre: final-checks.json. git diff --stat por
sí solo omite todos los destinos nuevos. Revisar ambos conjuntos; no usar git add -A.

Responsable humano POR_ASIGNAR: proporcionar un entorno DEMO/test autorizado sin reset,
repetir migraciones/seed/idempotencia/checksums/71Jest/4Playwright/smoke6/healthDBup y
validar el error histórico de conexión. Asignar datos/backend/frontend/QA/docs/integrador.
Después decidir autorización separada del commit local, push y PR; PR refactor a feature
sólo después de integrar Fase2 y revalidar el diff. Este informe no concede esas operaciones.

Mensaje futuro propuesto, NO ejecutado:

```text
refactor(architecture): reorganize RuTeam into backend and frontend workspaces
```

## Comprobaciones de cierre

[Auditoría de referencias](evidence/2026-11-14-arch-refactor/path-audit.json):129 coincidencias
en18archivos revisadas por contexto; ninguna configuración/código activo conserva rutas
obsoletas. Los literales antiguos restantes son snapshots históricos o mapas antes/después.
[Comprobaciones estáticas finales](evidence/2026-11-14-arch-refactor/final-static.json)
registran las repeticiones después del cierre documental, sin repetir suites BD bloqueadas.

Un control intermedio de formato señaló únicamente el JSON de PIDs recién actualizado;
se formateó ese recibo y se repitió el control. El fallo intermedio y su seguimiento
se conservan en final-static.json, sin afectar código ni resultados funcionales.

## Revalidación funcional posterior — 2026-11-14

Actualiza el estado LOCAL descrito en las secciones anteriores, que se conservan históricas.
Usuario autorizó un clúster PostgreSQL nuevo persistente en127.0.0.1:55432, bases ruteam y
ruteam_test, manteniendo .env. Sistema5432 no usado. ENV-01 queda resuelto para esta máquina;
no se recuperan datos originales desaparecidos, se inicializan bases nuevas autorizadas.

Cuatro migraciones/checksums4/4 por base y seed idempotente12tablas por base. Nueva batería
71/71 Jest,4/4 Playwright,6/6 smoke, Doctor18/18, typecheck/lint/formato/builds y verificador
216/133 aprobados. Health200/up, Swagger200 y web normal8081 con login/perfil persistente.
Concurrencia de publicaciones201/409 y conteo+1 comprobados sobre PostgreSQL real.

Se encontró un defecto de configuración reproducible: E2E8082 usaba API3000 cacheada.
Sin alterar variables ni assertions, --clear en comandos generales root dev:web/dev:client
y en Playwright8082 recompila el manifiesto con API correcta3100/BD_test. Tres flags,
negocio/SQL/modelos/tests/contratos/dependencias intactos. Revisión independiente favorable
al ajuste; primer fallo4/4, diagnóstico1/1 y batería final4/4 se conservan por separado.

**Estado actual: VALIDADO FUNCIONALMENTE EN LOCAL.** Se retira el bloqueo técnico por BD
anterior, pero la integración sigue requiriendo revisión/autorización y Fase2 previa en
feature. Expo Go físico/CI remoto/decisionesPO y riesgos audit anteriores no se resuelven
con esta ejecución. [Informe y evidencia nuevos](POSTGRESQL_RECOVERY_VALIDATION.md),
[handoff](../handoffs/2026-11-14_task-refactor-monorepo-structure_recuperacion-postgresql.md).
