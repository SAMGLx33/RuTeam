# Evolución funcional del 25 de noviembre de 2026

Estado local en `task/driver-defined-routes` desde `72a31d7`. El índice inició
vacío y el árbol limpio. Los refs locales y remotos observados coincidían en la
tarea. `feature` en `690d486` ya contenía la reestructuración de arquitectura.
`72a31d7` aún no era ancestro de `feature`. Responsable humano e integrador
POR_ASIGNAR.

## Implementación revisable

| Frente                   | Implementación                                                                                                                                                                                           | Evidencia                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Identidad y sesiones     | Sólo estudiante vigente. Una cuenta tiene capacidades compatibles. Proveedor sintético con selección explícita local. Respuestas de sesión no cacheables.                                                | auth.e2e, membership, student-auth-policy, auth.spec                           |
| Retiro de administración | Eliminación de rol activo, endpoints, pantallas, seed y directorios vacíos. Revocación de cuentas incompatibles con historial intacto.                                                                   | Migración student_identity_self_service, pruebas de acceso y 404               |
| Vehículo                 | Autogestión, renovación de SOAT propio, fuentes declaradas/legítimas separadas, licencia por tipo y vigencia hasta el fin del viaje.                                                                     | phase2.e2e y student-document-policy                                           |
| Publicación              | DESDE_USC o HACIA_USC a partir de extremo relacionado con catálogo. Desde USC se aborda en origen. Punto libre, referencia aproximada si es interior, mapa para externos, alternativas viales y resumen. | driver-route-policy, driver-routes.e2e, pickup-proposals.e2e, publication.spec |
| Descubrimiento           | Texto, sentido, catálogo, horario, disponibilidad y geometría cerca de un marcador. El punto de paso sirve para descubrir, sin habilitar participación allí.                                             | driver-routes.e2e y UI de búsqueda                                             |
| Participación            | Confirmación directa, listado del propietario, retiro, repetición idempotente y concurrencia bajo bloqueo PostgreSQL. Antiguas solicitudes conservadas en historial.                                     | participation-policy, driver-routes.e2e, publication.spec                      |
| Recogida propuesta       | Sólo hacia USC con geometría. El propietario decide y, si acepta, incorpora una recogida sin modificar geometría ni plazas.                                                                              | pickup-proposals.e2e                                                           |
| Abordaje y ciclo         | Presencia individual confirmada por conductor. Inicio, finalización y cancelación se serializan con cambios de ocupación.                                                                                | driver-routes.e2e                                                              |

Las operaciones públicas se detallan en [API](../development/API.md).
`Reservation` y `ReservationMember` conservan las relaciones. Se incorpora
`boardedAt` y una entidad `PickupProposal`. Los bloqueos de participación se
adquieren en orden conductor → viaje. La incorporación de una parada se
serializa por la misma fila de viaje, conserva los IDs existentes y cambia
sólo el orden posterior. El filtro geográfico compara contra la geometría
publicada. La validación de una recogida exige un único intervalo compatible,
una separación mínima de 30 m de puntos existentes y alineación de hasta
150 m con la geometría publicada. Son tolerancias técnicas de este corte,
pendientes de calibración vial y pruebas de seguridad física.

Controladores Nest delegan a servicios; las invariantes de trayecto viven en
dominio y la persistencia en infraestructura. React Native Web y Expo usan las
mismas pantallas y el servicio HTTP. El schema no introduce otro ORM o servicio.
La modalidad se deriva de los extremos y se expone por contrato. Las
publicaciones históricas incompatibles conservan su lectura por el propietario.

## Entorno e integridad

Node 22, Prisma 7 y Expo 54 del repositorio. PostgreSQL local persistente
`55432` y dos bases independientes `ruteam`/`ruteam_test`. Se aplicaron
tres migraciones nuevas después de las seis históricas: abordaje, propuestas e
identidad estudiantil. Las nueve de cada base coinciden con el SQL local.

El respaldo de desarrollo se guardó fuera de Git con acceso privado. Los
conteos históricos de usuarios, perfiles, afiliaciones, documentos, vehículos
y sesiones coinciden antes y después de migrar y antes del seed. Desarrollo
carecía de viajes y reservas en ese momento. La conservación semántica de
pendientes/grupos se cubrió por fixtures HTTP legacy. No se promovieron
solicitudes pendientes ni se convirtió una afiliación histórica en estudiante.
La evidencia técnica se encuentra en [migraciones](evidence/2026-11-25-product/migrations.json).

