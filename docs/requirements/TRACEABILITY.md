# Trazabilidad vigente de RuTeam

Fuente funcional: [PRODUCT_DEFINITION](PRODUCT_DEFINITION.md). Se mantienen IDs
RF/RNF/HU/RQ originales; las RN nuevas sólo identifican reglas y no sustituyen requisitos.
Este bloque registra impacto, implementación a inspeccionar y pruebas requeridas.
La [consolidación del 26/11](#consolidación-funcional-26112026) registra el estado
actual de esos módulos. Las tablas previas conservan los estados de sus cortes.

| Regla                                 | Requisitos / historias existentes        | Implementación afectada                                                         | Verificación requerida del corte                                                                                                    |
| ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| RN-IDENTIDAD-01/02                    | RF-001/002/016/017, RQ-ACC-01, HU-A/HU-P | auth, membership, profiles, contratos, sesión/login Expo, seed/migración roles  | Dominio declarado en modo académico, prueba de credenciales/sesión y revocación. El modo oficial falla cerrado sin su fuente.       |
| RN-VEHICULO-01                        | RF-013/024/022, HU-V                     | vehicles, elegibilidad, publicación y UI documental; datos/revisores históricos | Autogestión sin ADMIN, propiedad/capacidad/formatos/vigencia y no confundir declaración con verificación oficial                    |
| RN-VIAJE-01..04                       | RF-003/004/029, RQ-RUTA-01, HU-V         | trips/campus, modalidad/campus/encuentro, DTO/Prisma/contracts, PublishScreen   | Ambas modalidades válidas; externo→externo denegado aunque USC intermedia; texto interior sin GPS, resumen/persistencia y permisos  |
| RN-BUSQUEDA-01                        | RF-005/018, RQ-RUTA-01                   | matching en trips, filtros, RoutePreview/mapas/servicios Expo                   | Sentido/texto/horario/proximidad/paradas/capacidad; no solicitud ni cambio de ruta; no UI técnica; proveedor fallido visible        |
| RN-PARTICIPACION-01 / RN-CAPACIDAD-01 | RF-006/007/012/015                       | reservations, locks/ocupación/idempotencia, mis viajes/participaciones          | Confirmación sin aprobación; último cupo real y carreras; no propio/duplicado/ajeno; retiro una vez, estados e historia preservados |
| RN-GRUPO-01                           | RQ-GRUPO-01, RF-006                      | miembros históricos, invitaciones temporales y participaciones individuales     | Cada estudiante consiente. Invitación opaca, confirmación atómica, cupo común e historial conservado                                |
| RN-PARADA-01                          | RQ-RUTA-01, RN nueva sin RF/HU inventado | propuestas de trips, DTO/contratos/UI y persistencia                            | Sólo HACIA_USC, propietario decide compatibilidad y estado; no geometría/cupos/confirmación automática                              |
| RN-ABORDAJE-01 / RN-ESTADO-01         | RF-027/012/015                           | transiciones/participación/abordaje/eventos                                     | Confirmada antes de abordar, sin segunda plaza; inicio/final/cancelación autorizados y estados distintos                            |
| Módulos compatibles                   | RF-008/009/010/011/014/028/030           | costs/compensations/chat/ratings/safety según existencia efectiva               | Participantes autorizados, historial, precisión económica y privacidad; pendientes no se presentan implementados                    |
| Seguridad/plataformas/UX              | RNF-031..050 según catálogo              | API/Expo/config, métricas, operación y documentación                            | Medición por requisito; físicas y fuentes externas separadas de fixtures/viewport/build                                             |

Estados válidos: implementada y verificada, parcial, pendiente, bloqueada externamente
o aceptación PO pendiente. Decisión de producto resuelta no equivale a estado implementado.
Ningún total histórico revalida la semántica nueva. Confirmación directa reemplaza el
caso RF-006 histórico y la carrera ahora se produce al confirmar, no al aceptar.
[TEST_PLAN](../development/TEST_PLAN.md) define escenarios;
[ACCEPTANCE](ACCEPTANCE.md) criterios del producto y
[ediciones académicas](ACADEMIC_REDEFINITION_CHANGES.md) cambios revisables.

## Transformación de experiencia, 25/11/2026

| Alcance actual                             | Trazabilidad                                                  | Código y evidencia                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cuenta, correo y onboarding                | RF-001/002/016, RN-CUENTA-01, RN-AUTH-01/02, RN-ONBOARDING-01 | Auth modular y rutas Expo, `account-policy.test.mjs`, `account.e2e.test.mjs` y `auth.spec.ts`. Matrícula real bloqueada por fuente.                                  |
| Capacidades, navegación y conducción       | RF-001/002/003/004/013/024, RN-CAPACIDAD-CONDUCTOR-01         | Backend Auth/Vehicles/Trips y frontend layout compartido. Acceso directo verificado en web y caducidad de documentos comprobada por Jest/HTTP.                       |
| Preferencias, coincidencias, feed y avisos | RF-005/006/018, RNF-031                                       | Mobility, repositorios Prisma, cola y avisos. `mobility-policy.test.mjs`, `mobility.e2e.test.mjs` y `publication.spec.ts`. Métrica de carga institucional pendiente. |
| Participación, viaje propio e historial    | RF-006/007/012/015/029                                        | Trips/Reservations, suites de concurrencia y Playwright. Grupo, comunicación y reputación se conservan en backlog.                                                   |

El [informe de revisión](../reviews/PRODUCT_TRANSFORMATION_DELIVERY.md) conserva
la matriz de recorridos y los resultados por entorno.

## Cotejos y evidencias históricas 13–24/11

Los textos siguientes describen cortes anteriores. Sus estados, fuentes ausentes,
solicitud/aceptación, ADMIN y rutas viejas no son instrucciones de implementación vigente.
No se borran ni se reinterpretan como pruebas del 25/11.

# Trazabilidad RF/RNF — cotejo de fuentes

Cotejado el2026-11-13 (America/Bogota).50/50 identificadores, títulos y criterios
capturados (100%);49/50 prioridades unívocas en matriz (98%).RF-001 aparece en cuerpo
y referencias cruzadas, pero falta en la matriz final. No se le asigna prioridad por inferencia.
Los cuatro «Sin definir» se conservan literalmente. Ver [catálogo exacto](ERS_CATALOG.md).
UML:36/36 pestañas leídas, ver [crosswalk](UML_CROSSWALK.md). Rúbrica4/4 páginas leídas.
Esto mide cotejo, NO porcentaje funcional ni validación institucional.

Fuente: paquete local privado dentro de docs/RuTeam_Referencias_Codex_PRIVADO/reference-private/;
no se movió ni alteró. Fuentes/huellas y contradicciones en crosswalk y OPEN_DECISIONS.
Reemplaza RF-P01..30 y RNF-P01..20; historial provisional conservado en commit e3841bc.

| ID/título exacto                                                                     | Prioridad de matriz         | Estado local | Código, prueba y límite de evidencia                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [RF-001 — Autenticación por correo institucional](ERS_CATALOG.md#rf-001)             | No unívoca: falta en matriz | parcial      | Registro/login/credencial scrypt, confirmación y recuperación propia, guard de cuenta y guard de producto. Integración oficial USC pendiente.                                              |
| [RF-002 — Gestión de perfiles de usuario](ERS_CATALOG.md#rf-002)                     | Alta/Esencial               | parcial      | Perfil nombre propio y estamento; sin foto/gestión completa de perfil.                                                                                                                     |
| [RF-003 — Publicación de trayectos](ERS_CATALOG.md#rf-003)                           | Alta/Esencial               | parcial      | ViajeService.publicarViaje, Viaje.validarPublicacion, POST trips, E2E; origen/paradas DEMO sin mapa/routing real.                                                                          |
| [RF-004 — Configuracion de reglas de viaje](ERS_CATALOG.md#rf-004)                   | Media/Deseado               | implementado | TripRuleDefinition/Selection, trip-rules, DEFAULT cuando vacío; prueba HTTP y UI compartida.                                                                                               |
| [RF-005 — Búsqueda y filtrado de viajes](ERS_CATALOG.md#rf-005)                      | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-006 — Solicitud de cupo bidireccional](ERS_CATALOG.md#rf-006)                    | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-007 — Políticas de penalización por cancelación](ERS_CATALOG.md#rf-007)          | Media/Deseado               | bloqueado    | Contradicción >30 frente a <30; decisión PO pendiente. Ningún cargo.                                                                                                                       |
| [RF-008 — Cálculo de división de costos](ERS_CATALOG.md#rf-008)                      | Alta/Esencial               | bloqueado    | Cupos vs propuesta por tramos pendiente PO; no costos ni tarifa plana fabricada.                                                                                                           |
| [RF-009 — Métodos de compensación integrados](ERS_CATALOG.md#rf-009)                 | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-010 — Sistema de calificaciones](ERS_CATALOG.md#rf-010)                          | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-011 — Botón de pánico y seguridad](ERS_CATALOG.md#rf-011)                        | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-012 — Historial de viajes](ERS_CATALOG.md#rf-012)                                | Media/Deseado               | parcial      | GET trips/my lista publicaciones propias; historial completed/cancelled y paginación aún pendientes.                                                                                       |
| [RF-013 — Gestión de vehículos registrados](ERS_CATALOG.md#rf-013)                   | Alta/Esencial               | parcial      | VehiculoService/Repository, DTO placa/año/color/capacidad/ownership, unicidad409; HTTP+E2E registro; regex se valida en servidor con error visible, no prevalidación duplicada en cliente. |
| [RF-014 — Chat interno integrado](ERS_CATALOG.md#rf-014)                             | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-015 — Monitoreo de estado del viaje](ERS_CATALOG.md#rf-015)                      | Alta/Esencial               | parcial      | Enum de ciclo de vida y ocupación derivada; sólo PROGRAMADO y evento PUBLISHED, sin transiciones.                                                                                          |
| [RF-016 — Recuperación de contraseñas](ERS_CATALOG.md#rf-016)                        | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-017 — Módulo de administración](ERS_CATALOG.md#rf-017)                           | Media/Deseado               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-018 — Geolocalización en mapa interactivo](ERS_CATALOG.md#rf-018)                | Alta/Esencial               | parcial      | Origen/recogidas con rangos y ubicaciones DEMO; mapa/GPS/perímetro urbano no implementados.                                                                                                |
| [RF-019 — Calculadora de huella de carbono](ERS_CATALOG.md#rf-019)                   | Sin definir                 | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-020 — Eliminación de cuenta (Derecho al olvido)](ERS_CATALOG.md#rf-020)          | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-021 — Validación de género para trayectos en motocicleta](ERS_CATALOG.md#rf-021) | Alta/Esencial               | bloqueado    | Normativa/género sin validación jurídica actual; no filtrado discriminatorio automático.                                                                                                   |
| [RF-022 — Gestión de implementos de seguridad (Casco)](ERS_CATALOG.md#rf-022)        | Alta/Esencial               | parcial      | providesHelmet booleano obligatorio sólo en moto; validado backend y mostrado en publicación/listado propio; feed pasajero pendiente.                                                      |
| [RF-023 — Gestión de rutas recurrentes](ERS_CATALOG.md#rf-023)                       | Media/Deseado               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-024 — Verificación de documentos vehiculares (SOAT)](ERS_CATALOG.md#rf-024)      | Alta/Esencial               | parcial      | SOAT/licencia sintéticos PENDING→revisión admin, vigencia comprobada; sin uploads ni fuente oficial.                                                                                       |
| [RF-025 — Filtro de viajes exclusivo para mujeres](ERS_CATALOG.md#rf-025)            | Media/Deseado               | bloqueado    | Política de exclusividad pendiente PO; no se activa por aparecer en UML.                                                                                                                   |
| [RF-026 — Billetera Virtual Integrada (Wallet)](ERS_CATALOG.md#rf-026)               | Alta/Esencial               | excepción    | Pasarela/wallet real excluida por decisión explícita del MVP local; no se cobran ni recargan fondos.                                                                                       |
| [RF-027 — Validación de abordaje por Código QR](ERS_CATALOG.md#rf-027)               | Media/Deseado               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RF-028 — Cancelación validada por soporte](ERS_CATALOG.md#rf-028)                   | Sin definir                 | bloqueado    | Penalidad provisional/reembolso requiere política financiera/soporte aún no acordada.                                                                                                      |
| [RF-029 — Integración de paraderos oficiales USC](ERS_CATALOG.md#rf-029)             | Alta/Esencial               | parcial      | CampusDestination USC activo con FK; dos puntos DEMO no certificados, sin mapa o iconografía oficial.                                                                                      |
| [RF-030 — Módulo de Peticiones, Quejas y Reclamos (PQRS)](ERS_CATALOG.md#rf-030)     | Media/Deseado               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RNF-031 — Rendimiento en búsquedas](ERS_CATALOG.md#rnf-031)                         | Alta/Esencial               | pendiente    | No hay matching ni prueba p95<1.5s/500 concurrentes.                                                                                                                                       |
| [RNF-032 — Latencia de Notificaciones](ERS_CATALOG.md#rnf-032)                       | Media/Deseado               | pendiente    | WS/push no implementados ni p90 medido.                                                                                                                                                    |
| [RNF-033 — Precisión de geolocalización](ERS_CATALOG.md#rnf-033)                     | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RNF-034 — Escalabilidad horizontal](ERS_CATALOG.md#rnf-034)                         | Media/Deseado               | excepción    | Despliegue scale-out/cloud fuera del alcance local; 15000 registros no medidos.                                                                                                            |
| [RNF-035 — Optimización de consumo de datos](ERS_CATALOG.md#rnf-035)                 | Media/Deseado               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RNF-036 — Optimización de batería](ERS_CATALOG.md#rnf-036)                          | Alta/Esencial               | excepción    | Background GPS fuera del alcance Expo Go; no consumo medido.                                                                                                                               |
| [RNF-037 — Tiempo de arranque en frío (Cold Start)](ERS_CATALOG.md#rnf-037)          | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RNF-038 — Encriptación AES-256](ERS_CATALOG.md#rnf-038)                             | Alta/Esencial               | excepción    | Contraseñas deben usar Argon2id y no AES reversible; login demo sin contraseñas, cifrado PII real pendiente.                                                                               |
| [RNF-039 — Limitación de tasa (Rate Limiting)](ERS_CATALOG.md#rnf-039)               | Sin definir                 | parcial      | Throttler100/min IP y20/min login configurados; prueba429 específica pendiente.                                                                                                            |
| [RNF-040 — Enmascaramiento de PII](ERS_CATALOG.md#rnf-040)                           | Alta/Esencial               | parcial      | DTOs sin cédula/teléfono; datos únicamente sintéticos. No auditoría exhaustiva de PII.                                                                                                     |
| [RNF-041 — Trazabilidad inmutable de transacciones](ERS_CATALOG.md#rnf-041)          | Sin definir                 | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RNF-042 — Políticas de Backups](ERS_CATALOG.md#rnf-042)                             | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RNF-043 — Tiempo Objetivo de Recuperación (RTO)](ERS_CATALOG.md#rnf-043)            | Media/Deseado               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RNF-044 — Disponibilidad y Uptime](ERS_CATALOG.md#rnf-044)                          | Alta/Esencial               | pendiente    | Sin implementación en este corte; fases posteriores.                                                                                                                                       |
| [RNF-045 — Mantenibilidad mediante GitFlow](ERS_CATALOG.md#rnf-045)                  | Alta/Esencial               | parcial      | Monorepo modular y ramas literales/ task; cambios locales no revisados ni integrados en dev.                                                                                               |
| [RNF-046 — Interoperabilidad Multiplataforma](ERS_CATALOG.md#rnf-046)                | Alta/Esencial               | parcial      | Expo SDK 54 export web/Android/iOS; .apk/.aab/.ipa y teléfono físico no verificados.                                                                                                       |
| [RNF-047 — Compatibilidad con Sistemas Operativos Heredados](ERS_CATALOG.md#rnf-047) | Media/Deseado               | excepción    | iOS14 incompatible con SDK 54/iOS15.1+; Android10 y dispositivos físicos no probados.                                                                                                      |
| [RNF-048 — Diseño Usable y Mobile-First](ERS_CATALOG.md#rnf-048)                     | Alta/Esencial               | parcial      | Componentes compartidos web/móvil, UX real; evaluación de 100%core a una mano no realizada.                                                                                                |
| [RNF-049 — Cumplimiento Normativo (Términos legales)](ERS_CATALOG.md#rnf-049)        | Alta/Esencial               | bloqueado    | Texto legal/consentimiento versionado no implementado; requiere aprobación PO/asesoría.                                                                                                    |
| [RNF-050 — Accesibilidad (Estándar WCAG 2.1)](ERS_CATALOG.md#rnf-050)                | Media/Deseado               | parcial      | Labels, semántica y contraste del diseño; sin Lighthouse>90 ni auditoría WCAG completa.                                                                                                    |

«Implementado» se limita al enunciado del RF y al modo DEMO explícitamente autorizado;
no convierte documentos sintéticos en verificación oficial. Resultados de comandos
actuales en EVIDENCE, sin usar resultados históricos como prueba de cambios nuevos.
Reserva/último cupo no está implementado: la prueba de concurrencia de esta tarea es
PUBLICACIÓN superpuesta por conductor, un problema distinto de asignar cupos.

## Verificación de auditoría — 2026-11-13

La matriz anterior conserva su alcance DEMO y sus estados. [Auditoría nueva](../reviews/FASE2_REVIEW.md):
RF-003/004/013/024 y RQ-GRUPO-01 se contrastaron con código/contratos y pruebas repetidas;
71/71 Jest, 4/4 web y 6/6 smoke, sin afirmar cumplimiento íntegro de todos esos requisitos.
RNF-045 continúa parcial: revisión local documentada, sin commit/PR/integración autorizada.
RNF-046/047 no se acreditan por Doctor 18/18; Expo Go físico permanece bloqueado.
RF-001 sigue sin prioridad unívoca; no hubo nuevo cotejo integral de originales privados
en esta auditoría. Se usaron los derivados y procedencias previamente documentados.

RF-006 y último cupo siguen **pendientes de implementación**: el
[plan de Fase 3](../development/FASE3_RESERVAS_PLAN.md) especifica criterios y pruebas,
no evidencia ejecutada de reservas. RF-007/021/025 permanecen bloqueados por PO.
Npm audit fallido y límites RNF constan por separado en informe, sin convertir conteos
locales en cumplimiento de seguridad, plataforma física o desempeño no medido.

## Traslado de rutas — 2026-11-14

apps/api→backend y apps/client→frontend; packages/contracts sigue igual. Se conservan
identificadores, prioridades, criterios y estados RF/RNF de esta matriz. El movimiento
no implementa reservas, verificación institucional, requisitos de negocio ni RNF nuevos.
Schema/SQL/controladores/aplicación/dominio/repositorios/UI mantienen contenido y sufijos;
ver [equivalencia](../reviews/ARCH_REFACTOR_REVIEW.md). Las referencias históricas a rutas
anteriores describen sus snapshots; instrucciones vigentes usan backend/frontend.
Las pruebas HTTP de hoy están bloqueadas/fallidas por la BD configurada ausente; no
revalidan los71/71 históricos ni cambian estados para maquillar cumplimiento.

## Redefinición del 24 de noviembre — corte local

La matriz histórica arriba conserva el cotejo. Los estados siguientes se aplican a la redefinición en la rama de tarea. Revisar aceptación en conjunto con los casos A–E.

| Requisitos                         | Estado local y evidencia                                                                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-003, RF-004, RF-013, RF-022     | Publicación bidireccional y validaciones verificadas. DTO `ItineraryDto`, `ViajeService`, `TripStop`, `PublishScreen`, API y Playwright. RF-013/022 continúan mediante los controles de Fase 2.                                                 |
| RF-005 / RQ-RUTA-01                | Filtro de paradas, cupos, sentido, horario y vista del trayecto verificados. `matchStops`, `searchTrips`, `RoutePreview`. Calibración, geocodificación, ETA por parada y la prueba RNF-031 (p95 <1,5 s con 500 concurrentes) siguen pendientes. |
| RF-006 / RQ-GRUPO-01               | Solicitud, aceptación y último cupo verificados por HTTP, PostgreSQL y Expo web. RF-006 completo queda parcial por notificaciones push y WebSocket del original. Las reglas de grupo pendientes figuran en OPEN_DECISIONS.                      |
| RF-012, RF-015                     | Listados y transiciones básicas verificadas. Historial avanzado, notificaciones y seguimiento permanecen parciales.                                                                                                                             |
| RF-018, RF-024, RF-027, RF-029     | Vista geográfica y catálogo DEMO parciales. RF-024 conserva revisión sintética. Precisión/dispositivo, QR, catálogo y verificación oficiales pendientes.                                                                                        |
| RNF-039, RNF-040                   | Autorización, campos mínimos, límites y evento de viaje revisados. La privacidad DEMO y la limitación técnica no acreditan todas las métricas originales. RNF-041 queda pendiente junto con la liquidación económica.                           |
| RNF-045, RNF-046, RNF-048, RNF-050 | Rama individual, contratos, revisión Playwright escritorio y viewport móvil. Expo Go físico y conformidad WCAG pendientes.                                                                                                                      |

## Evidencia local del 25 de noviembre

La tabla de este corte se interpreta conforme a PRODUCT_DEFINITION. Los ID de
requisitos e historias se mantienen. Los resultados describen evidencia
sintética con API y PostgreSQL real.

| RF y reglas vigentes                                                    | Evidencia o dependencia                                                                                                                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-001/002, RN-IDENTIDAD-01/02                                          | auth.e2e, membership, Playwright, control de sesión y cuenta. Acceso y vigencia reales bloqueados por fuente institucional.                                                                      |
| RF-003/004/029, RN-VIAJE-01/02/03/04                                    | driver-routes.e2e, pickup-proposals.e2e y Playwright. Los dos sentidos, extremo USC, origen con encuentro libre y publicación en mapa pasaron. Catálogo oficial completo pendiente.              |
| RF-005/018, RN-BUSQUEDA-01                                              | Búsqueda textual, catálogo, sentido, horario y filtro por geometría en driver-routes.e2e. Render web por Playwright con teselas controladas. Geocodificación, calibración y teléfono pendientes. |
| RF-006/007/012/015, RN-PARTICIPACION-01, RN-CAPACIDAD-01 y RN-ESTADO-01 | Confirmación individual, retiro y estados comprobados. 201/409 por último cupo y reintento sin consumo adicional. RN-GRUPO-01 y notificaciones pendientes.                                       |
| RN-PARADA-01                                                            | pickup-proposals.e2e. Autorización, orden, aceptación, rechazo y cierre comprobados. Aceptación no consume plaza.                                                                                |
| RF-013/022/024 y RN-VEHICULO-01                                         | phase2.e2e, student-document-policy y Playwright. Sólo autogestión y declaración en entorno sintético. Verificación mediante fuente legítima bloqueada.                                          |
| RF-017                                                                  | Retirada explícita del alcance vigente. Auth/vehículos comprueban ausencia de administración.                                                                                                    |
| RF-027 y RN-ABORDAJE-01                                                 | Registro de presencia por conductor, driver-routes.e2e. QR interno pendiente.                                                                                                                    |
| RF-008/009/010/011/014/028/030                                          | Compensación, calificación, SOS, chat y canales de soporte siguen pendientes.                                                                                                                    |
| RNF-039/040/045/046/048/050                                             | Sesión/privacidad y arquitectura revisadas. Verificación web y comprobaciones de build documentadas. Accesibilidad completa, rendimiento y dispositivo físico pendientes.                        |

[Informe del corte](../reviews/PRODUCT_REDEFINITION_DELIVERY.md).

## Continuidad operativa, 26/11/2026

| RF / RN            | Corte local                                                                                       | Límites                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| RF-001/016         | SMTP probado en Mailpit local con tokens, revocación y aislamiento institucional                  | SMTP remoto y matrícula real pendientes                                             |
| RF-003/005/018/029 | Sedes por FK, búsqueda explícita, selección de geometría y horarios verificados de recogida       | Coordenadas institucionales de embarque, señal GPS y teselas autorizadas pendientes |
| RF-006/012/015/027 | Conservación de plazas, llegada en orden, abordaje manual, ausencia explícita, cierre e historial | QR interno y seguimiento GPS pendientes                                             |
| RF-014             | Chat del viaje, avisos internos, lectura, paginación, retiro y retención                          | WSS y push quedan pendientes                                                        |
| RF-010             | Diseño de permisos derivado de conductor ↔ pasajero abordado                                      | Rango y promedio esperan decisión PO                                                |

## Consolidación funcional 26/11/2026

| Requisito y alcance                     | Estado del corte y referencia directa                                                                                                                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-010, RN-CALIFICACION-01              | Implementado. `TripRating` guarda una nota única por viaje y escalas separadas por capacidad. `ratings-policy.test.mjs`, `ratings.e2e.test.mjs` y `ratings.spec.ts` cubren el acceso, los extremos de la escala, la exclusión por estado/abordaje, la carrera por duplicado y el promedio persistido tras recargar. |
| RF-006, RQ-GRUPO-01, RN-GRUPO-01        | El corte local incorpora grupos, consentimiento revocable antes de confirmar y confirmación atómica. `groups.e2e.test.mjs` cubre reintentos, cupo compartido con confirmación individual, dos grupos en disputa, caducidad y vigencia. `groups.spec.ts` recorre invitación y confirmación desde dos sesiones.       |
| RF-012, RF-015, RF-027, RN-ABORDAJE-01  | Flujo manual preservado y QR opaco de uso único ligado a la parada. `boarding-qr.e2e.test.mjs` comprueba caducidad, concurrencia, titularidad y alternativa manual. El escaneo de cámara queda pendiente de medición física.                                                                                        |
| RF-015, RN-SEGUIMIENTO-01               | Implementación parcial del seguimiento. El propietario publica voluntariamente el último punto y puede retirarlo. `trip-tracking.e2e.test.mjs` y `safety.spec.ts` comprueban vigencia y acceso. La prueba web utiliza geolocalización controlada.                                                                   |
| RF-011, RF-028, RF-030, RN-SEGURIDAD-01 | Seguridad parcial. `trip-safety.e2e.test.mjs` comprueba autorización y datos mínimos. `safety.spec.ts` ensaya vista previa, transferencia al selector de compartir y enlace al marcador mediante adaptadores de prueba. Canales de despacho, soporte y PQRS pendientes.                                             |
| RF-008/009, RN-COSTO-01                 | Estimación privada parcial. `TripExpenseEstimate` guarda pesos enteros por concepto antes del inicio. `expenses-policy.test.mjs` y `expenses.e2e.test.mjs` cubren suma, visibilidad, edición y rechazo de importes inválidos. Reparto, métodos, cargos y liquidación permanecen pendientes de política.             |
| RF-014, RN-NOTIFICACION-01              | Las participaciones confirmadas del grupo habilitan chat según la regla de acceso existente. `GROUP_CONFIRMED` y `RATING_AVAILABLE` son avisos internos persistentes. Los resultados de la entrega e integración se registran en los informes y handoffs.                                                           |

El cálculo de costos acordados, el envío SOS delegado y la verificación
institucional no se infieren de pruebas locales. Consultar el [plan de Expo
Go](../development/MOBILE_TESTING.md) y las [decisiones](../decisions/OPEN_DECISIONS.md).

## Corte local de cierre del 26/11/2026

La matriz histórica de arriba conserva las interpretaciones de sus cortes.
Consultar el [estado actual por requisito](../reviews/RELEASE_READINESS.md).

| Requisito                                | Implementación y criterio                                                                                                                                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-008 y RF-009                          | `expenses`, publicación Nest, `Trip`, `TripExpenseEstimate`, `TripCompensation`, Expo. Revisión previa, piso en COP, inmutabilidad con plazas vacías, autorización y un registro por reserva abordada. `expenses-policy`, `release-economics-safety` y `publication.spec`. |
| RF-011 y RF-030                          | `safety`, `EmergencyContact` y `TripIncident`. Edición y consulta propias, consentimiento para compartir, contexto de incidencia y caducidad GPS. `trip-safety`, `trip-tracking`, `release-economics-safety`, `safety.spec`. Canal institucional pendiente.                |
| RF-006, RF-012, RF-015, RF-027 y RNF-032 | Participaciones/QR y cierre transaccional con estados históricos y avisos por evento. Consentimiento grupal ligado a condiciones inmutables y retiro individual. `groups`, `driver-routes`, `boarding-qr`, `chat`, `mobility`. Push pendiente.                             |

## Continuidad de producto del 26/11/2026

| Requisito | Evidencia implementada                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-023    | `Trips`, `RecurringTrip`, `RecurringOccurrence`, `/trip-schedules`, `/recurring-trips`. Integración con publicación, recomendación y bandeja. |
| RF-020    | `Auth`, `AccountDeletionRequest`, `/auth/lifecycle`, `/account-settings` y `/account-status`.                                                 |
| RF-019    | `Mobility`, consulta mensual sobre viajes y participaciones abordadas, `/mobility/statistics`, `/mobility-statistics`.                        |
| RF-026    | `Expenses`, `/economics/history`, `/economic-history` y accesos posviaje.                                                                     |
| RF-028    | `Reservations`, `INTERRUPT`, motivos, confirmación explícita y cierre de la actividad en vivo.                                                |
| RF-030    | `Safety`, página `/incidents`, `GET /me/incidents` y exportación contextual.                                                                  |

Criterios y comandos de prueba en el [plan](../development/TEST_PLAN.md#pruebas-de-continuidad-del-producto). Estado de integración en [preparación de entrega](../reviews/RELEASE_READINESS.md).

## Evolución ambiental y comunicación

| Requisito                   | Implementación                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-019                      | Consumo, catálogo FECOC/SIN, tramos y cierre reproducible en Mobility. `/vehicles/:id/energy`, `/mobility/environment/trips/:id` y estadísticas mensuales. |
| RF-014/RNF-032              | SSE sobre sesiones vigentes, PostgreSQL LISTEN/NOTIFY, indicadores de lectura del chat y reconexión.                                                       |
| RF-012/RF-015/RF-027        | `/trips/:id/operation`, seguimiento por rol y reutilización de pases QR en viaje activo.                                                                   |
| RF-023                      | `/mobility/agenda`, fechas previstas y resultado de ocurrencias, reutilización mediante `/trips/:id/reuse`.                                                |
| RF-008/RF-009/RF-010/RF-030 | Centro de actividades y resumen posviaje con enlaces autorizados a compensaciones, notas e incidencias.                                                    |

Pruebas y límites en [preparación de entrega](../reviews/RELEASE_READINESS.md#evolución-ambiental-y-comunicación).

## Operación del viaje y movilidad cotidiana

| Requisito              | Implementación y evidencia localizada                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-003, RF-004, RF-023 | `ViajeService.edit`, `student-schedule.ts`, versión, recurrencias y publicación. `driver-routes.e2e`, `activity-window.test`.                                            |
| RF-005, RF-006         | Preferencias, guardados y agenda en Mobility. Confirmación individual y grupos bajo el mismo orden de bloqueos. `daily-mobility.e2e`, `groups.e2e`, `driver-routes.e2e`. |
| RF-012, RF-015, RF-027 | Descenso, retiro antes de comenzar, vencimiento y resumen de operación. `driver-routes.e2e`, `boarding-qr.e2e`.                                                          |
| RF-018, RNF-033        | Consentimiento, precisión y caducidad en Safety. `trip-tracking.e2e` y `safety.spec`. Validación física pendiente.                                                       |
| RF-019                 | Procedencia del descenso en el cierre ambiental, con geometría planificada. `product-evolution.e2e`.                                                                     |
| RF-014, RNF-032        | Reconciliación de chat, bandeja, reconsulta SSE y enlaces de notificación. `chat.e2e`, `connectivity.spec` y `evolution.spec`. Push físico pendiente.                    |

## Integración académica y navegación

| Requisito              | Aceptación y prueba                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-001, RF-002, RF-016 | Dominio exacto, alta concurrente, dos cuentas ordinarias, estado separado y protección frente a enlaces tardíos. `declared-access.e2e` e `institutional-registration.spec`. |
| RF-003, RF-013, RF-024 | Conducción académica condicionada a titularidad, licencia, SOAT y vigencias. `declared-access.e2e` y `phase2.e2e`.                                                          |
| RF-015, RF-018         | Maniobras firmadas, vínculo con geometría y avance aproximado. `osrm-routing.test`, `routing-selections.test`, `campus-timing.e2e`, `route-progress.test`.                  |

### Continuidad de cartografía y operación

- RF-003 y RF-015. Las alternativas del asistente conservan paradas, orden e
  indicaciones firmadas. `publication.spec` y `institutional-registration.spec`
  documentan disposición, selección y publicación desde web.
- RF-005 y RF-006. La hora de salida estimada se aplica a la coincidencia de
  preferencias. El recorrido de dos cuentas comprueba recomendación directa
  y confirmación transaccional.
- RF-018 y RNF-033. `route-progress.test` comprueba ambigüedad, caducidad y
  tiempo restante. El recorrido de dos cuentas incluye vista privada de mapa
  y revocación de ubicación tras el descenso. El dispositivo físico sigue
  pendiente.
