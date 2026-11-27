# RuTeam · Consolidación funcional

26/11/2026, America/Bogota. Agente Codex. Personas responsables POR_ASIGNAR.
Rama `task/driver-defined-routes` y HEAD
`5af65f2d1c11f3b6091af21605a3eab21a50e163`. `feature` local y remoto
`690d486`, antecesor del HEAD. La comprobación remota se hizo con
`git ls-remote --heads origin feature task/driver-defined-routes`. No se
observó una punta nueva respecto de las referencias locales comprobadas.

## Punto de control

El laboratorio `/home/darik/RuTeam/.local-data/consolidacion-2026-11-26/`
conserva copia, `base-manifest.json` con 554 archivos, 22 enlaces registrados
aparte, `punto-de-control.patch` para rastreados y nuevos e inventarios contra
`feature` y el corte inicial. La línea base repitió **184 Jest en 23 suites
y 4 Playwright**. Los 13 checksums iniciales coincidieron en `ruteam` y
`ruteam_test`. `.env`, originales, respaldos y capturas nuevas permanecen
fuera del incremento Git. `inventario-consolidacion.txt` enumera cada archivo
nuevo o modificado respecto al corte inicial.

Se leyó la ERS privada mediante la tabla de piezas de Word (98 piezas), la
rúbrica mediante `pdftotext` y el UML de 36 pestañas (1.870 celdas). RF-010
conserva el antecedente literal y el encargo corrige escala y fórmula.
El derivado UML privado `RuTeam_consolidacion_review.drawio` incorporó cuatro
pestañas nuevas y se comprobó como XML. Los tres originales conservaron sus
hashes. Revisión visual del derivado pendiente.

## Estado por frente

| Frente      | Entrega                                                                                                                  | Límite                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| RF-010      | Calificación 1–5 por par conductor y pasajero abordado; media aritmética por capacidad, pendientes y comentarios propios | Visibilidad de comentarios a terceros y sanciones requieren decisión independiente                                          |
| Grupos      | Código opaco, vista previa, consentimiento y confirmación atómica con reservas individuales. Integrado con chat y avisos | Cualquier cancelación colectiva requiere una política distinta del retiro individual                                        |
| Abordaje    | Pase QR opaco de dos minutos, una vez, ligado al tramo y titular. Comparte política con registro manual                  | Cámara nativa pendiente de teléfono. La web muestra el pase y conserva el abordaje manual                                   |
| Seguridad   | Contexto de viaje activo, selector del sistema y confirmación para abrir una llamada                                     | Canal y retención de incidencias pendientes. El ensayo controló las integraciones del dispositivo                           |
| Ubicación   | Última muestra voluntaria para participantes autorizados, intervalo mínimo de 15 s, caducidad de dos minutos             | GPS web controlado. Teléfono y red del anfitrión pendientes. Primer plano                                                   |
| RF-008/009  | Estimación privada exacta de combustible, peajes y estacionamiento en COP                                                | Distribución definitiva y confirmación de compensaciones pendientes de política                                             |
| Cartografía | Adaptadores Photon/OSRM y degradación conservados. Catálogo distingue sede y encuentro                                   | Ruta pública del corte anterior usó una entrada de prueba. Embarque certificado y operador sostenido requieren autorización |
| PostgreSQL  | Restauración del respaldo histórico en base nueva. Relaciones, 81 filas, 22 tablas y diez checksums                      | Ese respaldo carecía de viajes y reservas                                                                                   |

[Restauración](POSTGRESQL_RESTORE_DRILL.md) ·
[Guía Expo Go](../development/MOBILE_TESTING.md) ·
[Costos y alternativas](../development/COMPENSACIONES_COP.md) ·
[Ensayo externo anterior de cartografía](PRODUCT_CONTINUITY.md).

## Datos y arquitectura

| Migración aditiva                       | Cambio                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `20261126010000_trip_ratings`           | Calificación por par y viaje, capacidad, estrellas. Amplía tipos de aviso |
| `20261126013000_trip_groups`            | Grupo, miembro, código, consentimiento y vínculo a reservas individuales  |
| `20261126014000_boarding_qr`            | Hash del pase, recogida, caducidad y consumo                              |
| `20261126014000_trip_driver_position`   | Una ubicación por viaje y eliminación al cerrarlo                         |
| `20261126020000_trip_expense_estimates` | Tres importes COP privados con FK y límites                               |

Los controllers delegan y los DTOs limitan entradas. La aplicación Nest
autoriza sesión, recurso, elegibilidad, paradas, calificación y plazas.
Los repositorios comparten el orden conductor → viaje para confirmar, cerrar,
calificar, canjear QR y publicar posición. Ratings agrega por lote y Expo
mantiene una app y contratos compartidos. No se introdujeron dependencias
mutuas de Nest. [Arquitectura](../architecture/OVERVIEW.md) ·
[API](../development/API.md) · [Trazabilidad](../requirements/TRACEABILITY.md).

Chat conserva sesión y participación para leer o escribir. Retiro, ausencia y
cancelación revocan acceso. Tras finalizar, propietario y pasajeros que
abordaron leen durante 24 horas. El orden usa fecha e ID, el reenvío un UUID
por conversación y autor, y el recibo sólo avanza. La purga existente se
dirige a viajes cancelados o terminados hace más de 24 horas en lotes de 500.
Los criterios institucionales de conservación y soporte siguen abiertos.

