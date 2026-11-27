# Estrategia de pruebas vigente

La [definición del 25/11](../requirements/PRODUCT_DEFINITION.md) es el oráculo de negocio.
Este documento especifica cobertura requerida; no declara escenarios ejecutados ni
aprobados. Evidencia y conteos efectivos en EVIDENCE/PROGRESS y review del incremento.
Las suites históricas y sus resultados se conservan en Git/handoffs y en
[guías anteriores](../history/2026-11-24-guides.md); adaptar criterios incompatibles
sin borrar pruebas para conseguir verde.

## Entorno y niveles

- PostgreSQL real: TEST_DATABASE_URL distinta de desarrollo, con sufijo _test.
  db:test:setup aplica migraciones/seed sin reset. Una sola suite escritora por base;
  ejecutar Jest y Playwright secuencialmente. Fixtures limpian sólo sus propios recursos.
- Dominio puro: modalidades, elegibilidad, capacidad, pares/orden, documentos y estados.
- HTTP+PostgreSQL: permisos/DTO, persistencia, conflictos, locks e historial.
- Adaptadores: HTTP controlado para errores de proveedor, separado de una integración
  real. Una respuesta sintética no verifica USC/RUNT, geocodificación ni carreteras.
- Expo web: Chromium escritorio y viewport móvil, dos contextos independientes,
  persistencia tras recarga, errores visibles y accesibilidad funcional.
- Nativo: Expo Go físico con versión/modelo/OS/red observados. Export/Doctor/viewport
  son comprobaciones distintas. No declarar cámara/GPS/SecureStore físicos por compilar.

## Escenarios obligatorios por regla

| Reglas / RF relacionados           | Casos y aserciones                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN-IDENTIDAD-01/02; RF-001/002/016 | Estudiante vigente permitido; inactivo, no estudiante y correo ajeno denegados. Correo institucional no verificado y correo controlado sin matrícula no habilitan acceso. Fuente autorizada ausente falla cerrada. Sin login/seed/endpoint/panel ADMIN ni escalada desde perfil. Sesiones independientes, expiradas/revocadas, baja posterior y logout propio. Origin/cabecera/CSRF/CORS y límites. |
| RN-VEHICULO-01; RF-013/024/022     | Registro propio, placa única/formato/tipo/capacidad, propiedad y vigencia. Documento declarado o aportado no acredita fuente oficial. Renovación, vencimiento y falta de validación externa exigida bloquean operación real. Nadie modifica vehículo ajeno; sin dependencia de revisión ADMIN.                                                                                                      |
| RN-VIAJE-01..04; RF-003/004/029    | DESDE_USC y HACIA_USC válidos por campus institucional. Externo→externo rechazado incluso con punto USC intermedio; texto «USC» no suplanta FK. Encuentro interior libre sin GPS propio, campus aproximado claramente indicado. Fecha/capacidad/documentos/propiedad/choques de horario. Resumen y snapshot persistido iguales a lo elegido.                                                        |
| RN-BUSQUEDA-01; RF-005/018         | Sentido, campus, horario, destino/texto, disponibilidad, par autorizado en orden. Punto de paso/proximidad a línea no autoriza recogida. Texto no prueba proximidad exacta. Buscar no crea solicitudes, plazas ni geometría nueva. Cero resultados/error/proveedor caído visibles.                                                                                                                  |
| RN-PARTICIPACION-01; RF-006        | Confirmación directa sin aprobación, ocupa exactamente una plaza. Viaje propio, duplicado, no elegible, lleno/cancelado/completado/iniciado/cerrado o fecha vencida se rechazan. Puntos ajenos o invertidos se rechazan. Reintento conserva participación y cupos. Propietario consulta confirmados.                                                                                                |
| RN-CAPACIDAD-01; RF-006/007/015    | Dos estudiantes por última plaza: sólo uno confirma y ocupación≤capacidad. Doble clic/reintento, confirmación frente a retiro/cancelación/inicio y cancelación de viaje. Bloqueo, estados, evento e historial consistentes. Retiro válido libera plaza una sola vez.                                                                                                                                |
| RN-GRUPO-01; RQ-GRUPO-01           | Cada miembro estudiante identificado y con consentimiento. UUID no funciona como invitación. Si mecanismo grupal está pendiente, respuesta explícita sin cupos ni éxito parcial; conservar historial anterior. Cuando se habilite, invitación expira/uso controlado, no retiene indefinidamente, lote atómico y carrera de grupos por última capacidad.                                             |
| RN-PARADA-01                       | Sólo HACIA_USC. Propietario decide y ajeno no aprueba. Duplicada, incompatible, cerrada y estados terminales se rechazan. Aceptación mantiene geometría/condiciones y no ocupa plazas ni confirma. Participación posterior sólo con disponibilidad y nueva validación.                                                                                                                              |
| RN-ABORDAJE-01; RF-027             | Sólo participación confirmada del viaje correcto, actor autorizado y estado permitido; sin segunda plaza. Código/QR interno, si existe: expiración, vinculación y uso único. No confundir con QR institucional.                                                                                                                                                                                     |
| RN-ESTADO-01; RF-012/015           | Inicio/final/cancelación por propietario con precondiciones; lleno≠iniciado. Historial preservado; cambios esenciales no silenciosos. Cancelación/retiro sin multas inventadas.                                                                                                                                                                                                                     |
| RF-014/010/008/009/011/028/030     | Regresión de módulos existentes; chat sólo participantes autorizados, calificaciones posteriores reales/sin duplicados/propias, costos decimales sin lucro, compensaciones estimadas distintas de registradas, SOS sin promesa de despacho. Si pendientes, no fabricar endpoints/cobertura.                                                                                                         |

