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
Rango/fórmula de RF-010, penalidades, costos y género siguen en OPEN_DECISIONS.

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