| Evento evaluado                                                | Canal actual                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Coincidencia y mensaje                                         | Bandeja persistente con deduplicación y lectura                                |
| Confirmación grupal y calificación                             | Aviso persistente en la transacción de confirmación o cierre                   |
| Confirmación directa y retiro propio                           | Respuesta, plazas e historial del actor                                        |
| Propuestas, resolución, cancelación, inicio y próxima recogida | Estado en la interfaz correspondiente. Aviso separado pendiente                |
| Invitación y compensación                                      | Código se comparte a elección del organizador. La compensación espera política |

## Verificación de la sesión

Node 22.22.3, npm 12.2.2, PostgreSQL 18.6 y Expo SDK 54. Suites que comparten
base ejecutadas secuencialmente en `ruteam_consolidation_test`. Browser plugin
ausente. Se usó Playwright en Chromium escritorio y móvil web. Los
`final-*.log`, el directorio `evidence/` y los respaldos quedan en el laboratorio.

| Comando                                                                         | Resultado                                                                                                                                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check:env`, `npm run db:generate`                                      | Aprobados. Node 22.22.3, Git 2.53.0, psql 18.6 y cliente Prisma 7.10.1 regenerado                                                                               |
| `npm run db:test:setup`                                                         | Aprobado con bases de consolidación aislada y estándar. Migraciones aditivas y seed de fixtures                                                                 |
| `npm run db:migrate`, checksums                                                 | Aprobados. 18/18 coinciden en desarrollo, pruebas estándar y consolidación. Respaldo previo de 79.385 bytes, 165 entradas y permiso 600 leído con pg_restore -l |
| `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check` | Aprobados                                                                                                                                                       |
| `npm test`                                                                      | Aprobado. 199/199, 31 suites, tanto en la base aislada como en la base estándar sin configuración adicional de fixtures                                         |
| `npm run test:e2e`                                                              | Aprobado. 10/10 en Chromium de escritorio y móvil web, con la exportación real de Expo, Nest y PostgreSQL de prueba                                             |
| `npm run smoke`, persistencia tras reiniciar Nest                               | Aprobados. 6/6. La sesión, el aviso RF-010 y su marca de lectura persistieron tras reiniciar el proceso                                                         |
| Mailpit local                                                                   | Aprobado con SMTP Mailpit real en loopback y BD de correo aislada. Se comprobó registro, confirmación, recuperación de uso único y revocación                   |
| `npm run build:api`, `npm run build:web`, Expo export Android/iOS               | Aprobados. Backend y exportaciones de web, Android e iOS                                                                                                        |
| `npx expo-doctor frontend`                                                      | Aprobado. 18/18 chequeos                                                                                                                                        |
| `npm audit --json`, `npm audit --omit=dev --json`                               | Ambos código 1. 42/20 entradas y ocho altas en ambos alcances                                                                                                   |
| Expo Go físico                                                                  | Bloqueado. Hace falta un teléfono compatible y confirmar el acceso al anfitrión VirtualBox                                                                      |

La regresión cubre acceso y preferencias, publicación, coincidencias y avisos,
confirmación y chat. Los recorridos de calificación continúan por abordaje,
inicio/cierre, calificación, promedio y recarga. Consentimiento y plazas
individuales se ejercitan en el recorrido grupal. La prueba física de cámara
y GPS es independiente de exportaciones y geolocalización de navegador
controlada. RF-010 también pasó 2/2 directamente en la base estándar con
los fixtures por defecto. La acreditación USC oficial sigue pendiente. [Auditoría de dependencias](PRODUCT_CONSOLIDATION_DEPENDENCIES.md).

Tras reanudar, PostgreSQL estaba detenido. Se verificó el clúster persistente
y se inició en loopback 55432. Se corrigieron el export de la vista cartográfica,
el literal de tipo Swagger y el stub web de cámara. Las respuestas 503 del
proveedor son controladas por las pruebas. Queda registrada la advertencia
de deprecación de `pg`. Las tres dependencias nuevas conservan las resoluciones
previas del lockfile.
La ejecución en Metro mostró presión de memoria y tiempos de espera.
El servidor web de Playwright usa la exportación Expo en loopback. En esa
variante la primera pasada alcanzó el límite real de login compartido.
Playwright espera el encabezado `Retry-After` en los logins de fixtures y
vuelve a intentar una vez, con el límite de Nest activo.
La caché temporal de Chromium estaba ausente tras reanudar;
se instaló el binario del lockfile en el laboratorio. La primera consulta a
Mailpit coincidió con su inicio; la repetición esperó respuesta HTTP válida.

## Integración propuesta

Usar `task/* → feature → dev → main` con revisión humana. Los archivos
compartidos se revisan por contenido y se validan respetando dependencias.
El manifiesto separa el corte original de este incremento. El índice quedó vacío.

| Corte                                        | Mensaje candidato                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Transformación anterior, cuentas y movilidad | `feat(accounts): add student self-service and mobility recommendations` |
| Cartografía anterior y estimaciones          | `feat(maps): add campus selection and verified route estimates`         |
| Ciclo de vida anterior                       | `feat(trips): add ordered stops and manual boarding`                    |
| Chat anterior y avisos                       | `feat(chat): add trip conversations and message notices`                |
| Reputación y aviso de calificación           | `feat(ratings): add capacity-based trip reputation`                     |
| Participaciones y consentimiento             | `feat(groups): confirm consented participation atomically`              |
| QR, ubicación y seguridad                    | `feat(safety): add trip boarding passes and active-trip sharing`        |
| Estimación privada y recuperación            | `feat(expenses): keep private COP trip estimates`                       |

QA debe verificar cámara, ubicación y SecureStore desde teléfono y LAN.
Producto decide el reparto y el canal de incidentes. Integración revisa alertas
y decide cuándo promover. RF-010 ya incorpora la decisión. [Handoff consolidado](../handoffs/2026-11-26_driver-defined-routes_consolidacion-funcional.md).
