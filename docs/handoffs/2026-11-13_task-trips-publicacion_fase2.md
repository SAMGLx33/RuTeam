# Handoff — Fase 2 / vehículos y publicación USC

- Fecha: 2026-11-13, zona America/Bogota. Agente: Codex.
- Responsable humano y revisor de módulo: POR_ASIGNAR.
- Rama: task/trips-publicacion, creada desde feature.
- SHA base/HEAD (sin nuevo commit): e3841bc189ac1661210adf920cd3f8fb3db6a8ce.
- Checkpoint documental leído:f637499113a9094f588f73fc880d25ab7071b002, NO integrado.
- Estado: PARCIAL (corte local verificado, sin commit autorizado ni prueba Expo Go física).
- Requisitos:Fase2 RF-003/004/013/022/024/029, parcialmente RF-002/012/015/018;
  RNF-039/040/045/046/048/050 según matriz, sin afirmar cumplimiento total de métricas.

## Contexto leído y decisiones respetadas

Se inspeccionaron pwd/status/branch/log/remote/árbol; se leyeron íntegros AGENTS raíz y
API/cliente, CONTRIBUTING, coordinación, PROGRESS, EVIDENCE, decisiones, matriz y
ambos handoffs previos (el de checkpoint antes de switch). Modelos/contratos y tests
reales revisados. main/dev/feature seguían en fundación y checkpoint no era ancestro
de feature: se avanzó aislado sin fusionar ni copiar trabajo de otro frente.
Único untracked ajeno: docs/RuTeam_Referencias_Codex_PRIVADO/. Se aisló por exclusión
local antes del switch y se añadió .gitignore permanente, sin alterar originales.

## Fuentes examinadas y cotejo

Fuentes físicamente en docs/RuTeam_Referencias_Codex_PRIVADO/reference-private/,
no en reference-private raíz. ERS_RuTeam.doc33p leído completo vía antiword0.37-17,
extraído sólo a /tmp/ruteam-reference-extraction (permisos restringidos); rúbrica4p
con pdftotext; UML XML36/36pestañas con clases/firmas/mensajes/reglas/relaciones.
Huellas SHA256 originales antes/después coinciden; no documentos ni PII en Git.
Catálogo derivado ERS_CATALOG conserva criterios/títulos; TRACEABILITY reemplaza
50posiciones por RF-001..030/RNF-031..050.49prioridades unívocas; RF-001 ausente en
matriz, no inferir de totales. Sincronización documental100%IDs no equivale a50RF hechos.
UML_CROSSWALK mapea36pestañas y firmas. Rúbrica exige entrega28/11/2026 y evidencias
reales; no se fabricaron sprints/entrevistas/burndown ni se expusieron datos de autores.

## Objetivo y criterios de aceptación

Registro/listado de vehículos propios con placa única/formato, tipo, pasajeros sin
conductor, marca/año/color y SOAT sintético. Licencia DEMO y aprobación ADMIN de la
presentación exacta. Publicación a destino USC activo, salida estrictamente>ahora+30min,
cupos≤vehículo, paradas consecutivas y reglas existentes; listado propio persistido.
Documentos aprobados y vigentes hasta final del intervalo DEMO. Rechazar actores
inactivos/vehículos ajenos, destino externo/inactivo, tiempo/capacidad/DTO inválidos,
solapamientos (incluidos simultáneos) y tarjeta de revisión obsoleta. Sin reservas.

## Cambios implementados: archivos, rutas y métodos

- .gitignore/.prettierignore excluyen reference-private y paquete recibido; .git/info/exclude
  protege localmente también. Sin cambios a .env ni package-lock/dependencias.
- api/modules/vehicles: VehiculoController, VehiculoService, VehiculoRepository,
  RegisterVehicle/License/ReviewDocument DTO y VehiculoPolicy; registro/listado propio,
  revisión ADMIN, licencia sintética. DriverEligibility reemplaza boolean legado como
  fuente de capacidad conductor; permanece capacidad pasajero.
- api/modules/trips: ViajeController, ViajeService.publicarViaje/listarPropios,
  ViajeRepository.withDriverLock/unidad de trabajo, PublishTripDto y Viaje dominio puro.
- app.module importa módulos; filtro DomainPolicyError→400; DTOorigin exige objeto.
  AuthRepository incluye licencia y auth/me deriva capacidad conductor de revisión/vigencia.
