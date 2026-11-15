# Instalación local

## Requisitos y diagnóstico

Node22.12–22.x (probado22.22.3), npm10+ (probado12.2.2), Git, PostgreSQL17/18
(probado18.6). Docker opcional, nunca requisito si hay PostgreSQL nativo.
`npm run check:env`; comprobar puertos3000/8081/5432 o escoger alternativas.
En esta VM Linux VirtualBox, sandbox impidió sockets y npm DNS; ejecución autorizada
fuera del sandbox permitió instalarlos. No es un error de aplicación.

## PostgreSQL: elegir UNA alternativa

Compose si Docker es accesible:

```bash
docker compose up -d db
```

.env.example coincide con ese contenedor; crear test con `npm run db:test:setup`.
No borrar volúmenes ni resetear bases compartidas.

PostgreSQL ya instalado: crear rol/bases propios con permisos del administrador;
usar URLs reales de esas bases en .env, con test terminando `_test`. El script de
test crea esa base si el rol tiene CREATEDB; si no, pedir al administrador que la cree.
No requiere cuenta USC ni servidor cloud.

### Receta histórica de fundación — no ejecución actual

El 2026-11-13 se probó un clúster aislado, no el servicio del sistema:

```bash
/usr/lib/postgresql/18/bin/initdb -D /tmp/ruteam-pg-20261113 -A trust --username=ruteam --no-locale --encoding=UTF8
/usr/lib/postgresql/18/bin/pg_ctl -D /tmp/ruteam-pg-20261113 -l /tmp/ruteam-pg-20261113/server.log -o '-h 127.0.0.1 -p 55432 -k /tmp' start
psql -h 127.0.0.1 -p 55432 -U ruteam -d postgres -c 'CREATE DATABASE ruteam'
```

No repetir initdb/CREATE si ya existen. Trust sólo en loopback para identidades
sintéticas de esta demo temporal; no usar con datos reales. URL usada en .env local:
`postgresql://ruteam@127.0.0.1:55432/ruteam`; test mismo host y base `ruteam_test`.
Este directorio /tmp no garantiza persistencia tras reinicio del host. Para el equipo,
usar PostgreSQL/Compose persistente. Al terminar:
`/usr/lib/postgresql/18/bin/pg_ctl -D /tmp/ruteam-pg-20261113 stop`.

## Ubuntu/Linux

```bash
npm ci
test -f .env || cp .env.example .env
# Editar .env antes de migrar; iniciar BD elegida.
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:test:setup
npm run dev:api
```

En otra terminal raíz: `npm run dev:web` o `npm run dev:client`.
Prisma7.10.1 requiere --config prisma.config.ts explícito en scripts del API.
No usa formato Prisma6 ni genera en node_modules. Si binarios requieren red, permitir
registry.npmjs.org y binaries.prisma.sh; no desactivar TLS. npm12 puede bloquear
scripts de dependencias; prisma generate descargó su motor oficial, sin aprobar
scripts arbitrarios ni telemetría Scarf. Diagnosticar el paquete exacto si otro host falla.

## Windows PowerShell (receta, no ejecutada en esta sesión Linux)

Instalar Node22 y PostgreSQL; crear BD/rol locales o usar Docker Desktop opcional.

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Editar .env con URLs PostgreSQL locales.
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:test:setup
npm run dev:api
```

Otra terminal: `npm run dev:web` o `npm run dev:client`. Scripts Node no dependen
de cp/bash salvo la copia manual arriba. Permitir Node en firewall para red privada.

## Expo Go físico y LAN

SDK54 fijado; comprobar versión REAL de Expo Go y soporte SDK54 en cada teléfono.
No se verificó dispositivo físico aquí. Expo Go actual de tiendas puede haber dejado
de soportar SDK54; Android puede requerir versión compatible obtenida de fuente oficial;
iOS físico suele limitarse a la versión App Store. Consultar https://expo.dev/go
antes de prometer compatibilidad y registrar modelo/OS/versión/resultado. No actualizar
SDK sin decisión y evidencia. RNF-047: iOS14 incompatible, SDK54 requiere iOS15.1+.

1. Computador/teléfono en misma WiFi, desactivar aislamiento clientes si red lo permite.
2. Obtener IP del host: `ip -br address` Linux o `ipconfig` Windows. La consulta autorizada de esta VM mostró enp0s3=10.0.2.15/24, configuración
   compatible con NAT de VirtualBox; no es prueba de acceso desde WiFi. Confirmar
   NAT/puente en VirtualBox y probar desde teléfono.
3. EXPO_PUBLIC_API_URL=http://IP_ACCESIBLE:3000/api/v1. Para web LAN, añadir
   http://IP_ACCESIBLE:8081 a CORS_ORIGINS. Reiniciar API y Expo al cambiar .env.
4. API escucha0.0.0.0, Expo --lan; abrir health desde navegador del teléfono primero.
5. Escanear QR de Metro desde Expo Go. No es QR institucional ni QR interno de abordaje.
6. Probar Ana, Laura y Diego, edición/persistencia/logout; registrar resultados reales.

VirtualBox: NAT no expone automáticamente la IP del invitado a WiFi. Preferir adaptador
puente con IP alcanzable o configurar redirecciones TCP3000 y8081 host→guest y anunciar
IP del host. Expo puede necesitar REACT_NATIVE_PACKAGER_HOSTNAME=IP_HOST cuando hay NAT;
no adivinar IP. Tunnel de Expo no vuelve accesible una API local; probar health aparte.
En web usar el MISMO hostname para app/API (localhost con localhost o IP con IP), porque
cookies SameSite Strict no cruzan sitios. HTTP LAN es excepción de demo sin datos reales.

## Problemas comunes

-401: falta sesión/expirada/revocada; entrar otra vez.403: afiliación inactiva/vencida,
Origin no listado o falta x-ruteam-client.404 en trips/reservations: módulo futuro.

- Prisma P1001/health503: comprobar URL/puerto/servicio; no cambiar por mocks.
- API caída: cliente muestra mensaje de red, no datos ficticios.
- Cambio .env: reiniciar Expo; valores EXPO_PUBLIC se empaquetan para el cliente.
- Puerto ocupado: cerrar sólo procesos propios o configurar puerto y URLs coherentes.
- Auditoría dependencias: consultar EVIDENCE; no usar --force ni subir Expo mayor sin prueba.
- SSR no se usa; web se sirve desde Metro con Router (sin Vite/Next).

## Workspaces y entorno vigentes tras refactor

backend/ contiene Nest/Prisma; frontend/ es el project root Expo para web y Expo Go.
Los scripts raíz dev:api/dev:web/dev:client y db:* siguen iguales y resuelven los nombres
@ruteam/api y @ruteam/client. Prisma config/seed leen ../.env desde backend. No mover
schema/migraciones/generados a frontend ni ejecutar herramientas desde el CWD incorrecto.

La configuración anterior de Expo se CONSERVA: app.config.ts carga ../.env raíz con
quiet:true y sin override. EXPO_PUBLIC_API_URL ya definida en el proceso tiene prioridad;
Expo admite su .env local estándar, pero no copiar a éste los secretos del servidor.
frontend/.env.example contiene sólo una URL pública de ejemplo; nunca DATABASE_URL,
TEST_DATABASE_URL, claves o tokens en EXPO_PUBLIC_* ni extra. No versionar frontend/.env.
Para un override inequívoco sin editar archivos (Linux):

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1 npm run dev:web
# Comprobar configuración pública; no imprimir entorno privado completo:
npm exec -w @ruteam/client -- expo config --type public
```

