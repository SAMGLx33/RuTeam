# Instalación y entornos

Guía vigente al 25/11/2026. Leer [PRODUCT_DEFINITION](../requirements/PRODUCT_DEFINITION.md)
y [arquitectura](../architecture/REPOSITORY_STRUCTURE.md). Las recetas anteriores están
[archivadas](../history/2026-11-24-guides.md); no reutilizar clústeres temporales históricos.
No se certifican servicios activos, migraciones aplicadas ni tests por publicar esta guía.

## Requisitos

Node 22.12–22.x, npm ≥10, Git y PostgreSQL 17/18; versiones efectivamente ejecutadas en
EVIDENCE. Docker es opcional. Conservar Nest/Prisma 7.10.1 y Expo SDK 54 del lockfile,
sin upgrades masivos. `npm run check:env` diagnostica herramientas, no valida negocio.

Raíz con package.json: workspaces backend (@ruteam/api), frontend (@ruteam/client)
y packages/contracts. backend usa ../.env; frontend/app.config.ts carga ../.env sin
override. Las variables explícitas del proceso prevalecen. Configuración pública de Expo
se incrusta en bundles: reiniciar al cambiar y revisar request real en navegador.
No copiar DATABASE_URL, TEST_DATABASE_URL, credenciales o tokens a frontend/.env,
EXPO_PUBLIC_* o extra. frontend/.env.example sólo contiene configuración pública.

## PostgreSQL autorizado

Inspeccionar DATABASE_URL/TEST_DATABASE_URL sin imprimir credenciales. Exigir bases
distintas, test con sufijo _test y aislamiento por proyecto. No tocar PULSO ni otros
servicios. Comprobar listener, migraciones y cliente antes de operar. No reset/drop/dbpush
ni reinicialización; migraciones incrementales con revisión de datos e historia conservada.

Computador principal: entorno persistente documentado en127.0.0.1:55432,
ruteam/ruteam_test, directorio fueraGit
`/home/darik/RuTeam/.local-data/postgresql-18/data`. Comprobar que ése siga siendo el
entorno efectivo.5432 puede pertenecer a otro servicio. No crear de nuevo el directorio.

```bash
/usr/lib/postgresql/18/bin/pg_ctl -D /home/darik/RuTeam/.local-data/postgresql-18/data status
/usr/lib/postgresql/18/bin/pg_isready -h 127.0.0.1 -p 55432 -d ruteam
```

Si ese clúster propio está detenido y55432 libre, su inicio autorizado local se realiza
con pg_ctl y su log existente; no sustituir datos por un clúster vacío para conseguir tests.
En otros computadores crear rol y bases propios con permisos del operador técnico.
`db:test:setup` crea la base_test si el rol tiene CREATEDB; si no, debe existir previamente.
El operador de PostgreSQL no constituye un rol administrativo del producto.

Alternativa en instalación nueva con puerto disponible: `docker compose up -d db`.
La plantilla Compose usa5432 y volumen persistente: ajustar .env para esa instalación,
sin cambiar automáticamente el entorno55432 del computador principal ni borrar volúmenes.

## Instalación de desarrollo

```bash
npm ci
test -f .env || cp .env.example .env
# Editar .env local con las bases autorizadas antes de continuar.
# Para fixtures locales: NODE_ENV=development, DEMO_MODE=true,
# VERIFICATION_PROVIDER=demo (opt-in; la plantilla no los habilita).
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:test:setup
npm run dev:api
```

En otra terminal raíz: `npm run dev:web` o `npm run dev:client`, uno a la vez en8081.
API3000 y Swagger /api/v1/docs. Windows PowerShell usa
`if (!(Test-Path .env)) { Copy-Item .env.example .env }` en lugar del paso de copia;
los demás scripts npm son compartidos. Windows requiere validación propia, no inferirla
de Linux. Permitir Node sólo en la red necesaria del firewall.

Prisma genera src/generated/prisma dentro de backend; jamás en frontend ni Git.
Si requiere descargas, diagnosticar el paquete/host oficial y permisos de red; no desactivar TLS.

## Separación de acceso sintético y real

| Configuración existente                                         | Uso y límite                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| NODE_ENV                                                        | development/test para fixtures; production nunca admite bypass sintético             |
| DEMO_MODE y VERIFICATION_PROVIDER                               | Identidad/proveedor sintéticos sólo para desarrollo y pruebas; no acredita matrícula |
| DATABASE_URL / TEST_DATABASE_URL                                | Persistencia real, bases separadas; nunca públicas                                   |
| SESSION_TTL_SECONDS                                             | Expiración configurable conforme a la validación del servidor                        |
| CORS_ORIGINS                                                    | Orígenes exactos permitidos; revisar junto a cabecera cliente/Origin                 |
| PORT                                                            | Puerto API coherente con URL cliente                                                 |
| EXPO_PUBLIC_API_URL                                             | URL pública /api/v1 alcanzable por navegador o dispositivo                           |
| ROUTING_BASE_URL                                                | Motor vial HTTP(S) de confianza opcional; no servicio público ilimitado              |
| EXPO_PUBLIC_ROUTE_TILE_URL / EXPO_PUBLIC_ROUTE_TILE_ATTRIBUTION | Teselas XYZ autorizadas y atribución visible; ambas públicas                         |

