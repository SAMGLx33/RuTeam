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

La plantilla usa `DEMO_MODE=false` y `INSTITUTIONAL_ACCESS_MODE=DECLARED_DOMAIN`.
Registro, sesión e incorporación funcionan sin SMTP. `OFFICIAL` exige la fuente de
acreditación. El entorno productivo requiere modo oficial.

Para pruebas locales autorizadas, usa `NODE_ENV=development`, `DEMO_MODE=true` y
`VERIFICATION_PROVIDER=demo` en el entorno de los comandos. Define
`AUTH_FIXTURE_PASSWORD` con 12–128 caracteres antes del seed para habilitar el login
normal de fixtures existentes. La misma variable alimenta Playwright y smoke al correr
sobre la base aislada si se elige una contraseña diferente a la de la suite. En el
formulario usa el correo `ana@student-fixtures.ruteam.invalid` para pasajera,
`diego@student-fixtures.ruteam.invalid` para conductor y
`laura@student-fixtures.ruteam.invalid` para cuenta sin permiso de viajes.
La ruta legacy `/auth/demo/login` sólo existe operativamente con `NODE_ENV=test`.

Para habilitar OTP por consola en el modo académico, ejecuta en la terminal del
backend, desde la raíz y con PostgreSQL local operativo:

```bash
npm run db:migrate
export NODE_ENV=development INSTITUTIONAL_ACCESS_MODE=DECLARED_DOMAIN
export RECOVERY_OTP_TRANSPORT=console
export RECOVERY_OTP_SECRET="$(node -p 'require("node:crypto").randomBytes(32).toString("hex")')"
npm run dev:api
```

Usa un secreto estable mientras haya códigos activos. Guarda el secreto sólo
en el entorno local del backend. Busca `[RUTEAM OTP - DEVELOPMENT]` en esa
terminal y toma el código del propósito indicado, `CONTACT_CONFIRMATION` o
`PASSWORD_RESET`. El transporte está deshabilitado en producción y en modo
`OFFICIAL`. La confirmación por consola no comprueba titularidad por correo o
SMS. El registro académico inicia sesión y abre la confirmación de inmediato.
Si se omite, el contacto queda pendiente y la recuperación permanece inactiva.
En la terminal, `Resultado: ISSUED` incluye un código y
`Resultado: SKIPPED` indica el motivo interno sin datos de la cuenta. Conserva
el mismo secreto OTP al reiniciar el servidor. Las cuentas anteriores pueden configurar su medio en Perfil → Cuenta y
privacidad utilizando su contraseña actual.

Para enviar enlaces de confirmación y recuperación, configurar en backend `AUTH_TOKEN_SECRET`
(aleatorio, mínimo 32 caracteres), `AUTH_PUBLIC_URL` (HTTPS o HTTP loopback fuera de
producción), `SMTP_HOST`, `MAIL_FROM` y, cuando corresponda, `SMTP_USER` con
`SMTP_PASSWORD`. `SMTP_SECURE=true` por defecto, puerto implícito 465.
SMTP sin TLS sólo se admite en loopback y fuera de producción, puerto 25 por defecto.
En desarrollo, un capturador SMTP local permite verificar la entrega sin contactar
direcciones reales. Mantén estos valores fuera de Expo y del historial de Git.

El seed es sintético e idempotente para desarrollo/test. No cuentas ADMIN ni docentes o
trabajadores como estudiantes válidos. Conservar registros antiguos de auditoría y
reservas sin elevar permisos ni confirmar pendientes durante la migración. Comprobar
las migraciones nuevas del incremento en API/PROGRESS antes de usarlas en otra base.

Producción necesita un transporte de correo operativo, fuente autorizada de estamento/vigencia,
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

## Proveedores para continuidad operativa

- **Correo local**. [Correo local con Mailpit](MAILPIT.md) documenta las variables,
  los puertos de loopback y el smoke que registra, verifica y recupera una cuenta.
  Un relay real requiere autorización, remitente y TLS. La verificación estudiantil
  requiere su propia fuente institucional.
- **Geocodificación**. `GEOCODING_BASE_URL` apunta a una instancia compatible
  con Photon. Si se omite, buscar lugares informa indisponibilidad y conserva texto
  o selección de mapa. La búsqueda se ejecuta al enviar el formulario. Las zonas
  textuales sin marcador quedan guardadas sin coincidencia geográfica.
- **Rutas**. `ROUTING_BASE_URL` apunta a OSRM con perfil de automóvil y datos del
  área. `ROUTING_SELECTION_SECRET` es opcional, de 32 caracteres o más y sólo para
  Nest. Si se omite, una clave de proceso protege las alternativas hasta reinicio.
  En varias instancias configura la misma clave en todas. Las selecciones caducan
  a los 30 minutos.
- **Teselas**. `EXPO_PUBLIC_ROUTE_TILE_URL` y `EXPO_PUBLIC_ROUTE_TILE_ATTRIBUTION`
  son públicas y sirven a la misma aplicación Expo. El hosting y la política de
  caché, atribución e identificación dependen del proveedor acordado.