Playwright usa una variable de proceso explícita http://localhost:3100/api/v1 y Expo8082;
la carga dotenv sin override no la reemplaza. Verificar request real en navegador.
Para navegador Ubuntu usar localhost con localhost en8081/3000. En teléfono localhost es
el teléfono; determinar IP LAN/VM NAT/puente real y CORS antes de configurar la URL pública.
No adivinar direcciones ni declarar Expo Go probado con export/viewport. No lanzar dev:web
y dev:client a la vez en8081; escoger uno e inspeccionar procesos antes de reiniciar.

Diagnóstico del14/11: .env conserva55432, pero no existe listener ni el directorio temporal
del ejemplo histórico. PostgreSQL del sistema en5432 no es la BD de esta configuración;
no migrarlo ni cambiar credenciales automáticamente. Responsable debe proporcionar/restaurar
un entorno DEMO y test autorizado. Hasta entonces login/health DB y E2E están bloqueados;
la migración de carpetas no remedia una BD ausente ni autoriza reset o recreación.

## Entorno persistente vigente — recuperación autorizada 2026-11-14

Sustituye el clúster temporal perdido de las recetas históricas anteriores. PostgreSQL18
real de desarrollo/test:127.0.0.1:55432, ruteam/ruteam_test; .env original conservado.
Datos de ESTA máquina fuera de Git en /home/darik/RuTeam/.local-data/postgresql-18/data,
socket privado y logs en el mismo padre. No volver a inicializar ese directorio.
El servicio del sistema5432 es ajeno y no se utiliza. No autoinicio añadido; tras reboot
el directorio persiste, pero iniciar el proceso manualmente si está detenido:

```bash
/usr/lib/postgresql/18/bin/pg_ctl -D /home/darik/RuTeam/.local-data/postgresql-18/data status
# Sólo si está detenido y el puerto55432 está libre:
/usr/lib/postgresql/18/bin/pg_ctl -D /home/darik/RuTeam/.local-data/postgresql-18/data -l /home/darik/RuTeam/.local-data/postgresql-18/postgresql.log -w start
/usr/lib/postgresql/18/bin/pg_isready -h 127.0.0.1 -p 55432 -d ruteam
/usr/lib/postgresql/18/bin/pg_isready -h 127.0.0.1 -p 55432 -d ruteam_test
```

Antes de parar, terminar sólo servicios propios que usen esas bases y no estar ejecutando
suites. Para parada normal del clúster propio, conservando datos:
`/usr/lib/postgresql/18/bin/pg_ctl -D /home/darik/RuTeam/.local-data/postgresql-18/data -m fast -w stop`.
No reset/dbpush/drop ni initdb de nuevo. Estas son instrucciones, no parada ejecutada.

`npm run dev:web` y `npm run dev:client` ahora limpian caché Metro al arrancar. Playwright8082
hace lo mismo: Expo54 incrusta extra.apiUrl en el bundle web y podía reutilizar API3000
cuando el test necesita3100. No cambiar CORS para permitir ese destino incorrecto ni hacer
que E2E escriba en desarrollo. Reiniciar sólo instancias propias tras comprobar puertos;
no arrancar web y MetroLAN simultáneamente en8081. .env/variables y nombres npm siguen iguales.

La app conserva el seed y el modo de identidad sintética existentes; esta recuperación
es PostgreSQL real y no crea una aplicación alternativa o una integración USC oficial.
[Validación funcional actual](../reviews/POSTGRESQL_RECOVERY_VALIDATION.md).
