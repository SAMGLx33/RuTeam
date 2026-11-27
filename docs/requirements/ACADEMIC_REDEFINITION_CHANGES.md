# Especificación revisable de actualización académica

25/11/2026. PRODUCT_DEFINITION prevalece funcionalmente; no sustituye la revisión
académica del equipo. Este documento especifica cambios; no afirma que ERS/UML,
Product Backlog, rúbrica o planificación originales ya hayan sido editados o aprobados.
No contiene originales, ficha de autores, contactos, entrevistas ni otros datos personales.

## Fuentes y acceso observado

En docs/RuTeam_Referencias_Codex_PRIVADO se localizaron localmente un .doc, un .drawio
y un .pdf. Se comprobaron bytes/hash y estructura XML del drawio (36/36 pestañas,
no comprimidas). Coinciden con el cotejo anterior:

| Fuente       | SHA256                                                           |
| ------------ | ---------------------------------------------------------------- |
| ERS .doc     | d32bff7bfe9e7136322d1cbbf0a1541bcb3118d9017f9d822832a6de0a05c728 |
| UML .drawio  | 7d6efaa83cbc440b0cf784829f729ba7cc50277ce4f49c67e94d74f281c1b98a |
| Rúbrica .pdf | 2e6a1a7b53cdd502562b62b35bfd8f59779d9a7f2bcdab570c494b31c1a03ffe |

El contenido funcional cotejado previamente está en ERS_CATALOG y UML_CROSSWALK.
No se realizó una extracción integral nueva de ERS/rúbrica ni se publicaron conversiones.
En este entorno no se encontraron antiword, LibreOffice ni pandoc; pdftotext está
presente para lectura local del PDF. No se intentó editar el binario .doc con sustituciones
ni hacer cambios parciales del XML que dejaran flechas/actores inconsistentes.
Los originales permanecen intactos. Su edición visual/revisable está pendiente del
editor apropiado y revisión de autoría; no es un bloqueo de acceso a esas tres fuentes.
Product/Sprint Backlog y registros Scrum originales no localizados en el paquete.
No reconstruir historias, IDs, prioridades, Story Points o ceremonias ausentes.

## ERS: cambios por identificador verificado

Conservar una versión histórica y producir revisión identificada por fecha/versionado
por el equipo en el canal privado. Modificar cuerpo, validaciones, secuencia, parámetros,
salidas, modelo y criterios de aceptación de cada ficha afectada de forma coherente:

- RF-001/002/016: sólo estudiante vigente y capacidades en una cuenta. Separar dominio
  de correo, control de buzón, autenticación, estamento, matrícula y conducción; provider
  legítimo y fallo cerrado. No imponer contraseña propia/JWT por herencia textual.
- RF-003/004/029: DESDE_USC/HACIA_USC con campus institucional en un extremo, encuentro
  libre interior sin coordenada propia obligatoria, ubicación exterior genérica elegida
  por mapa/dirección, recorrido/condiciones del conductor y resumen confirmado.
- RF-005/018: filtros de viajes existentes; separar texto/campus, calidad/proximidad
  geográfica, paso y parada autorizada. Eliminar solicitudes de transporte y coordenadas
  manuales; conservar geometría seleccionada sin prometer carreteras por una recta.
- RF-006: reemplazar Solicitar→aceptar/rechazar por confirmación directa. Estado confirmado
  y ocupación se producen en una transacción. Duplicados/reintentos/último cupo/conflictos
  coherentes; conductor consulta participantes. Notificar no equivale a aprobar.
- RF-007/012/015: retiro futuro válido libera plaza e historial permanece. Separar estado
  operativo y disponibilidad; actores/transiciones explícitos; no cambios esenciales
  silenciosos. Mantener contradicción de penalidad para decisión, sin deuda inventada.
- RF-013/024/022: quitar aprobación ADMIN; autogestión, titularidad/capacidad/casco,
  licencia/SOAT y formato/vigencia. Declarar/aportar no es verificar oficialmente.
- RF-017: registrar retirada explícita del alcance vigente sin reciclar su ID. Eliminar
  actor/admin y dependencias en casos de uso, clases, endpoints e interfaz activa.
- RF-027: distinguir participación y abordaje, confirmar presencia sólo sobre participación
  confirmada, sin nueva plaza. QR interno expirado/uso único no acredita institución.
- RF-008/009/010/011/014/028/030: mantener economía sin lucro, ratings, chat, SOS y soporte
  compatibles con participantes reales y privacidad; sustituir receptor ADMIN sin inventar
  canal humano disponible. No inventar fórmula, pasarela, multa o despacho.
- RNF afectados: actualizar seguridad/privacidad/contratos/mantenibilidad/UX y pruebas
  reales; no rebajar métricas ni declarar cumplimiento por cambios documentales.