- app cliente: rutas compartidas /vehicles,/publish,/my-trips,/document-reviews;
  ProtectedPage y Field; React Hook Form/useWatch/TanStack Query; errores reales y estados
  pendientes, selección vehículo/destino/reglas, varias recogidas y revisión versionada.
  No mapa/GPS ni frontend paralelo. No Prisma dentro del código React.
- contracts agrega VehicleSummary/DemoLicense/TripSummary y inputs. Tests API nuevos
  phase2-policy/phase2.e2e; tests/web/publication.spec y tests/package.json ESM.
- Docs: gobernanza, API/modelo/crosswalk/traceability/decisiones/lectura fuentes/README,
  DEPENDENCY_REVIEW, evidencia, PROGRESS, WORKSTREAMS y nota no integrada CURRENT_STATUS.
- .gitkeep retirados sólo donde llegaron archivos reales; hojas futuras permanecen.

## Contratos API/WS y dependencias

GET/POST vehicles; GETvehicles/catalog; GET/POSTdriver-eligibility;
GETadmin/demo/document-reviews; POSTadmin/demo/vehicles/:id/review y
admin/demo/driver-eligibility/:id/review (decision+revision);
GETtrip-rules, POSTtrips y GETtrips/my. Todos bajo/api/v1 y SessionGuard afiliación.
Registro/revisión sóloDEMO, ADMIN asignado por seed. Placa409, datos400, permisos403,
versión obsoleta409; controlador extrae actor de sesión. No role/estado/ocupación libre.
Sin eventosWS; publicación guarda TripEventPUBLISHED transaccionalmente. No reservas,
no inicio/fin, no asignación de cupos, no costos. GETtrips general conserva404.
Ver API.md/contratos. No cambiar firmas de consumidores sin revisión del equipo.

## Dominio, Prisma, migraciones y seed

Prisma7.10.1/adapter-pg; UUID y timestamptz, coordenadasDecimal. Modelos nuevos:
Vehicle/VehicleDocument/DriverEligibility, TripRuleDefinition/Selection,
Trip/TripStop/TripEvent. Trip statusPROGRAMADO, ocupaciónDISPONIBLE/LLENO derivada.
Serialización por filaUser del conductor dentro de transacción, SQL parametrizado sólo
para locking. Aplicación valida y orquesta; repositorios persisten. Revisión documental
compara revision/estado/vigencia dentro del mismo lock; renovación licencia vuelvePENDING.
Dos migraciones ADITIVAS nuevas aplicadas a desarrollo y test:
20261114014345_phase2_vehicle_publication y20261114015557_phase2_document_revisions
(nombres UTC; no fecha local de sesión). No se editó ninguna migración ya aplicada.
BD local temporal127.0.0.1:55432, ruteam y ruteam_test separadas; sin resets.
Seed idempotente conserva existentes: Diego con DEM123 y licencia sintética revisada,
reglas DEFAULT/NO_SMOKING/NO_PETS y dos destinosUSCDEMO. No datos oficiales de personas,
vehículos o documentos; revisores/fechas persistidos, sin imágenes reales.

## Pruebas realmente ejecutadas y evidencia

Base antes de cambios27/27; final71/71Jest (5suites, PostgreSQL/Supertest reales).
Playwright4/4 en escritorio1280x720 y móvilweb390x664: preserva flujo auth y añade
registro→admin separado→rechazos hora/coordenada→publicación2recogidas→recarga/lista.
Tests limpian sólo UUIDs creados, sin reset; Jest y E2E finales corrieron secuencialmente.
Prueba simultánea de publicación devuelve[201,409], sólo1fila nueva. NO pruebaúltimocupo.
Typecheck/lint aprobados; db:generate y migración/seed test reales; buildweb y export
Android/iOS reales; expo-doctor18/18. Formato y diff check en cierre. EVIDENCE tiene tabla
aprobado/fallido/noejecutado/bloqueado y fallos iniciales corregidos.
Regresiones de revisión RED→GREEN: originarray500→400 y aprobación obsoleta201→409;
coordenada vacía ya no se convierte en0 (cubiertoE2E). ESM de fixtures corregido sin
alterar el framework del producto. Dos hallazgos importantes de revisión estática corregidos;
revisor no ejecutó suites, no es revisión humana/CI remota ni merge.
Avisos reales NodeVM ypg8 de consulta ocupada, sin fallos; no ocultados ni upgradeforzado.

