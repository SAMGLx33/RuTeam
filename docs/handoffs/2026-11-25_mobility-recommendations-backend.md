# Traspaso — preferencias, feed y recomendaciones persistentes

Incremento D backend sobre `task/driver-defined-routes`, base observada `5af65f2`.
Cambios coordinados con el integrador de datos/contratos y sin escrituras Git.
Fuente funcional: nuevo encargo, secciones14–18, y definición vigente del producto.

## Auditoría inicial del núcleo

Se conservan geometría y pares autorizados del itinerario, publicación/participación
bajo locks y rechazo de viaje propio/duplicados. La búsqueda previa devuelve geometría
completa, no constituye un feed privado de preferencias y no distingue DIRECT/POTENTIAL.
No existían preferencias, bandeja persistente ni endpoint individual de detalle.
Se comunicó al integrador que las transiciones START/FINISH previas sólo verificaban
propietario/estado, sin restricción de reloj; su tratamiento corresponde al incremento E.

## Contrato implementado

- GET/POST `/api/v1/mobility/preferences`; PATCH/DELETE
  `/api/v1/mobility/preferences/:id`. PATCH recibe la representación completa.
  Lectura y mutación sólo del propietario; IDs ajenos devuelven404. Varias preferencias
  por estudiante, con sentido, días ISO1..7 y ventana0..1439 de America/Bogota.
  Los lugares pueden guardarse por zona textual sin coordenadas; un marcador opcional
  debe incluir ambas coordenadas. Sin marcador no se inventa coincidencia geográfica.
- GET `/api/v1/trips/feed?tab=FOR_YOU|ALL|DESDE_USC|HACIA_USC&cursor=...`.
  Para ti evalúa preferencias activas; Todos no exige tenerlas. Candidatos en páginas
  acotadas; excluye viaje propio y participación ya confirmada, falta de plazas,
  pasado/cerrado, documentación o identidad no habilitadas. Tarjetas sin geometría,
  coordenadas, domicilios, emails, placas ni preferencias personales. Extremos externos
  se resumen como zona externa; referencias públicas detalladas permanecen en detalle.
- GET `/api/v1/trips/:id` conserva la geometría publicada y datos públicos autorizados.
  `recommendation` siempre nullable; `match` es NULL si sólo existe potencialidad o
  si el viaje ya no admite participación, incluido lleno. Actor ajeno sólo lee futuro
  disponible; conductor, miembros históricos y destinatario de aviso pueden consultar
  su viaje cerrado. Datos privados del conductor se excluyen.
- GET `/api/v1/notifications`; POST `/api/v1/notifications/:id/read`.
  Sólo destinatario. Lectura idempotente y paginada. `available` y tipo de coincidencia
  se reevalúan con estado/documentos/preferencias vigentes, manteniendo el aviso histórico.

## Compatibilidad y límites

Se reutilizan `matchStops`, `passesNear` y `pickupInsertionPosition` sobre la geometría
persistida. DIRECT exige par autorizado en orden y proximidad al marcador privado.
POTENTIAL sólo HACIA_USC, sin recogida autorizada cercana y con inserción compatible
comprobable. No usa texto como evidencia geográfica ni modifica ruta o plazas.
Desde USC se aborda en el origen institucional. Campus se valida contra catálogo;
el catálogo actual distingue campusUSC, sin inventar identidades de sedes adicionales.

La ventana compara la salida publicada. No hay ETA intermedia de recogida ni
estimación de duración caminando. El perímetro y las tolerancias técnicas existentes
no certifican calidad vial/seguridad física. No se hacen llamadas a proveedores externos.

Identidad: email confirmado, estudiante vigente y cuenta habilitada. Mientras la fuente
institucional real siga bloqueada, sólo fixtures con identidad sintética explícita,
fuenteDEMO y configuración no productiva/demo/providerdemo producen recomendaciones o
avisos. Una fila de matrícula ni un documentoDEMO acreditan elegibilidad ordinaria.

## Procesamiento durable

La transacción de publicación incluye `RecommendationJob`. El worker reclama con
`FOR UPDATE SKIP LOCKED`, lease30s y cursor persistente; procesa50 preferencias
prefiltradas por campus/sentido/día/ventana/vehículo/fuente vigente por lote. Notificaciones
y avance de cursor comparten transacción con lock conductor→viaje y revalidación.
Unicidad destinatario+viaje+tipo evita duplicados por perfiles, reintentos o reinicio.
DIRECT puede mejorar un avisoPOTENTIAL sin reiniciar lectura ni fecha de creación.

Un fallo conserva cursor, programa backoff hasta60s y no registra PII en logs.
Leases vencidos se recuperan. Backfill de viajes existentes sólo al arranque, en
lotes50 hasta agotar; después se consumen exclusivamente intenciones persistidas.
El temporizador sólo despierta al lector; no es la fuente durable del trabajo.
En NODE_ENV=test no se activa temporizador: pruebas controlan `tick()` expresamente.

El integrador añadió hooks transaccionales de reevaluación al liberar plaza y aceptar
recogida. Preferencias editadas se reflejan inmediatamente en feed/lectura de avisos;
no disparan notificaciones retrospectivas masivas. Cancelaciones/inicio/fin se filtran
al leer/procesar. Notificaciones internas no implican push, correo o tiempo real.

## Evidencia propia y continuación

TDD dominio: RED3 fallos/12 aprobadas para matching; GREEN15/15. Regla de fuente:
RED1 fallo/15 aprobadas; GREEN16/16. Build backend aprobado. Pruebas HTTP PostgreSQL
preparadas en `backend/test/mobility.e2e.test.mjs`: privacidad/owner, Todos sin perfiles,
DIRECT/POTENTIAL, lease vencido y dedupe, lectura propia, lleno/cancelado/retiro,
expiración, actualización de preferencias y ausencia de ocupación por recomendaciones.

El coordinador ejecuta suitesDB y E2E de forma serial; este agente no atribuye resultados
PostgreSQL antes de observarlos. Integrador enlaza handoff en PROGRESS y consolida
API/trazabilidad/decisiones. Sin stage/commit/push/merge; Expo Go físico no verificado.
