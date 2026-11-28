# Decisiones vigentes y bloqueos

Actualización 26/11/2026. PRODUCT_DEFINITION rige el dominio; responsables humanos
POR_ASIGNAR salvo autoridad explícita del encargo. Cerrar una decisión funcional no
significa que la implementación, migración o pruebas estén completas.
Las tablas del 13/24 se conservan en [historia](../history/2026-11-24-guides.md).

## Resueltas por la redefinición

| Tema / antecedente                  | Decisión vigente                                                                                                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso y roles; RF-002/017          | Acceso académico por dominio declarado; una identidad, pasajero/conductor como capacidades compatibles. Sin ADMIN de producto, login/panel/endpoints/revisiones/seed administrativos                                                                                          |
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
- **D06 resuelto por el encargo de Producto del 26/11/2026.** RF-008 divide el
  total de gastos declarados por plazas ofertadas más conductor, con piso en COP.
  Los costos privados y las condiciones públicas tienen persistencia diferenciada.
  RF-009 ofrece Nequi, DaviPlata y efectivo y admite un registro personal después
  de completar un viaje con abordaje. El [requisito original](../requirements/ERS_CATALOG.md#rf-008)
  queda como antecedente. [Regla y ejemplos](../development/COMPENSACIONES_COP.md).
- **RF-011 e incidencias privadas autorizados.** Se guardan contactos personales y
  registros del propio viaje para su autor, con texto limitado y sin adjuntos.
  El selector y el marcador quedan bajo control del usuario. Permanecen abiertos
  traslado a la USC, responsables, soporte, plazos de conservación y aceptación física.
- **Cierre y grupos.** Los términos publicados y las paradas elegidas se mantienen
  estables. El grupo confirma las mismas condiciones de cada consentimiento.
  Inicio o cancelación cierran invitaciones pendientes y propuestas abiertas.
  El cierre registra ausencias, retira pases y elimina posición. La cancelación
  operativa continúa limitada al viaje programado. Tras confirmar, cada integrante
  retira sólo su participación. Chat sigue con lectura de 24 h para quienes viajaron
  y purga separada. La revisión de privacidad definirá el plazo definitivo.
- **Entrega.** El estado académico y los bloqueos de producción se consultan en
  [preparación de entrega](../reviews/RELEASE_READINESS.md).

## Dependencias para la siguiente entrega

| Decisión                   | Capacidad disponible                                                                                            | Pendiente                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conservación y eliminación | Desactivación, revocación, solicitud, retiro y recuperación.                                                    | Definir plazo, base de conservación y responsables. Revisar eliminación o anonimización de perfil, preferencias, contacto, vehículo y documentos. Evaluar por separado pseudonimización de viajes, reservas, grupos, mensajes, valoraciones, compensaciones e incidencias, integridad de cada vínculo y tratamiento de copias.                                                         |
| Metodología ambiental      | Agregados reales de movilidad y contrato para factor, unidad, vehículo, distancia, ocupación, fuente y versión. | La metodología de operación ya está aplicada. Ampliar factores de transporte público y mezclas cuando exista una fuente pertinente.                                                                                                                                                                                                                                                    |
| Atención de incidencias    | Registro operativo privado y resumen voluntario del autor.                                                      | Canal USC autorizado y política de acceso, conservación y escalación.                                                                                                                                                                                                                                                                                                                  |
| Push remoto                | Bandeja web y móvil en PostgreSQL.                                                                              | Android y iOS requieren development build para push remoto con SDK 54. Configurar credenciales FCM/APNs, registro consentido de dispositivos y pruebas de entrega. Web requiere un mecanismo independiente con Service Worker. [Expo FAQ](https://docs.expo.dev/push-notifications/faq/) · [Configuración de Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/) |
| RF-021 y RF-025            | Permanecen en backlog de Producto.                                                                              | Política autorizada.                                                                                                                                                                                                                                                                                                                                                                   |

### Inventario técnico para conservación

| Datos                            | Relación y tratamiento por decidir                                                                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad, perfil y contacto     | `User` es la referencia de identidad. `Profile`, correo y contactos de emergencia pueden evaluarse para supresión o anonimización. Los contextos históricos siguen necesitando una referencia estable.                 |
| Sesiones, enlaces y preferencias | Auth revoca sesiones y consume enlaces al cerrar. Las rutinas incluyen ubicación privada y deben tener un criterio de supresión propio. Los plazos se definen junto con las copias de datos.                           |
| Vehículo y documentación         | SOAT y licencia forman parte de las condiciones de vigencia. `Trip` referencia el vehículo. Evaluar retiro de datos identificables de documentos y conservación de atributos mínimos de viaje.                         |
| Viajes, participaciones y grupos | El viaje referencia al conductor. Las reservas, sus miembros y los grupos conectan la historia del recorrido y su consentimiento. Evaluar pseudonimización sin cambiar abordajes, cupos históricos ni consentimiento.  |
| Mensajes y calificaciones        | Los mensajes mantienen su ventana operativa. Las calificaciones enlazan al autor, al destinatario y al viaje. La conservación o retirada de identidades requiere una decisión separada de los agregados de reputación. |
| Compensaciones e incidencias     | La compensación referencia la participación. La incidencia contiene una descripción privada y referencia a su autor y viaje. Cada dato exige una finalidad de conservación y una regla de acceso diferenciadas.        |

## Decisiones y dependencias de evolución

La [metodología ambiental](../development/ENVIRONMENTAL_METHOD.md) habilita estimaciones operativas con factores identificados. Transporte público y mezclas sin factor aplicable conservan datos faltantes. La reconexión en tiempo real reconsulta PostgreSQL. La entrega push física depende de development build con integración cliente, credenciales y pruebas. Los controles de bandeja y registro de dispositivos pueden usarse desde la configuración actual. Otras decisiones de Producto conservan su alcance.

## Seguimiento de políticas operativas

El margen temporal operativo se parametriza con
`TRIP_EXPIRATION_GRACE_MINUTES` (30 minutos por omisión, rango 0 a 180). El
cierre operativo por minuto y el límite de demora de tres horas son decisiones
de implementación para revisar con el PO. Las referencias de consentimientos
impiden la edición de condiciones esenciales. El PO conserva la definición de
penalidades, sanciones, restricciones de género y reglas de conservación. La
configuración y recepción efectiva de push requiere un dispositivo físico y un
proyecto autorizado.

El ingreso académico queda decidido. La fuente USC queda pendiente para el
modo oficial. La recuperación sin titularidad comprobada y la validación de
push y navegación en un teléfono permanecen pendientes.