RN-PARADA-01 y RN-GRUPO-01 identifican cambios transversales sin inventar RF/HU.
Propuesta HACIA_USC y decisión separada no reservan; grupo requiere consentimiento,
invitación temporal y atomicidad. RF-001 conserva prioridad no unívoca de la matriz.
El encargo de consolidación resuelve el rango y fórmula de RF-010. Penalidades,
costos y género siguen en OPEN_DECISIONS.

## UML: ediciones con identidad de pestaña existente

Aplicar la tabla vigente de [UML_CROSSWALK](UML_CROSSWALK.md) a las36 pestañas
indexadas 00–35. Antes de guardar, revisar todas las referencias al actor ADMIN, a
aceptación ordinaria y a solicitud de transporte en casos de uso/clases/secuencias/
actividades/estados/componentes; conservar IDs y notación de elementos compatibles.

Particularmente05/16/31/35 deben ubicar la carrera por último cupo en la confirmación
misma, no en una aprobación posterior.11 distingue PROGRAMADO lleno/disponible y
EN_CURSO.13/14/27/32 separan identidad de acreditación académica.21 elimina revisor
interno activo y conserva auditabilidad.02/15/33 muestran modalidad/campus/encuentro
interior opcional en geografía.07/12/22 presentan sólo descubrimiento y compatibilidad.
Agregar propuesta→decisión en vistas pertinentes sin atribuirle número inexistente.

Comprobar source/target, cardinalidades, guardas, transiciones, mensajes, firmas MVC y
correspondencia de contratos después de modificar el XML con editor visual. No basta
cambiar títulos o pegar una nota dejando el flujo antiguo contradictorio.

## Product Backlog, rúbrica y Scrum

Al recibir el backlog original, conservar sus HU y enlazar RF/RN vigentes. Reemplazar
historias de aprobación ordinaria/ADMIN y sus Given/When/Then; adaptar las de publicación,
matching y grupo, incorporar propuestas sin inventar IDs aceptados. Registrar estado
real y dependencia de fuente institucional, mapas/dispositivo y consentimiento.

La rúbrica es un criterio de evaluación externo: no editar ni inventar aprobaciones.
Preparar correspondencia de evidencia real contra sus criterios y consultar divergencias
con el equipo/evaluador. Fecha28/11/2026, seis integrantes y sprints≤2d se conservan.
SPRINTS mantiene21–28 con ausencia explícita de actas/backlog21–23; los dos sprints
históricos descartados no se restablecen. No fabricar ceremonias o retrospectivas.

## Aceptación de la edición

Revisión del equipo debe comprobar: cero ADMIN/solicitudes incompatibles en modelo
activo; dos modalidades con FK institucional; confirmación directa transaccional;
propuesta separada; consentimiento grupal; campus/texto/mapa coherentes; estados/historia;
requisitos conservados; contratos/código/pruebas alineados; originales anteriores intactos.
Registrar autoría/revisor/fecha reales sólo cuando existan, y compartir revisiones privadas
sin subir PII al repositorio. Hasta entonces, esta especificación permanece pendiente de
sincronización del original y aceptación humana.

## Diagramas derivados del 25 de noviembre

El paquete privado contiene un borrador editable en
`revisions-2026-11-25/RuTeam_redefinicion_review.drawio`. Cinco pestañas de
revisión cubren publicación, confirmación, recogidas, identidad y estados.
El XML se volvió a leer correctamente. Falta revisión visual en diagrams.net
y consolidación con las 36 pestañas originales y el documento institucional.

## Ampliación académica para la transformación integral A–G

El nuevo encargo mantiene las decisiones de viaje/participación y amplía identidad/UX.
Los originales siguen intactos. Se volvió a inspeccionar su inventario privado: ERS,
rúbrica y UML de 36 pestañas conservan los hashes anteriores; también está el derivado editable de 5 pestañas.
No se localizaron nuevos Product/Sprint Backlog o actas originales en las raíces revisadas.
No se imprimieron nombres personales ni se copiaron los documentos a Git.

