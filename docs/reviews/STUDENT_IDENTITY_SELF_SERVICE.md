# Identidad estudiantil y autogestión documental

Corte del 25 de noviembre de 2026, rama `task/driver-defined-routes`, base
`72a31d7`. Incremento de RN-IDENTIDAD-01/02 y RN-VEHICULO-01 coordinado con viajes
y participaciones. La validación integrada y las ejecuciones PostgreSQL corresponden
al ejecutor central; este informe no acredita integración ni autorización Git.

## Identidad y sesión

Una cuenta corresponde a un estudiante vigente; pasajero y conductor son capacidades
compatibles. `CurrentUser` ya no contiene `role`. La capacidad de conductor requiere
licencia vigente y al menos un vehículo propio con documentación vigente y categoría
compatible. Nest mantiene la autoridad para cada publicación y participación.

`isActiveMembership(membership, now)` conserva su firma de dos argumentos y exige
`ACTIVE`, grupo `STUDENT` y vigencia estrictamente posterior a `now`. Los guards
comprueban sesión no expirada/no revocada, cuenta no deshabilitada, condición estudiantil
y proveedor en cada solicitud protegida. Un usuario dado de baja puede revocar su
sesión, sin acceder a datos protegidos. Las cuentas deshabilitadas por la migración
tienen sus sesiones revocadas.

El token aleatorio sigue guardándose sólo como SHA-256; web usa cookie HttpOnly,
SameSite=Strict y Secure en producción; móvil usa SecureStore. Se conservan CORS,
cabecera de mutación/validación de Origin, whitelist estricta y throttling existente.
GET `/auth/me` y GET `/me` responden `Cache-Control: no-store`.

## Fuente legítima y configuración

GET `/api/v1/auth/access` es público y responde:

```json
{
  "institutionalAuthentication": "UNAVAILABLE",
  "studentEligibilityVerification": "UNAVAILABLE",
  "reason": "Falta acceso a una fuente institucional autorizada de autenticación y matrícula vigente. El correo o carné por sí solos no acreditan elegibilidad.",
  "fixturesAvailable": false
}
```

No inicia sesiones ni valida correos, carnés o QR. La interfaz normal explica ese
bloqueo. Sólo cuando el servidor declara `DEMO_MODE=true`, proveedor `demo` y entorno
no productivo, ofrece **Abrir acceso de desarrollo**. El selector de identidades no
aparece hasta esa acción explícita. El login sintético permanece en
POST `/api/v1/auth/demo/login` y acepta `ana`, `diego`, `laura`, `sara`; `admin`
se rechaza como entrada inválida. No existe login institucional ficticio ni se
almacenan contraseñas de la USC.

`.env.example` ahora usa `DEMO_MODE=false` y `VERIFICATION_PROVIDER=official` por
defecto. Para fixtures de desarrollo/pruebas se requieren overrides expresos. El
`.env` real no fue modificado. En producción se prohíbe el modo sintético; el
proveedor oficial conserva su respuesta de indisponibilidad y falla cerrado.

