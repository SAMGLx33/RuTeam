# Transformación de RuTeam | revisión de entrega local

25 de noviembre de 2026, America/Bogota. Agente integrador Codex, responsable humano POR_ASIGNAR.
Rama `task/driver-defined-routes`, base real `5af65f2`. El SHA informado en el encargo
(`72a31d7`) es un antecesor. `feature` local y su referencia remota conocida estaban
en `690d486`. La intervención queda en el árbol de trabajo de la rama individual.

## Diagnóstico y tratamiento

| Gravedad | Hallazgo y causa                                                                                                                              | Cambio y verificación                                                                                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta     | La experiencia inicial dependía de selección de fixtures. Sesión de cuenta y acceso al producto eran inseparables.                            | Formulario de correo y contraseña propia, cuenta pendiente y guard separado. El login de fixture directo sólo responde en test aislado. HTTP y web cubren los distintos permisos.             |
| Alta     | La vista inicial mezclaba perfil con acciones de conductor aunque no se cumplieran las condiciones.                                           | Layout web y navegación móvil adaptativos. Nest expone preferencia, intención y capacidad efectiva por separado. Vehículo/propiedad/licencia vuelven a validarse al publicar.                 |
| Alta     | Inicio de viaje validaba propiedad y estado, pero omitía revalidar al conductor. Aceptar recogida podía añadir una parada con el viaje lleno. | `START` comprueba conductor y documentos, y aceptar recogida exige plaza disponible sin reservarla. Finalizar/cancelar conserva las reglas y la trazabilidad.                                 |
| Alta     | Un token de correo no debía conservar una contraseña elegida por otra persona durante el registro.                                            | Confirmar buzón exige elegir contraseña, consume enlace una vez y revoca sesiones/enlaces anteriores. Recuperar comparte la garantía transaccional.                                           |
| Media    | Búsqueda sólo por filtros explícitos, sin preferencias privadas ni señal de coincidencia directa/potencial.                                   | Feed paginado recalculado, punto autorizado separado de propuesta y listado general disponible sin preferencias. Las tarjetas resumen los extremos externos para evitar direcciones precisas. |
| Media    | Sin avisos persistentes; perder una emisión en memoria o reintentarlo podía provocar pérdida o duplicación.                                   | Cola transaccional PostgreSQL, lease y cursor, unicidad destinatario/viaje/tipo. Publicación, retiro y nueva recogida pueden encolar. La disponibilidad del aviso se revalida al leer.        |
| Media    | Un formulario podía interpretar la versión previa de cupos como autorización.                                                                 | El detalle recibe las acciones vigentes desde Nest; la confirmación conserva bloqueos e idempotencia. La interfaz refresca cupos tras éxito o conflicto.                                      |

## Arquitectura y datos

- `auth` separa reglas de cuenta, sesión, contraseña, verificación y transporte SMTP.
  scrypt con N=32768, r=8, p=3, sal de 16 bytes y salida de 64 bytes, sin nueva dependencia.
  Enlaces de 32 bytes aleatorios con HMAC por propósito; 30 minutos para buzón y 15 para recuperación.
- `mobility` contiene controladores delgados, aplicación, políticas de coincidencia y repositorio
  Prisma. Feed usa preferencias del actor y candidatos por estado/fecha/sentido. Worker aplica
  prefiltrado por campus/horario/tipo/vigencia, recupera leases y deduplica en PostgreSQL.
- `trips` y `reservations` conservan las transacciones, geometría y estados originales.
  Bloquean en orden conductor → viaje y añaden la cola en la transacción que cambia el viaje.
- `20261125140000_product_accounts_and_mobility` añade estado de cuenta, tipo REVOKED,
  `AccountToken`, `MobilityPreference`, `RecommendationJob` y `TripNotification`, claves,
  índices y restricciones. Las nueve migraciones anteriores permanecen como antecedente.
- Web y móvil comparten Expo Router, formularios y cliente HTTP. Cookies HttpOnly/SameSite
  Strict en web y almacén seguro nativo. Contratos en `packages/contracts/src/accounts.ts`
  y `mobility.ts`. Consultar [API](../development/API.md).

## Integraciones y límites

- Fuente institucional de vigencia, carné y QR institucional y proveedor oficial de verificación
  de documentos siguen bloqueados. Control de correo y membresía siguen separados.
