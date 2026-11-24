# Decisiones abiertas

Fecha: 2026-11-13. Responsables reales no confirmados; todos POR_ASIGNAR.

| ID  | Decisión/bloqueo                              | Opción actual reversible                                                             | Responsable requerido     |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------- |
| D01 | ERS/UML/rúbrica ausentes                      | Modelo mínimo desde prompt; matriz sin sincronizar                                   | PO/integrador             |
| D02 | Verificación oficial/QR Identifícate USC      | Provider oficial deshabilitado; BD sintética rotulada                                | USC/PO                    |
| D03 | Catálogo USC no certificado                   | Un punto DEMO, sólo lectura                                                          | Administración/PO         |
| D04 | Moto/género/exclusividad no aprobadas         | No filtrar ni discriminar automáticamente                                            | PO/asesoría institucional |
| D05 | Penalidad ERS >30 vs <30 min y fuerza mayor   | Ningún cargo ni penalidad automatizados                                              | PO                        |
| D06 | Costos ERS por cupos vs propuesta por tramos  | Futuro selector de estrategia; ninguna activa aún                                    | PO                        |
| D07 | RNF-047 iOS14 vs SDK54                        | Excepción documentada: SDK54 requiere iOS15.1+; no bajar SDK                         | PO                        |
| D08 | Expo Go físico/versión instalada desconocida  | SDK54 fijado; comprobar soporte en teléfono, no prometer compatibilidad Store actual | Equipo QA                 |
| D09 | Remoto contenía README inicial                | Preservar 7967674, fundación segundo commit; no push/merge                           | Integrador                |
| D10 | HTTP LAN de demo                              | Cookie secure=false sólo demo local; no credenciales reales                          | Equipo                    |
| D11 | Reporte npm audit del stack SDK54             | Evaluar fixes compatibles; registrar resultado en EVIDENCE                           | Integrador                |
| D12 | Retención/cifrado/anominización de PII futura | No recolectar datos reales; sólo sintéticos                                          | PO                        |

No se afirma normativa vigente, autorización institucional, pagos reales ni conexión
con autoridades. Decisiones legales pendientes no habilitan reglas arbitrarias.

## Actualización de cotejo y Fase 2 — 2026-11-13

La tabla anterior conserva el estado histórico de fundación; las fuentes ya no están
ausentes en esta rama. D01: resuelto el acceso local a ERS33p, rúbrica4p y UML36p;
50IDs y criterios cotejados,49prioridades unívocas. Ver ERS_CATALOG y UML_CROSSWALK.
No se supone aprobación institucional por los textos de las fuentes.

- D02 sigue bloqueado: sin convenio/API USC, QR oficial no se valida.
- D03: dos destinos sintéticos de entrada/parqueadero, activos en catálogo DEMO; no
  se certifica ubicación o acceso real ni se permite destino externo.
- D04/D05/D06: fuentes confirman contradicciones de género/moto, >30/<30 y cupos/tramos.
  Ninguna se activa ni se decide por PO. RF-010 añade desigualdad excluyente y promedio
  inconsistente; corrección1..5 propuesta por UML sigue fuera de este corte.
- D07/D08: iOS14 y Expo Go físico siguen pendientes; no cambiar SDK54 por auditoría.
- D11: auditoría actual40(5altas); alcance/decisiones por paquete en DEPENDENCY_REVIEW.
- D13: RF-001 omitido en matriz de prioridades; no inferir Alta desde totales32/14/4.
  ERS ficha14/11/2026 y cotejo13/11/2026 se conservan como fechas distintas. ResponsablePO.
- D14: UML23/25 propone Vue y UML26 feature/_, incompatibles con decisiones explícitas.
  Se mantienen Expo único y task/_ desde rama literalfeature; no se altera original.
- D15 (técnica reversible): duración declarada DEMO5..360min delimita choques por conductor;
  no es ruta/ETA real. Futura integración de routing deberá revisar el intervalo.
- D16 (técnica): documentos sintéticos versionados, PENDING al declarar/renovar licencia;
  ADMIN revisa una versión concreta y registra actor/fecha. Nunca aprobación oficial.
- D17: no se hace commit por falta de autorización explícita en esta intervención; diffs,
  pruebas y handoff quedan juntos para revisión, sin promover nada a dev.

## Redefinición del 24 de noviembre de 2026

| Estado                    | Decisión y criterio para continuar                                                                                                                                                                                                                             | Responsable            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Confirmada por el encargo | El conductor fija ambos extremos, vías, puntos, orden, hora y condiciones. La USC puede funcionar como origen, destino o referencia de encuentro. Se conserva la afiliación activa.                                                                            | PO de RuTeam           |
| Requiere ratificación     | Viajes sin ningún punto de encuentro asociado a la USC. Se exige provisionalmente un punto institucional o un punto interno personalizado declarado por el conductor. Fase 2 exigía destino USC.                                                               | PO                     |
| Requiere ratificación     | Un grupo usa un mismo par y lo solicita un viajero afiliado. Se excluyen duplicados activos desde PENDING. Capacidad por viaje completo. Consentimiento explícito del acompañante, reutilización por tramos y cambios a un grupo confirmado quedan pendientes. | PO, Reservas           |
| Requiere ratificación     | Retiro pendiente y cancelación total por el conductor disponibles. Cancelaciones de confirmadas por pasajero, plazos, penalidad contradictoria de RF-007 y fuerza mayor sin automatizar.                                                                       | PO                     |
| Requiere ratificación     | Política de edición con reservas. El recorrido publicado es inmutable. Cambios por cancelación y nueva publicación mientras se define consentimiento o notificación.                                                                                           | PO, Viajes             |
| Técnica provisional       | GeoJSON aportado o alternativa OSRM elegida. Alineación de 150 m para vías/accesos. Radio de matching explícito conforme al intervalo RF-005; ventana por hora de salida. ETA por parada, calibración y proveedor cartográfico siguen abiertos.                | Viajes, Recorrido y QA |
| Pendiente operativo       | Inventario certificado, ubicación de campus/entradas y verificación oficial. La copia actual contiene sólo derivados versionados y puntos sintéticos DEMO.                                                                                                     | USC, PO                |
| Pendiente de entorno      | Expo Go SDK 54 físico, teselas con licencia/atribución validadas e instancia OSRM con extracto de Cali.                                                                                                                                                        | Recorrido y QA         |