Consulta pública limitada del 25 de noviembre: la USC documenta correo para
estudiantes, docentes y egresados en su [catálogo de servicios](https://www.usc.edu.co/gestion-tecnologica/servicios/).
El [catálogo de Gestión Tecnológica](https://www.usc.edu.co/wp-content/uploads/2024/02/Catalogo-de-servicios-gestion-tecnologica.pdf)
menciona Office365/SIPAC. Esto no constituye autorización para integrar RuTeam.
No se localizó en la consulta pública dirigida un contrato OAuth/OIDC/SAML ni una
API académica autorizada para esta aplicación; no se afirma que la institución
carezca de ellos. Se requiere obtener del responsable institucional emisor/tenant,
registro de aplicación, protocolo, claves públicas y una fuente de estamento y
matrícula con política de actualización/revocación. Verificar control del correo
es una comprobación distinta y no sustituye esas evidencias. No hubo scraping ni
consulta de sistemas privados.

## Autogestión de vehículos

| Método y ruta bajo `/api/v1` | Entrada                                                                              | Resultado                                                |
| ---------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| GET `/vehicles/catalog`      | Sesión                                                                               | Catálogos de formato existentes                          |
| GET `/vehicles`              | Sesión                                                                               | Sólo vehículos propios                                   |
| POST `/vehicles`             | `plate`, `type`, `passengerCapacity`, `brand`, `modelYear`, `color`, `soatExpiresAt` | 201, vehículo del actor con declaración documental       |
| PATCH `/vehicles/:id/soat`   | `soatExpiresAt`                                                                      | 200, renueva sólo vehículo propio; 404 ajeno/inexistente |
| GET `/driver-eligibility`    | Sesión                                                                               | Declaración de licencia propia o null                    |
| POST `/driver-eligibility`   | `category`, `expiresAt`                                                              | 201, nueva revisión de declaración propia                |

No se reciben ownerId, permisos, estado de revisión, proveedor ni verificación del
cliente. Marca, placa, año, capacidad y vigencias se validan en servidor; se mantienen
auto≤4/moto≤1 pasajeros. La creación y las renovaciones usan el lock del conductor,
compatible con publicaciones/reservas. SOAT y licencia deben durar hasta el final
del viaje. Las fechas nuevas no reutilizan silenciosamente una aprobación anterior.

Los contratos de licencia/vehículo publican `verificationSource` y
`verificationStatus`, sin `reviewStatus` administrativo:

- `SELF_DECLARED`: dato aportado por el actor; no prueba consulta USC/RUNT.
- `AUTHORIZED_SOURCE`: reservado para una integración legítima, todavía no disponible;
  ninguna ruta pública puede asignarlo.
- `LEGACY_REVIEW`: revisión interna histórica, sin autoridad para habilitar documentos.
- `DECLARED`: declaración sintética vigente, habilitada exclusivamente para fixtures.
- `VERIFIED`: fuente autorizada, revisión aprobada y vigencia; no se obtiene registrando
  un formulario ni mediante la antigua aprobación administrativa.
- `EXPIRED`: fecha vencida o inválida; `UNVERIFIED`: sin evidencia habilitante.

`VehiculoPolicy.esPublicable(document, through)` conserva su firma. Acepta documentos
vigentes de fuente autorizada, o declaraciones `SELF_DECLARED` con `demo=true` para
desarrollo. `demo=false` con declaración propia no es publicable, aunque un estado
histórico diga APPROVED. La autenticación real permanece cerrada sin integración.

La UI permite declarar licencia, registrar vehículo y renovar SOAT, presenta la
procedencia/vigencia y no rellena marca/año/fechas ficticias. No acredita propiedad
registral, recepción de un archivo ni verificación externa: el vehículo pertenece
al actor en RuTeam y el uso autorizado se declara. No se implementaron uploads ni
un conector RUNT.

## Migración e historia

`20261125010000_student_identity_self_service` retira UserRole/role y
driverDemoApproved, añade disabledAt, vuelve nullable la clave sintética y revoca
sesiones ADMIN/no-estudiantes. Libera sólo sus claves de fixture; conserva IDs,
correos, estamentos, vehículos, viajes, participaciones y FKs de revisores.
No transforma docentes, trabajadores o administradores en estudiantes. Los campos
reviewedBy/reviewedAt y los estados antiguos se conservan como procedencia histórica,
sin endpoints o permisos para revisarlos. Las declaraciones nuevas incrementan
revisión y establecen otra procedencia, sin borrar los revisores anteriores.

Seed idempotente exclusivo de fixtures: Ana, Diego y Sara activos, Laura inactiva.
Diego nuevo usa correo `diego@student-fixtures.ruteam.invalid` y vehículo `STU123`.
El Diego docente antiguo y DEM123, si existían, conservan sus IDs/relaciones y
permanecen deshabilitados/no publicables; no se reutiliza su correo histórico.
Los datos del entorno se preservan, sin reset ni borrado masivo.

Se retiraron las rutas `/admin/demo/document-reviews`,
`/admin/demo/vehicles/:id/review`, `/admin/demo/driver-eligibility/:id/review`,
la pantalla `/document-reviews`, sus menús y los placeholders del módulo administration.
Las rutas retiradas responden 404.

## Verificación del incremento

Antes de modificar políticas, las pruebas nuevas mostraron ocho fallos esperados:
admisión indebida de no-estudiantes y dependencia de aprobación administrativa.
Se añadieron pruebas puras de fuentes documentales, expiración, cuentas deshabilitadas,
capacidad compatible y producción cerrada. Las suites HTTP cubren 404 administrativos,
renovación propia de SOAT, prohibición de autoasignar fuente, revocación por cambio
de estamento y rechazo de documento no sintético no verificado. Las pruebas web
usan opt-in explícito y eliminan la aprobación administrativa.

ESLint de los archivos propios pasó; formato de esos archivos aplicado. El ejecutor
central serializa build, generación y suites PostgreSQL; consultar el informe integrado
para sus resultados finales. No se ejecutaron suites DB desde este frente ni se
modificó ninguna migración después del aviso de su aplicación.