- El entorno efectivo carece de SMTP de servicio, motor vial y teselas. El usuario puede
  crear cuenta pendiente, iniciar sesión y consultar el estado. Los escenarios integrados
  usan transporte de test y mapas con respuestas sintéticas cuando corresponde.
- El matching usa hora de salida en Colombia y la geometría persistida. Falta ETA por parada,
  geocodificador provisionado y un identificador por sede en el catálogo vigente. La preferencia
  de zona sólo textual se guarda y no produce una afirmación geográfica. No hay asignación
  automática de plazas.
- Avisos internos en PostgreSQL con consulta periódica. Push, Socket.IO, correo de viaje e
  infraestructura de producción quedan pendientes. Se conserva el backlog de chat, calificaciones,
  grupos con consentimiento, compensación, QR interno, seguimiento y SOS.
- La ventana de abordaje permanece en 30 minutos previos hasta el final estimado. Falta acuerdo
  sobre sincronización de inicio con recogidas intermedias. La intervención conserva la regla
  existente de inicio según estado y valida conductor, sin imponer una política de horario nueva.
- Exports y viewport móvil acreditan compilación y diseño responsive. Prueba Expo Go en
  dispositivo físico, verificaciones externas, revisión humana y promoción siguen pendientes.

Fuentes públicas cotejadas el 25/11/2026. [Registro y Control Académico USC](https://www.usc.edu.co/registro-y-control-academico/), [servicio de correo USC](https://www.usc.edu.co/gestion-tecnologica/servicios/) y [parámetros scrypt OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Recorridos y resultados observados

| Recorrido                 | Evidencia                                                                                                                                                                                                                                                     | Límite                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A. Incorporación pasajera | Chromium registró cuentas nuevas en escritorio y tamaño móvil: 202, fila pendiente, login y feed 403. Playwright retomó onboarding de una cuenta de prueba elegible tras recarga. HTTP consumió enlace de correo real de la app usando transporte controlado. | Acreditación institucional y entrega a buzón remoto pendientes.                                               |
| B. Conducción             | Playwright guardó un vehículo, publicó con dos paradas y verificó el viaje en el listado tras recarga. La capacidad de publicación del conductor de pruebas y el acceso del pasajero al feed se observaron por separado.                                      | No se realizó verificación documental oficial.                                                                |
| C. Matching automático    | Playwright observó tarjeta sin búsqueda, aviso persistente único, apertura de detalle, confirmación y cambio de 1 a 0 plazas. Se retiró la participación y PostgreSQL reflejó liberación e historial.                                                         | La cartografía y alternativa vial son controladas; feed, aviso, autorización y plazas usan Nest y PostgreSQL. |
| D. Incompatibilidad       | Jest cubre sentido/horario, viaje incompatible, preferencia inactiva e inexistencia de coincidencia geográfica. La regresión web comprueba que una preferencia editada quite una publicación de Para ti y la conserve en Todos.                               | El catálogo local representa USC como una institución, sin separar sedes.                                     |
| E. Inactivo/pendiente     | HTTP 403 para ambos estados en rutas de viajes. Chromium redirigió acceso directo a verificación, sin opciones de publicación.                                                                                                                                | Identidades institucionales sintéticas controladas por test.                                                  |
| F. Cambio de capacidad    | Jest cubre preferencia sin autorización y licencia vencida manteniendo pasajero y renovación, y bloquea publicación y datos protegidos tras baja.                                                                                                             | Cambio completo en un mismo dispositivo pendiente de demostración manual.                                     |
| G. Ciclo                  | HTTP real valida última plaza, replay, retiro, propuesta y aceptación, abordaje, inicio, finalización, cancelación e historial.                                                                                                                               | Calificaciones y ciclo completo con reloj en navegador quedan pendientes.                                     |

## Comprobaciones reproducibles

`npm run check:env` imprimió Node v22.22.3, Linux x64, Git 2.53.0 y psql 18.6.
`npm run db:generate` generó Prisma Client 7.10.1. `npm run db:migrate` y
`npm run db:test:setup` finalizaron con diez migraciones. Se verificaron los 10/10
checksums de cada base en PostgreSQL 18.6, `ruteam` y `ruteam_test`, puerto 55432.
El seed fue repetido en ambas, con credencial explícita sólo para pruebas en esta sesión.

- `npm test` ejecuta Jest y Supertest en `ruteam_test`. Conflictos de publicación
  simultánea y último cupo mantienen la pareja 201/409. El SMTP se comprobó contra
  un socket loopback controlado y no envió correos a la USC.
- `npm run test:e2e` usa Chromium, API3100, Expo8082 y PostgreSQL de pruebas.
  Se usó Playwright porque la sesión no ofrece Browser plugin. `npm run smoke` contra
  la misma base aislada observó seis verificaciones, incluidas sesión y revocación.
- `npm run build:api`, `npm run build:web` y la exportación Expo Android/iOS comprueban
  artefactos. `npx expo-doctor frontend` devolvió 18/18. No se aplicó ninguna actualización.
- `npm audit --json` devolvió código 1 con 42 entradas, 34 moderadas y 8 altas, sin
  críticas. Incluye dependencias directas Prisma/Expo Router y transitivas. El lockfile
  conserva el mismo contenido. Revisar alcance y actualización compatible en otro corte.

## Evidencia visual y fallos corregidos

Se revisaron capturas en escritorio y tamaño iPhone web, incluidas pantallas públicas,
verificación, onboarding, inicio de ambos contextos, feed, detalle, formularios, avisos,
vehículos, viajes propios, historial y perfil. La revisión encontró y corrigió el estado
ARIA de la pestaña activa y una categoría de licencia sin traducir. También se corrigió
un dominio histórico de fixture y se ajustaron los datos de prueba para diferenciar un
campus de una plaza del catálogo. La primera suite Jest falló en cinco dobles de prueba
que omitían campos agregados; se ajustaron al contrato y se preservaron los casos.

Evidencias locales fuera de Git en
`/home/darik/RuTeam/.local-data/product-transformation-2026-11-25/`.
Construcciones, capturas y ejecuciones locales no equivalen a CI remoto.

## Resultado final

| Comando o verificación                                                          | Resultado                                                        | Entorno                                                              |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run check:env`, `npm run db:generate`                                      | Aprobados                                                        | Node 22.22.3, Prisma 7.10.1                                          |
| `npm run db:migrate`, `npm run db:seed`, `npm run db:test:setup`                | Aprobados, 10/10 migraciones y checksums por base, seed repetido | PostgreSQL persistente 18.6, 55432                                   |
| `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check` | Aprobados                                                        | Tres workspaces, pruebas TypeScript y formato                        |
| `npm test`                                                                      | 161/161, 17 suites, salida 0                                     | Jest y Supertest, `ruteam_test`, SMTP loopback                       |
| `npm run test:e2e`                                                              | 4/4, salida 0                                                    | Chromium escritorio y tamaño móvil, API3100, Expo8082, `ruteam_test` |
| `npm run smoke`                                                                 | 6/6, salida 0                                                    | API3100, `ruteam_test`, credenciales aisladas                        |
| Registro pendiente adicional                                                    | 2/2, salida 0                                                    | Registro real desde Chromium, PostgreSQL, URL directa y feed403      |
| `npm run build:api`, `npm run build:web`                                        | Aprobados                                                        | Nest y Expo SDK54                                                    |
| `npm exec -w @ruteam/client -- expo export --platform android --platform ios`   | Aprobado para ambos bundles                                      | Metro, Android/iOS                                                   |
| `npx expo-doctor frontend`                                                      | 18/18                                                            | Expo SDK54                                                           |
| `npm audit --json`                                                              | Salida 1, 34 moderadas, 8 altas                                  | Dependencias existentes                                              |
| Matrícula real, correo externo y Expo Go                                        | Pendientes por integración o dispositivo                         | Pruebas externas no ejecutadas                                       |

Se conservaron 42 capturas de pantalla y mapa con datos sintéticos. El
[inventario](evidence/2026-11-25-transformation/changes.json) enumera 61 archivos modificados,
52 nuevos y ninguno eliminado. El índice se verificó vacío. Los comandos completos y
el resultado de la auditoría están en el directorio local de evidencia indicado arriba.

Para promover el corte, la persona integradora debe revisar migración, guards de elegibilidad,
reglas de viaje y resultados con el equipo. Los cambios siguen locales a la rama individual.