Las consultas académicas puntuales usaron datos públicos de Cali. No configurar
un servicio comunitario como dependencia de producción sin acuerdo vigente.
[Nominatim público](https://operations.osmfoundation.org/policies/nominatim/),
[Photon](https://github.com/komoot/photon),
[política de teselas OSM](https://operations.osmfoundation.org/policies/tiles/) y
[OSRM FOSSGIS](https://routing.openstreetmap.de/about.html).

El catálogo tiene identidad de institución USC y referencia UUID de sede.
Las direcciones de Pampalinda, Centro y Palmira proceden de la USC. Antes de habilitar
una sede para publicar, el responsable de catálogo debe registrar una referencia
geográfica pública revisada y relacionar sus puntos habilitados. La ubicación
personalizada dentro de la sede sigue siendo un texto. Las filas institucionales
sin coordenadas se muestran como pendientes de configuración. No cargar coordenadas
de domicilios en el catálogo.

## Verificación local del corte de consolidación

Usa `npm run db:generate` después de instalar el lockfile. Desde raíz,
`npm run db:migrate` usa la base de desarrollo autorizada y
`npm run db:test:setup` prepara la base separada de pruebas. Conserva un respaldo
privado de desarrollo y el historial de migraciones. La preparación aislada y las suites comparten una contraseña sintética por
defecto. Para cambiarla, usa la misma variable de proceso en el seed aislado
y las suites. Ejecuta `npm test` y después
`npm run test:e2e` para evitar escrituras simultáneas en la misma base.

Cámara y ubicación sólo solicitan permiso al usarlas. `expo-camera` corresponde
al SDK 54 y el escáner está en la compilación nativa. La web conserva abordaje
manual. `expo-location` comparte una lectura voluntaria del conductor en
primer plano. En navegador, el permiso de ubicación requiere contexto seguro
como localhost en pruebas o HTTPS. La precisión final depende del dispositivo.
Para Android/iOS y NAT de VirtualBox, sigue la [prueba física](MOBILE_TESTING.md).

## Regresión del cierre

En una base `_test` aislada, exporta `DEMO_MODE=true`, `VERIFICATION_PROVIDER=demo`
y una `AUTH_FIXTURE_PASSWORD` exclusiva para las cuentas sintéticas antes de
`npm run db:test:setup`. Usa esa misma contraseña al ejecutar Playwright y smoke.
Las pruebas de Nest con autenticación de fixtures también reciben el proveedor
sintético mediante variables de proceso. No reutilices estas variables en
producción. La regresión integra 21 migraciones. Para Expo Go, confirma
dirección LAN del anfitrión y consulta [Mobile Testing](MOBILE_TESTING.md).

## Ejecución de la continuidad

`RECURRING_TRIP_HORIZON_DAYS` es opcional. Admite un entero 1–28 y su valor por defecto es 7. El horizonte incluye el día actual de Colombia. NestJS consulta recurrencias pendientes cada 15 segundos. En Jest el trabajador se inicia explícitamente por prueba.

Ejecuta `npm run db:generate` y aplica las migraciones con `npm run db:migrate` al entorno designado. Define una `TEST_DATABASE_URL` independiente con sufijo `_test` para `npm run db:test:setup`. Verifica el host y puerto configurados localmente antes de migrar. Las pruebas web usan Chromium con dispositivos de escritorio y vista móvil.

La bandeja trabaja con la API. El uso de push remoto con SDK 54 requiere development build y credenciales en Android e iOS. El permiso de ubicación se solicita al centrar el mapa o compartir en un viaje.

## Configuración de evolución

Aplica las migraciones aditivas ambientales, de SSE y preferencias con la configuración PostgreSQL designada. Para pruebas usa una base nueva `_test` y ejecuta regresión y exportaciones de manera secuencial. Los flujos en tiempo real usan la conexión existente a PostgreSQL y necesitan que el proxy respete SSE. `EXPO_PUSH_ENABLED` vale `false` por defecto y `EXPO_PUSH_ACCESS_TOKEN` es opcional para entornos configurados. Los archivos locales de entorno permanecen fuera de Git.

## Validación aislada de operación

Para probar el incremento usa `TEST_DATABASE_URL` en proceso con una base
propia cuyo nombre termine en `_test`. Ejecuta `npm run db:generate`,
`npm run db:test:setup`, `npm test` y `npm run test:e2e` en secuencia.
`TRIP_EXPIRATION_GRACE_MINUTES` admite 0 a 180 y predetermina 30.
Mantén `EXPO_PUSH_ENABLED=false` durante las pruebas locales. La guía de
[seguridad y notificaciones móviles](MOBILE_TESTING.md) contiene pasos
separados para Expo Go y para development build.

La cartografía se configura con `GEOCODING_BASE_URL`, `ROUTING_BASE_URL` y
`EXPO_PUBLIC_ROUTE_TILE_URL` con `EXPO_PUBLIC_ROUTE_TILE_ATTRIBUTION`. Usar
servicios autorizados. Definir `ROUTING_SELECTION_SECRET` en todas las réplicas
si se comparten alternativas firmadas. Consultar [mapas](MAP_EXPERIENCE.md).

### Referencia de publicación de Ciudadela Pampalinda

Ejecuta el siguiente comando desde la raíz del repositorio.

```bash
node --env-file=.env scripts/configure-pampalinda.mjs
```

El comando completa únicamente las coordenadas vacías de la fila activa
`USC-CALI-PAMPALINDA` y registra su fuente. Una segunda ejecución conserva
la referencia existente. La USC identifica la sede en Calle 5 # 62-00. La
ubicación pública aproximada de campus usada para el mapa es 3.403412,
−76.547719. El conductor describe por texto el encuentro interior.
[Dirección de la USC](https://www.usc.edu.co/preguntas-frecuentes/) ·
[Coordenada pública](https://www.wikidata.org/wiki/Q5575968).

Verifica la sede en `GET /campus/publication-point` con una sesión vigente.
El catálogo de `GET /campus/meeting-points` sigue disponible para las
funciones que usan varias sedes.

Para una base aislada ya migrada, usa el mismo comando con `--test`.
`npm run db:test:setup` lo aplica durante la preparación de la base de
pruebas. El entorno oficial sigue exigiendo su política de acreditación.