| Artefacto / IDs ya cotejados                     | Modificación requerida en versión revisable                                                                                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-001/016 y RNF-038/039/040                     | Registro/login convencional de cuenta propia, scrypt salado/versionado, tokens de correo/recuperación de uso único/expiración, sesión revocable y entrega SMTP separada. Contraseña elegida por decisión técnica, nunca clave USC ni selector de fixture     |
| RF-002, RQ-ACC-01                                | Identidad, correo, estamento/matrícula, preferencia de uso y capacidad separados. Estado de cuenta autenticada pendiente≠permiso de viajes. Onboarding persistido/retomable y habilitación voluntaria; no tipo «estudiante» alternativo a pasajero/conductor |
| RF-013/024/022                                   | Habilitación/renovación propia con capacidad efectiva; conducción vencida conserva pasajero si matrícula vigente. Sin ADMIN ni verificación oficial por declaración                                                                                          |
| RF-005/018 y RNF-031/035/040/048/050             | Preferencias privadas, matching automático, feed Para ti/Todos y detalle; compatible/potencial/no compatible. Sin solicitudes ni cambio de ruta/cupos; datos/calidad actuales y UI sin coordenadas manuales                                                  |
| Avisos relacionados con RF-006/014/015 y RNF-032 | Notificación interna persistente, destinatario/lectura/deep link/deduplicación; trabajo recuperable y estados actuales. Separar correo/push/tiempo real y no atribuir nuevo RF oficial                                                                       |
| UML00/01/13/14/27/32                             | Cuenta/credencial/verificación de correo/eligibilidad/capacidad y flujo registro→sesión limitada→acreditación→onboarding; ninguna capacidad por preferencia                                                                                                  |
| UML03/23/24/25/26                                | MVC Nest/Prisma y Expo único, servicios separados de cuentas/preferencias/matching/avisos; proveedor de correo y acreditación independientes; no infraestructura de colas obligatoria                                                                        |
| UML07/12/15/22/33                                | Preferencia privada y recomendaciones automáticas sobre viajes del conductor; feed/listado general sin búsqueda obligatoria; potencial HACIA_USC no autoriza recogida                                                                                        |
| UML19/30/34 y vistas pertinentes                 | Aviso persistente por destinatario/tipo/viaje, leído, unicidad, recuperación/reintentos y acceso a detalle actual. No presentarlo como chat/push o reserva ya implementados                                                                                  |
| Casos de uso/actividades/secuencias/estados      | Incorporar recorridos A–G de USER_FLOWS y permisos de AUTHORIZATION_MATRIX. Estados de onboarding/cuenta/eligibilidad separados de viaje/participación; URL/API/menú coherentes                                                                              |
| Backlog/HU/aceptación/Sprint Planning            | Conservar HU existentes al recibir fuente; añadir criterios de registro/verificación/onboarding, capacidades y movilidad→publicación→feed→aviso→participación. No inventar identificadores oficiales ni recuperar sprints descartados                        |

Las pestañas citadas existen en el índice de 36 pestañas original; no atribuir número a vistas nuevas
sin autoría/edición del documento. La especificación anterior sigue aplicando a las reglas
compatibles de viaje/participación. Consolidar el derivado de 5 pestañas con estos cambios sólo mediante
revisión del equipo; este incremento no editó originales ni afirmó revisión visual nueva.

Criterios académicos adicionales: login sin selector, pasajero sin publicar/propios y
negativas HTTP, conductor con experiencia pasajero, cuenta pendiente bloqueada de viajes,
onboarding retomado, feed sin preferencias, publicación compatible notificada sin búsqueda,
no coincidente en Todos, reinicio/reintento sin duplicados, privacidad de movilidad y
capturas inspeccionadas de escritorio/móvil. Usar BUSINESS_RULES/USER_FLOWS y las pruebas
nuevas efectivas, nunca los 117 casos anteriores como cobertura automática de la ampliación.

## Diagramas derivados de consolidación

El paquete privado contiene una revisión editable en
`revisions-2026-11-26/RuTeam_consolidacion_review.drawio`. Conserva las cinco
pestañas del borrador del 25 de noviembre y agrega cuatro vistas sobre
calificaciones, consentimiento grupal, abordaje y seguimiento, y costos y
seguridad. Cada vista nombra los modelos y casos de uso del corte para
compararlos con las pestañas históricas del [UML](UML_CROSSWALK.md#correspondencia-de-consolidación-26112026).
Las nuevas pestañas son derivadas y no añaden números al índice oficial.

Para una revisión institucional editable de RF-010, cambiar el rango a
1–5 inclusive, la fórmula a suma de notas dividida por cantidad y la
participación efectiva a conductor y pasajeros que abordaron. Reflejar
la capacidad evaluada, la unicidad, el comentario privado y sus pruebas.
Separar la estimación de gastos privada del reparto de aportes, que mantiene
abierta la decisión D06. Actualizar RF-027 con código opaco por viaje,
parada y participación, vigencia de dos minutos, consumo único y alternativa
manual. En RF-011 y RF-015 distinguir acciones del dispositivo, ubicación
voluntaria de corta visibilidad y despacho o soporte institucional pendiente.

Los originales conservan sus hashes. El derivado se validó como XML con
referencias íntegras. Su revisión visual y su aprobación académica quedan
pendientes.

### Cierre del 26/11/2026

RF-008 actualiza fórmula, unidad, redondeo y conducta al fallar cartografía.
RF-009 conserva los tres métodos y añade el registro voluntario por reserva
abordada. RF-011 cambia la acción externa automática por acciones confirmadas
del dispositivo y contactos propios. RF-030 incorpora el registro personal,
con canal institucional pendiente. La [matriz actual](../reviews/RELEASE_READINESS.md)
y el [derivado UML](RELEASE_UML.md) aplican estas decisiones y preservan los IDs.
