# Decisiones vigentes y bloqueos

Actualización 26/11/2026. PRODUCT_DEFINITION rige el dominio; responsables humanos
POR_ASIGNAR salvo autoridad explícita del encargo. Cerrar una decisión funcional no
significa que la implementación, migración o pruebas estén completas.
Las tablas del 13/24 se conservan en [historia](../history/2026-11-24-guides.md).

## Resueltas por la redefinición

| Tema / antecedente                  | Decisión vigente                                                                                                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso y roles; RF-002/017          | Sólo estudiantes vigentes, una identidad, pasajero/conductor como capacidades compatibles. Sin ADMIN de producto, login/panel/endpoints/revisiones/seed administrativos                                                                                                       |
| Autoridad y vínculo USC; RF-003/029 | Conductor fija el desplazamiento. DESDE_USC o HACIA_USC, con USC como extremo institucional. Externo→externo prohibido incluso pasando por campus. Ya no requiere ratificación de PO                                                                                          |
| Participación; RF-006               | Confirmación ordinaria directa con cupos transaccionales; conductor no aprueba cada confirmación. Buscar no crea viajes ni solicitudes de transporte                                                                                                                          |
| Propuestas                          | Sólo recogida HACIA_USC, decisión separada del propietario, compatible con geometría/condiciones. Aceptación no ocupa plaza ni confirma                                                                                                                                       |
| Encuentro/mapas; RF-018/029         | Texto libre interior válido sin coordenada propia; campus por identidad institucional y mapa aproximado rotulado. Sin coordenadas/GeoJSON/UUID manuales en UI                                                                                                                 |
| Grupos y D24 histórico              | Consentimiento individual explícito y lote atómico. No UUID compartido como invitación; invitaciones pendientes sin retención indefinida. Confirmación por el organizador tras el consentimiento de todos y el control de cupos. Cada integrante conserva su plaza individual |
| Retiro/cambios                      | Retiro futuro válido libera plazas e historial persiste. Condiciones esenciales no cambian silenciosamente; cancelar y republicar es opción conservadora mientras no exista consentimiento de cambios                                                                         |
| D16 revisión documental             | Aprobación ADMIN queda retirada. Autogestión con distinción declarado/aportado/formato/vigencia/verificación legítima; historia de revisores se preserva sin dar permisos                                                                                                     |
| D01 acceso a originales             | ERS .doc, rúbrica .pdf y UML de 36 pestañas pestañas accesibles localmente25/11; hashes coinciden con cotejo. No equivale a originales actualizados o aprobados. Product Backlog/actas originales no localizados                                                              |

## Permanecen abiertos o bloqueados

| ID / tema                   | Condición para resolver / comportamiento actual seguro                                                                                                                             | Responsable requerido     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| D02 identidad institucional | Conseguir fuente USC autorizada que acredite estudiante/vigencia, contrato y política de actualización/revocación. Correo/control/QR no bastan; producción falla cerrada           | USC, Identidad, PO        |
| Verificación conductor      | Fuente legítima documental y política de elegibilidad real sin ADMIN. Declaraciones y fechas no son acreditación oficial; bloquear operaciones reales que requieran fuente ausente | Viajes, Identidad, PO     |
| D03 catálogo                | Campus/entradas/ubicaciones certificados; catálogo sintético no acredita inventario ni precisión. Mantener FK/campus y texto libre sin inventar lugares oficiales                  | USC, Viajes, PO           |
| D04 moto/género             | Validación jurídica/consentimiento sobre RF-021/025; no activar discriminación automática por aparecer en fuentes                                                                  | PO/asesoría institucional |
| D05 penalidades             | Resolver contradicción >30/<30 de RF-007 y fuerza mayor/soporte RF-028. Sin multas, deudas o cobros automáticos                                                                    | PO                        |
| D06 costos                  | Ratificar fórmula RF-008 por cupos frente a propuesta por tramos y tratamiento de participantes/abordaje/cancelación; sin cambiar fórmula aprobada ni inventar tarifa plana        | PO, Economía              |
| D07/D08 plataforma          | Excepción iOS14 frente a SDK 54/iOS15.1+, dispositivo/versión Expo Go y red real; medir en hardware                                                                                | QA, PO                    |
| D11 dependencias            | Auditoría vigente por paquete y fixes compatibles; no inferir resolución desde conteos históricos ni aplicar force                                                                 | Integrador, QA            |
| D12 privacidad/soporte      | Retención, consentimiento, cifrado, eliminación/anonimización, backups y canal legítimo de incidentes sin ADMIN. No recopilar PII real para una demo                               | Equipo, PO/asesoría       |
| D13 prioridad RF-001        | Ausente en matriz original; no derivar prioridad desde totales. Mantener no unívoca                                                                                                | PO                        |
| Proveedor cartográfico      | Instancia/perfil/extracto de Cali, licencias/atribución/límites y calibración. Geocodificación, precisión y ETA por parada requieren validación propia                             | Recorrido, QA             |
| Cancelaciones detalladas    | Plazos, ausencias, comunicación y nueva confirmación ante cambios esenciales, sin inventar sanciones                                                                               | PO, Viajes/Reservas       |
| Plan/aceptación/integración | Backlog/actas21–23 no disponibles; fuentes académicas revisables y aceptación humana pendientes. Git no se promociona automáticamente                                              | Equipo, integrador, PO    |

