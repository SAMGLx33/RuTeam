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
