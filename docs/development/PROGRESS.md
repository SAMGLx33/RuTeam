# Progreso verificable e índice de handoffs

Fuente de estado integrado: ../coordination/CURRENT_STATUS.md. Este registro incluye
trabajo LOCAL y no equivale a aprobación o fusión en dev.

- 2026-11-13 — Fundación local en main: monorepo, Prisma/PostgreSQL, auth/perfil/campus,
  Expo web/nativo,27/27 Jest,2/2 Playwright,6/6 smoke, Doctor18/18. Físico y referencias
  pendientes; estado PARCIAL. [Handoff inicial](../handoffs/2026-11-13_main_foundation_vertical.md).
  [Evidencia](../demo/EVIDENCE.md). Sin push/PR/merge. SHA se registra tras crear commit.

Añadir entradas pequeñas y nuevas; no sobrescribir histórico ajeno. Cada avance, incluso
parcial, requiere handoff nuevo y documentación en el mismo commit.

- 2026-11-13 — task/trips-publicacion desde feature=e3841bc, checkpoint f637499 leído
  pero no integrado. Fuentes privadas cotejadas:50IDs/49prioridades y36pestañas UML.
  Vehículos/licencia/revisión DEMO versionada, publicación USC/paradas/reglas/intervalos
  y listados propios con71/71 Jest y4/4 E2E, Doctor18/18 y exports reales. No commit
  autorizado, PR, merge ni push; estadoPARCIAL. [Handoff Fase2](../handoffs/2026-11-13_task-trips-publicacion_fase2.md).
  [Evidencia vigente](../demo/EVIDENCE.md#continuidad-fase-2--2026-11-13-americabogota).

## 2026-11-13 — Auditoría de Fase 2 y diseño de reservas (sin integración)

Codex auditó el árbol existente `task/trips-publicacion`, HEAD `e3841bc`, sin stage,
commit ni cambios productivos. Los 78 paths iniciales coinciden con el parche anterior
(SHA256 en manifest); se corrigió únicamente una afirmación documental de API.md:
Trip.version es interno, no campo de TripSummary. Dictamen **APROBAR CON CONDICIONES**
para revisión del primer commit local; no aprobación de promoción.

Repetidos secuencialmente: generate/migrate/seed/test:setup/typecheck/lint aprobados;
Jest 71/71, Playwright 4/4, smoke 6/6, Doctor 18/18, diff --check aprobado. npm audit
FALLIDO: 40 alertas, cinco altas. Seeds idempotentes y checksums 4/4 en cada BD local.
Expo Go físico BLOQUEADO POR ENTORNO; exportaciones históricas no repetidas.

Informe, integración propuesta, checklist física y listado exhaustivo del commit:
[FASE2_REVIEW](../reviews/FASE2_REVIEW.md) y
[FASE2_COMMIT_PROPOSAL](../reviews/FASE2_COMMIT_PROPOSAL.md).
[FASE3_RESERVAS_PLAN](FASE3_RESERVAS_PLAN.md) es sólo diseño; RF-006 sigue pendiente.
[Handoff nuevo](../handoffs/2026-11-13_task-trips-publicacion_auditoria-fase2-reservas-plan.md).
Integrador/revisores/PO: POR_ASIGNAR. Checkpoint f637499 sigue aislado; no PR/merge/push.

## 2026-11-14 — Traslado estructural a backend/frontend

Rama task/refactor-monorepo-structure desde bab4e630784714f8fa58bcbf964ea5a48e37259a
(Fase 2 publicada, todavía NO integrada en feature=e3841bc). Codex movió workspaces
completos, sin modificar la arquitectura interna ni reglas:216 archivos originales,
133 .gitkeep, inventario/hash/permisos preservados. Lockfile1309 entradas equivalentes,
sin upgrades; npm ci aislado aprobado. Stage vacío, sin commit/push/PR/merge del refactor.

Typecheck/lint/formato/builds/Doctor18/18/exports web-Android-iOS aprobados. npm test real:
28 pasan/43 fallan/71 por PostgreSQL55432 ausente desde baseline. Migrate/seed/test:setup y
smoke fallan por entorno; E2E bloqueado. API/web responden, health503, auth/me401/login500;
no login funcional aprobado. Audit40/5altas, Expo Go físico NO VERIFICADO. Estado PARCIAL.

[Baseline](../reviews/ARCH_REFACTOR_BASELINE.md), [plan](../reviews/ARCH_REFACTOR_PLAN.md),
[revisión/condiciones](../reviews/ARCH_REFACTOR_REVIEW.md),
[estructura obligatoria](../architecture/REPOSITORY_STRUCTURE.md) y
[handoff nuevo](../handoffs/2026-11-14_task-refactor-monorepo-structure.md).
Responsables/revisores POR_ASIGNAR. Primero entorno y pruebas, después autorización Git;
PR estructural a feature sólo tras integrar Fase 2. No reservas ni nueva migración.

## 2026-11-14 — PostgreSQL persistente y validación funcional completa

Usuario autorizó crear desde cero el entorno de desarrollo/pruebas sustituyendo al
clúster temporal desaparecido. Nuevo PostgreSQL18 real en .local-data/postgresql-18
fuera del checkout,127.0.0.1:55432; ruteam/ruteam_test separadas. .env intacto y5432 sin usar.
Cuatro migraciones por base con checksums4/4; seed idempotente en12tablas por base.

Nueva ejecución:71/71 Jest,4/4 Playwright,6/6 smoke, Doctor18/18, typecheck/lint/formato,
buildAPI/web y equivalencia216/133 aprobados. Concurrencia201/409 y conteo +1 observados
sobre PostgreSQL_test. Web8081 autentica y persiste perfil después de recargar; health200/up.
Se corrigió caché de manifiesto Expo mediante --clear en dev:web/dev:client y E2E8082:
conserva variables y aislamiento API3100/BD_test. Primer falloE2E4/4 documentado, no ocultado.

[Diagnóstico](../reviews/POSTGRESQL_RECOVERY_DIAGNOSIS.md),
[validación/evidencias](../reviews/POSTGRESQL_RECOVERY_VALIDATION.md) y
[handoff](../handoffs/2026-11-14_task-refactor-monorepo-structure_recuperacion-postgresql.md).
Rama task/refactor-monorepo-structure, HEAD bab4e63; sin stage/commit/PR/push/merge.
Fase2 aún no integrada en feature. Local validado, no integrado; físico/CI/audit pendientes.

## 2026-11-24 — Redefinición funcional del itinerario y reservas

Rama local `task/driver-defined-routes` desde `690d486` de feature. El conductor publica un trayecto hacia o desde USC, con puntos DEMO institucionales o públicos personalizados y geometría opcional. El pasajero busca sobre pares autorizados y solicita plazas. El conductor decide, gestiona estados y conserva la ruta. Cupos de grupo validados en PostgreSQL real. Jest 81/81, Playwright 4/4, smoke 6/6 y Expo Doctor 18/18. Export web/Android y Playwright en escritorio y viewport móvil. Fuentes originales privadas y Expo Go físico pendientes.

[Informe](../reviews/DRIVER_DEFINED_ROUTES_DELIVERY.md), [diagnóstico y datos](../handoffs/2026-11-24_driver-defined-routes_diagnostico-datos.md), [publicación y matching](../handoffs/2026-11-24_driver-defined-routes_publicacion-matching.md) y [reservas e integración](../handoffs/2026-11-24_driver-defined-routes_reservas-integracion.md). Validación local. Revisión humana, decisiones PO y promoción pendientes.

## 2026-11-25 — Identidad estudiantil y autogestión documental

Incremento local en task/driver-defined-routes: sesión sólo STUDENT vigente, capacidades
compatibles, retiro de administración y migración histórica sin reclasificar usuarios.
Autogestión de licencia/SOAT con procedencia declarada separada de verificación autorizada;
producción cerrada y acceso sintético por opt-in explícito de desarrollo. ESLint propio
aprobado; suites reales serializadas por el ejecutor central, ver informe integrado.
[Decisiones/endpoints](../reviews/STUDENT_IDENTITY_SELF_SERVICE.md) y
[handoff propio](../handoffs/2026-11-25_identidad-autogestion-estudiantil.md).
Sin stage/commit/push/PR/merge ni alteración de migraciones tras su aplicación.

## 2026-11-25 — Confirmación directa y recorrido controlado por el conductor

Actualización local de `task/driver-defined-routes` en `72a31d7`. La nueva
[definición](../requirements/PRODUCT_DEFINITION.md) sustituye las reglas
incompatibles de los cortes anteriores. Confirmación individual transaccional,
retiro futuro, abordaje, recogida propuesta hacia USC, publicación con texto
libre/mapa y descubrimiento por recorrido. Se eliminó la aprobación ordinaria y
la administración del producto. Invitar grupos y acreditar matrícula real
siguen pendientes.

Ejecutadas 117/117 Jest, 4/4 Playwright, 6/6 smoke. Dos confirmaciones compitiendo
por una plaza devolvieron 201/409. Nueve migraciones verificadas en PostgreSQL
`ruteam` y `ruteam_test`, separadas. La publicación en navegador pasó en escritorio
y viewport móvil con teselas y respuesta vial controladas.

[Informe y límites](../reviews/PRODUCT_REDEFINITION_DELIVERY.md).
Handoffs de [identidad](../handoffs/2026-11-25_identidad-autogestion-estudiantil.md),
[participación](../handoffs/2026-11-25_direct-participation.md) y
[recorrido e integración](../handoffs/2026-11-25_driver-defined-routes_redefinicion-producto.md).

## 25/11/2026 | Transformación de cuentas, navegación y recomendaciones

Avance local en `task/driver-defined-routes` desde `5af65f2`. Registro, contraseña
propia, verificación de buzón, recuperación y onboarding se integraron con los guards
de cuenta y producto. Inicio y perfil se separaron y la navegación responde a capacidades
efectivas. PostgreSQL conserva preferencias múltiples privadas, jobs y avisos internos.
Los viajes mantienen dirección USC, ruta del conductor, propuestas, participación directa
y capacidad transaccional. Ver [revisión de entrega](../reviews/PRODUCT_TRANSFORMATION_DELIVERY.md).
La acreditación USC real, el dispositivo físico y la revisión/promoción humana siguen pendientes.

## 26/11/2026 | Continuidad operativa

Se reprodujo el punto de control anterior y se prepararon incrementos separados.
Esta intervención añade verificación de correo con buzón local, geocodificación,
sedes, estimaciones viales, progreso de paradas y conversación del viaje. Ver
[revisión de continuidad](../reviews/PRODUCT_CONTINUITY.md) para resultados,
autorizaciones, pruebas y pendientes. El estado integrado sigue a cargo de la persona
integradora.

## 26/11/2026 · Consolidación funcional

Con un punto de control separado se repitieron 184 pruebas de backend y cuatro
recorridos web del corte previo. El incremento implementa RF-010 con su regla
aprobada, grupos consentidos con plaza atómica, pases QR internos, contexto de
seguridad, ubicación voluntaria en viaje activo y una estimación privada de
costos. El ensayo PostgreSQL restauró en una base nueva el respaldo histórico.
Los resultados, el flujo completo y los asuntos pendientes están en la
[revisión del corte](../reviews/PRODUCT_CONSOLIDATION.md).

## Cierre funcional local, 26/11/2026

La revisión partió de `f7013ea` en una copia de trabajo aislada. Incluye
RF-008/009, contactos e incidencias privadas, estado de seguimiento y efectos
del ciclo de vida. La migración aditiva conserva las 18 anteriores.
Resultados, pruebas visuales y bloqueos vigentes están en
[RELEASE_READINESS](../reviews/RELEASE_READINESS.md). La promoción requiere la
revisión habitual del equipo.

## Continuidad del producto del 26/11/2026

En `task/release-readiness` sobre `f7013ea` se añadieron siete incrementos de trabajo técnico. Las recurrencias reutilizan la publicación, la cuenta resuelve cupos y sesiones y los historiales consultan PostgreSQL. Cierre seguro, incidencias y bandeja se integran en las pantallas operativas. Evidencia y decisiones en los [relevos por incremento](../handoffs/README.md#continuidad-del-producto) y [preparación de entrega](../reviews/RELEASE_READINESS.md).

## Evolución del 26/11/2026

RF-019 pasó de infraestructura a cálculo de operación y atribución. Se incorporaron SSE, seguimiento, contexto posviaje, agenda, actividad, reutilización y preferencias de notificación. Los [relevos por incremento](../handoffs/README.md#evolución-ambiental-y-comunicación) registran implementación y evidencia. La entrega en dispositivo y proveedores reales sigue una validación separada.