Documentación pública USC inspeccionada por el integrador:
[servicios tecnológicos](https://www.usc.edu.co/gestion-tecnologica/servicios/) y
[Registro y Control Académico](https://www.usc.edu.co/registro-y-control-academico/).
El correo institucional incluye otros colectivos y Registro custodia información académica.
No se acreditó en esas fuentes un contrato de API/federación autorizado consumible por RuTeam;
es una limitación de la evidencia revisada, no una afirmación de inexistencia de servicios.
No inventar endpoints ni usar scraping privado. El acceso original privado y las
[ediciones académicas](../requirements/ACADEMIC_REDEFINITION_CHANGES.md) no sustituyen ese convenio.

## Transformación integral A–G: cuentas y experiencia

Decisiones nuevas del encargo posterior del 25/11, sin declarar ejecución terminada:

- Autenticación primaria mediante contraseña propia de RuTeam y hash scrypt salado con
  parámetros/versionado justificados; verificación de correo separada de matrícula.
  Ver [ADR0004](../architecture/ADRs/0004-own-accounts-and-capabilities.md).
- Cuenta/sesión autenticada limitada puede existir pendiente de elegibilidad. No usar
  el bloqueo USC para conservar sólo selector de fixtures ni para abrir acceso a viajes.
- Preferencia pasajero/conductor y pasajero no concede capacidad. Onboarding persiste;
  navegación según permiso efectivo, feed útil y perfil separado del inicio.
- Movilidad privada permite recomendaciones automáticas de viajes existentes y avisos
  internos persistentes; no solicitudes, reservas, push o tiempo real por esa sola función.

Permanecen por ejecutar/verificar: parámetros de credenciales, entrega SMTP real y
recuperación, fuente académica autorizada, migraciones/cuentas heredadas, capacidades,
recorridos E2E/visuales y recomendaciones/avisos tras reinicio. Fuente externa ausente
no impide implementar cuentas/onboarding internos. Los cinco documentos de permisos,
navegación, flujos, reglas y recomendaciones explican requisitos; evidencia del nuevo
corte todavía se consolida por el integrador. CURRENT_STATUS no cambia por esta decisión.

## Continuidad, 26/11/2026

- Proveedor operativo autorizado para teselas, geocodificación y rutas. Los ensayos
  públicos son puntuales y las coordenadas de embarque necesitan revisión local.
- Probar el enlace externo de correo y la vigencia USC con operadores autorizados.
- En el corte de continuidad seguían pendientes la escala y la fórmula de
  RF-010. La consolidación posterior resuelve esa decisión.
- Confirmar retención institucional, operativa de cierre para cuentas completamente
  deshabilitadas y contacto de soporte. El cierre por baja de vigencia está cubierto
  para el titular con sesión válida.

## Decisiones y límites de la consolidación

- **RF-010 resuelto.** El encargo autoriza puntuaciones enteras 1–5 inclusive y
  media aritmética por capacidad. Conductor y pasajero abordado se evalúan en
  ambas direcciones después de finalizar, una vez por pareja y viaje. Se limita
  el comentario opcional a 500 caracteres y a la vista del evaluador. La
  moderación, el plazo de conservación y cualquier política de sanciones quedan
  pendientes de decisión. El detalle técnico queda en el
  [plan RF-010](../development/PLAN_CALIFICACIONES_RF010.md).
- **Grupos.** La creación y el consentimiento no retienen plazas. El código
  opaco vence a las dos horas o antes si llega la salida. El organizador
  completa la confirmación atómica y cada integrante obtiene su propia
  participación. Mantener la validación física y la aceptación del equipo
  separadas de las pruebas locales.
- **D06 sigue abierto.** Existe una estimación privada de combustible, peajes
  y estacionamiento en COP enteros. El equipo debe elegir fórmula, reglas de
  reparto y medios o registros de compensación antes de ofrecerlos al pasajero.
- **Seguridad y seguimiento.** La posición compartida voluntariamente conserva
  un único punto visible durante dos minutos. El panel de seguridad entrega
  acciones al selector y marcador del dispositivo. Permanecen abiertos los
  responsables y tratamiento de incidentes, soporte operativo, contacto
  institucional y retención. Las acciones nativas requieren prueba física.