## Verificación web y Expo Go

Chromium real y capturas sólo sintéticas en/tmp/ruteam-phase2-{desktop,mobile-web}.png,
inspeccionadas sin clipping/overlay. Móvilweb no acredita Expo Go. SDK54 permanece;
export Android/iOS y Doctor pasan, teléfono físico/versiones no disponibles.
Los servidores de E2E3100/8082 se cerraron al finalizar. API demo3000 previa debe
reiniciarse con esta rama para que incluya módulos nuevos; ver nota final de ejecución.

## Versiones y seguridad

Node22.22.3/npm12.2.2,Nest11.2.10,Prisma7.10.1,PostgreSQL18.6,
Expo54.0.38/Router6.0.24,React19.1/RN0.81.5,TS5.9.3. Dependencias no cambiadas.
Audit40(1baja/34moderadas/5altas),exit1; dry-run added0/removed0/changed0 y40alertas.
DEPENDENCY_REVIEW registra40paquetes, alcance runtime/build y decisiones pendientes.
Sin --force, overrides o actualización incompatible. No se afirma entorno productivo.

## Bloqueos, decisiones pendientes y NO implementado

Verificación USC/QR oficial sin convenio; sólo providerDEMO. Género/moto/exclusividad,
penalidades>30/<30, costos cupos/tramos y rango de calificación siguen paraPO.
Licencia categoríasCAR/MOTORCYCLE/BOTH son sintéticas, no categorización legal acreditada.
RF-024 parcial: no carga de imágenes oficiales; RF-003 parcial: sin mapa/routing real.
Duración5..360min declarada delimita solapamiento, no es ETA. RF-013 validación regex
servidor con error visible; no se duplicó autoridad encliente. Reservas, transiciones de
recorrido, QRinterno, GPS, chat, calificaciones, SOS y economía aún no implementados.
Windows, campo, carga/RNF/Lighthouse y Expo Go físico no probados.

## Reproducción local y revisión del diff

Desde la raíz del repositorio, inspeccionar antes de cambiar de rama:

```bash
git status --short --branch
git branch -vv
git diff --stat
git diff --check
```

Con `.env` existente y PostgreSQL activo, sin sobreescribir ni reinicializar datos:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:test:setup
npm run typecheck
npm run lint
npm test
npm run test:e2e
npx expo-doctor apps/client
```

API y web en terminales separadas: `npm run dev:api` y `npm run dev:web`.
Usar el mismo hostname para ambos. Si ya están iniciados, reiniciar sólo los procesos
propios conocidos para cargar esta rama; no arrancar un segundo servidor en el mismo puerto.
Diego abre publicar; Administración revisa nuevos documentos en segundo navegador.
Leer los nuevos archivos indicados por `git status --short`, además del diff rastreado.
No stage/commit hasta autorización; excluir paquete privado, `.env`, outputs y capturas.

## Integración y siguiente paso exacto

No PR/merge/push/commitnuevo. main/dev/feature permanecen en e3841bc; checkpointf637499
permanece en su rama, no integrado. Código+tests+docs+handoff son un conjunto local sin
stage para el commit futuro autorizado. No confundir migración local con promoción a dev.
Revisores humanos: datos revisa nuevasmigraciones/seed; identidad licencia/capacidades;
frontend rutascompartidas; integrador contratos/app.module/privacidad. TodosPOR_ASIGNAR.
Siguiente acción: revisar diff de task/trips-publicacion y autorizar commit local si el equipo
lo decide; confirmar compatibilidad Expo Go físico antes de declarar hito completo.
Después, nueva tarea de reservas desde base compartida que el equipo integre: atomicidadN,
miembrosactivos y prueba PostgreSQL último cupo. No empezar reservas en esta tarea.

## Nota final de ejecución

API3000 reiniciada con esta rama; Metro8081 y PostgreSQL55432 siguen activos. Smoke6/6,
y rutas nuevas vehicles/trips/my/trip-rules devolvieron200 con sesión sintética ylogout.
No es necesario reiniciar de nuevo mientras esos procesos sigan activos; tras detenerlos
usar los comandos de reproducción. Conjunto local78rutas cambiadas/nuevas, sin stage;
originales privados sin alteraciones ni seguimiento y0marcadores sobrantes. No commitnuevo.