La plantilla mantiene DEMO_MODE=false y VERIFICATION_PROVIDER=official por defecto.
Sin fuente institucional, ese arranque informa el bloqueo; no habilita una sesión real.
Para trabajar con fixtures, editar el .env LOCAL con NODE_ENV=development, DEMO_MODE=true
y VERIFICATION_PROVIDER=demo antes de seed y db:test:setup, y reiniciar API/Expo. La UI
expone el acceso sintético sólo como opción explícita de desarrollo cuando el backend
lo permite. No trasladar ese opt-in a producción ni eliminar la guarda del seed.

El seed es sintético e idempotente para desarrollo/test. No cuentas ADMIN ni docentes o
trabajadores como estudiantes válidos. Conservar registros antiguos de auditoría y
reservas sin elevar permisos ni confirmar pendientes durante la migración. Comprobar
las migraciones nuevas del incremento en API/PROGRESS antes de usarlas en otra base.

Producción necesita autenticación legítima, fuente autorizada de estamento/vigencia,
verificación documental exigida por la política, TLS/cookies seguras y protección de PII.
No basta desactivar DEMO_MODE para declarar un despliegue seguro y funcional.
Sin evidencia institucional, operaciones protegidas reales permanecen bloqueadas.
No están documentados endpoints institucionales consumibles ni credenciales autorizadas.
Correo verificado no sustituye matrícula. No introducir contraseñas institucionales.

## Mapas y ubicación

ROUTING_BASE_URL apunta a una instancia provisionada con datos/perfil del área adecuados.
Sin motor no presentar una recta como geometría vial real. La ruta elegida se persiste;
no recalcular tras publicar. Teselas requieren licencia, atribución y límites verificados.
No asumir Nominatim/OSRM/OSM públicos como servicios ilimitados ni de pago obligatorio.
Geocodificación y demás integraciones tienen su propio estado, separado de representar un mapa.

UI mediante dirección/resultados/marcadores o ubicación consentida, sin coordenadas ni
GeoJSON manuales. Campus por referencia institucional; encuentro interior acepta texto
libre sin posición propia. La posición general del campus es aproximada y debe indicarse.
Una tesela configurada no acredita exactitud del catálogo ni vigencia institucional.

## Expo Go y LAN

Comprobar modelo, OS, versión de Expo Go y soporte SDK 54 antes de ensayar dispositivo.
Consultar la distribución oficial compatible; un export o viewport móvil no prueba
SecureStore/cámara/GPS ni funcionamiento nativo. SDK 54/iOS15.1+ diverge de RNF-047/iOS14.
No actualizar SDK automáticamente por esta diferencia.

1. PC y teléfono en red alcanzable; determinar IP real y NAT/puente si hay VM.
2. EXPO_PUBLIC_API_URL=http://IP_ACCESIBLE:3000/api/v1 en desarrollo sintético.
3. Para web LAN añadir su origen8081 exacto a CORS_ORIGINS; reiniciar API y Expo.
4. Abrir health desde el teléfono antes de escanear QR Metro; no es QR institucional.
5. Ensayar acceso permitido/denegado, persistencia, logout y flujos del incremento.

Usar mismo hostname para web y API por SameSite Strict. localhost en teléfono es el
propio teléfono. Túnel Metro no expone la API local. HTTP LAN es excepción de pruebas
con datos sintéticos, nunca receta de producción ni autorización para PII real.

## Verificación y problemas

Preparar test con db:test:setup. Ejecutar npm test y luego test:e2e secuencialmente;
Playwright arranca API3100/Expo8082 y sólo TEST_DATABASE_URL. No reutilizar servidores
de desarrollo ni alterar CORS para permitir un bundle con URL incorrecta. Scripts de
inicio limpian caché Metro; inspeccionar procesos propios antes de reiniciar.

-401: sesión ausente, expirada o revocada.403: elegibilidad u origen/cabecera no válidos.
-409: conflicto real de estado, duplicidad o plazas; reconsultar el recurso.
-503/proveedor: informar bloqueo; no reemplazar con éxito o datos inventados.
-P1001/health503: revisar URL, puerto y servicio autorizado, sin mutar otras bases.

Comandos y escenarios en [TEST_PLAN](TEST_PLAN.md); resultados actuales en
[EVIDENCE](../demo/EVIDENCE.md) y PROGRESS. Revisar docs de cada incremento para rutas
retiradas; los endpoints administrativos y aprobaciones ordinarias no son API vigente.