## Migraciones y seguridad de datos

Probar desde esquema previo con usuarios de roles/estamentos antiguos, documentos y
revisores, vehículos, viajes, geometrías, paradas, pendientes/confirmadas y miembros.
Conservar IDs/FKs, historia y geometrías. No promover pendientes a confirmadas ni
reclasificar administradores/docentes/trabajadores como estudiantes sin evidencia.
Verificar idempotencia de fixtures y retirar capacidad operativa ADMIN; preservar sólo
auditoría histórica necesaria. Revisar diff de esquema y migraciones aplicadas sin editarlas.

## Secuencia de comprobación

```bash
npm run check:env
npm run db:generate
npm run db:test:setup
npm run typecheck
npm run lint
npm run format:check
npm test
# Esperar final de Jest; no compartir su base en paralelo.
npm run test:e2e
npm run build:api
npm run build:web
npm exec -w @ruteam/client -- expo install --check
npx expo-doctor frontend
```

smoke requiere API y BD autorizadas iniciadas. Exportaciones Android/iOS y dispositivos
son pasos adicionales aplicables. Guardar comandos, resultados, primer fallo/corrección,
concurrencia, bases anonimizadas y limitaciones sin secretos. Rendimiento RNF-031,
consumo/precisión, WCAG y seguridad productiva necesitan mediciones propias; no inferir
cumplimiento de totales de tests ni de tener un workflow CI.

## Casos de la transformación local

- Jest `account-policy`, `account-smtp` y `account.e2e`: hash, captura controlada,
  normalización, registro pendiente, enlace único, expiración, recuperación y revocación.
- Jest `mobility-policy` y `mobility.e2e`: fuente, sentido, campus, horarios, proximidad,
  propiedad, paginación, aislamiento, dedupe, lease vencido y disponibilidad tras cambios.
- Playwright `auth.spec.ts` y `publication.spec.ts`: formulario convencional, acceso
  denegado por URL, persistencia de perfil/onboarding, panel según capacidades, publicar,
  aviso interno, detalle, participación y liberación. Chromium escritorio y viewport móvil.
- Las suites HTTP y web corren en serie sobre `ruteam_test`. Los resultados observados
  se anotan en la [revisión](../reviews/PRODUCT_TRANSFORMATION_DELIVERY.md).

## Regresión de continuidad, 26/11/2026

Mantener suites PostgreSQL en serie. Comprobar sede distinta, recolección al día siguiente,
integridad de prueba de ruta y persistencia de offsets. Para chat, comprobar rechazo de ajenos,
repetición concurrente, paginación, leído, retiro, cierre y expiración. El recorrido web prueba
selección por texto, llegada desde aviso, confirmación, chat y liberación de plazas.
El test SMTP usa su propia base y captura local. La fuente de los resultados viales
controlados se detalla en [revisión](../reviews/PRODUCT_CONTINUITY.md).

## Consolidación y aceptación por módulo