## Integraciones y decisiones pendientes

- Autenticación real USC, verificación de matrícula y fuentes oficiales de
  licencia/SOAT dependen de aprobación y credenciales legítimas. Los servicios
  públicos USC documentan que el correo también aplica a otros estamentos.
  No se localizó una interfaz pública habilitada para RuTeam. La app informa
  indisponibilidad de acceso institucional y falla cerrada.
- Flujo de invitaciones grupales con consentimiento, notificaciones, chat,
  calificaciones, compensaciones y SOS siguen en backlog. La búsqueda y
  confirmación individual constituyen el corte de entrega.
- Teselas y OSRM son configurables. El entorno inspeccionado carece de
  proveedor vial y teselas operativas. Las suites usan HTTP controlado o
  fixtures de mapa. Geocodificación y ubicación consentida quedan pendientes.
  Los trayectos sin geometría se describen en texto. Elegir un punto externo
  desde la app requiere teselas configuradas.
- Prueba en teléfono, proveedor vial con datos reales de Cali, métricas de
  precisión/rendimiento y CI remoto requieren evidencia posterior.
- Hora de abordaje y tolerancia cartográfica son decisiones técnicas locales.
  Las multas, compensaciones, soporte e intervención ante incidentes requieren
  definición y aceptación del equipo.

## Coordinación y fuentes

[Definición vigente](../requirements/PRODUCT_DEFINITION.md), [trazabilidad](../requirements/TRACEABILITY.md),
[ADR](../architecture/ADRs/0003-student-participation-redefinition.md) y
[propuesta académica](../requirements/ACADEMIC_REDEFINITION_CHANGES.md).
El original UML de 36 pestañas permanece privado. Se produjeron cinco pestañas
derivadas editables para revisión local. Los cambios de ERS y backlog constan
por identificador en la propuesta. El plan Scrum termina el 28 de noviembre
con ventanas de hasta dos días. Los cortes anteriores se distinguen en las
guías archivadas. La propuesta de estado para el integrador se registra aquí,
mientras CURRENT_STATUS conserva el último estado integrado.

Propuesta para una revisión futura
`feat(product): enforce student eligibility and direct trip participation`.
La persona integradora debe revisar la migración, comprobar la historia de
`feature` y acordar promoción `task/* → feature → dev → main`.

## Validación ejecutada

| Comando o comprobación                                                                                               | Resultado                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| npm run check:env                                                                                                    | Node 22.22.3, Git 2.53.0 y PostgreSQL 18.6.                                                                |
| npm run db:generate, db:test:setup, db:migrate, db:seed                                                              | Generación y migración/seed aprobados con PostgreSQL local.                                                |
| npm run typecheck, lint, format:check; git diff --check                                                              | Aprobados.                                                                                                 |
| npm test                                                                                                             | 117/117 en 12 suites.                                                                                      |
| npm run test:e2e                                                                                                     | 4/4. Chromium escritorio y viewport iPhone 13.                                                             |
| npm run smoke                                                                                                        | 6/6, health con database up. Swagger 25 rutas, incluidas participaciones y propuestas, sin administración. |
| npm run build:api y npm run build:web                                                                                | Aprobados.                                                                                                 |
| npx expo-doctor frontend                                                                                             | 18/18.                                                                                                     |
| npm exec -w @ruteam/client -- expo export --platform android --platform ios --output-dir /tmp/ruteam-25-native       | Bundles Hermes Android/iOS generados.                                                                      |
| npm exec -w @ruteam/api -- prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code | No difference detected.                                                                                    |

Jest y Playwright se ejecutaron en secuencia contra la base test. Smoke usó
desarrollo. El 503 esperado por ausencia de motor vial y los avisos
VM Modules/pg se observaron en salidas reales. Un primer E2E falló en dos
casos de publicación por diferencias de eventos entre React Native Web y
nativo. La repetición con la corrección aprobó los cuatro. La prueba de
reintento con otro segmento también se adaptó a un descenso autorizado
desde USC tras recibir 400 por un abordaje intermedio inválido.

Se inspeccionaron las capturas sintéticas del navegador. Las geometrías
visibles son fixtures en este ensayo. No se ejecutaron pruebas de teléfono,
servicios geográficos en producción, CI remoto ni mediciones de carga.

[Recibos de validación](evidence/2026-11-25-product/validation.json) e
[inventario de archivos](evidence/2026-11-25-product/changes.json).