| Frente               | Escenarios                                                                                                                                  | Evidencia                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| RF-010               | 1 y 5 estrellas, 0/6/decimales, dirección por capacidad histórica, ajeno/ausencia/autocalificación, 201/409 concurrente, promedio y recarga | `ratings-policy.test.mjs`, `ratings.e2e.test.mjs`, `ratings.spec.ts`                          |
| Grupos               | Consentir sin reservar, invitación rotada o expirada, baja de elegibilidad, dos grupos y carrera con individual, inicio y retiro            | `groups.e2e.test.mjs`, `groups.spec.ts`. Las reservas individuales comparten capacidad y chat |
| QR                   | Titular, propietario, estado, recogida, vigencia, reutilización y control conjunto con abordaje manual                                      | `boarding-qr.e2e.test.mjs`. Cámara física se registra por separado                            |
| Seguridad y posición | Propietario/confirmado, retirada, denegación, codificación de ubicación, límite, eliminación, cierre y selección del sistema controlada     | `trip-safety.e2e.test.mjs`, `trip-tracking.e2e.test.mjs`, `safety.spec.ts`                    |
| Costos estimados     | Pesos exactos, visibilidad privada, validación, edición antes de iniciar y recarga                                                          | `expenses-policy.test.mjs`, `expenses.e2e.test.mjs`, tramo de navegador en `ratings.spec.ts`  |
| Restauración         | Copia restaurada, filas, restricciones y checksums derivados                                                                                | [Ensayo de restauración](../reviews/POSTGRESQL_RESTORE_DRILL.md)                              |

El navegador usa las bases PostgreSQL y los procesos Nest y Expo reales. El GPS
web y el selector externo se controlan en pruebas. Para permisos nativos y red
del teléfono usa [MOBILE_TESTING](MOBILE_TESTING.md).

Para Playwright, el servidor web de pruebas ejecuta la exportación real de Expo y la
sirve sólo en loopback. Nest conserva su proceso y base PostgreSQL de pruebas.
Las aserciones y recorridos permanecen iguales. Esta preparación evita compilar Metro
durante el primer inicio de sesión y tras recargar, especialmente en VMs con memoria limitada.

La suite comparte una sola dirección de loopback. Cuando Nest devuelve 429 en
el login de fixtures, Playwright espera el valor real de `Retry-After` y vuelve
a intentar una vez. Los límites de autenticación y las aserciones originales
siguen activos.

## Regresión del cierre, 26–28/11/2026

- `expenses-policy.test.mjs` comprueba COP exactos, división por plazas más
  conductor, cero, capacidad y gastos inválidos.
- `release-economics-safety.e2e.test.mjs` usa HTTP y PostgreSQL reales para
  publicación y consulta, privacidad, retiro, ausencia, concurrencia, abordaje,
  estado persistente y autorización de contactos, incidencias y muestras.
- `publication.spec.ts` prueba antes y después de publicar el aporte y la
  consulta de métodos desde otra sesión. `safety.spec.ts` prueba gestión de
  contactos, confirmaciones, registro privado y reconsulta en Chromium.
  Cámara, marcador, SecureStore y GPS físico requieren el recorrido nativo.
- Verifica migraciones y checksum después de restaurar en una base nueva. Corre
  las suites que escriben la misma base de forma secuencial.

## Pruebas de continuidad del producto

- `backend/test/product-continuation.e2e.test.mjs` ejecuta HTTP real contra PostgreSQL de prueba. Cubre calendario Colombia, concurrencia, recuperación persistente, fallo de vigencia, estados de las plantillas, matching, privacidad, cancelación, interrupción, agregados, discrepancia, exportación de incidencias y recuperación de cuenta.
- `tests/web/continuation.spec.ts` recorre gestión de recurrencias y accesos a cuenta e historiales en Chromium de escritorio y vista móvil. La suite de publicación comprueba la confirmación de retiro.
- Usar `TEST_DATABASE_URL` dedicada con sufijo `_test`, `npm run db:generate`, `npm run db:test:setup`, `npm test` y `npm run test:e2e`. Consultar el [resultado de la regresión](../handoffs/2026-11-26_release-readiness_validacion_continuidad.md).
- En el dispositivo físico quedan por comprobar los diálogos nativos de permiso de ubicación, el selector de compartir y la visualización en Expo Go. Las exportaciones sólo comprueban empaquetado.

## Evolución ambiental y tiempo real

- `environment.test.mjs` comprueba conversiones, fuentes, segmentos, consumo, escenarios y conservación de totales.
- `product-evolution.e2e.test.mjs` usa HTTP y PostgreSQL real. Prueba instantánea histórica, exclusión de ausencia, agenda, permisos, señales después de commit, reconexión y revocación. Simula respuestas Expo al probar la cola y valida la separación de ticket y recibo.
- `tests/web/evolution.spec.ts` prueba agenda, actualización operativa por SSE y persistencia de preferencias en Chromium.
- Ejecutar en una base `_test` dedicada y hacer las exportaciones aparte. Registrar por separado compilaciones, pruebas en navegador y prueba en equipos físicos.
