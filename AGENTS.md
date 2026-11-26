# RuTeam — instrucciones permanentes

Leer antes de cambiar reglas: [definición vigente](docs/requirements/PRODUCT_DEFINITION.md),
AGENTS del módulo, CONTRIBUTING, docs/architecture/REPOSITORY_STRUCTURE.md,
coordinación CURRENT_STATUS/WORKSTREAMS/MODULE_OWNERSHIP, PROGRESS, trazabilidad,
UML derivado y handoff reciente. Inspeccionar rama, commit y árbol de trabajo.
La definición funcional del 25 de noviembre de 2026, ampliada por la transformación
integral A–G, prevalece sobre interpretaciones
anteriores incompatibles; los RF/RNF y HU originales conservan sus identificadores.

## Transformación integral: cuenta, capacidades y experiencia

RuTeam es un producto integrado. Leer [permisos](docs/architecture/AUTHORIZATION_MATRIX.md),
[navegación](docs/architecture/FRONTEND_NAVIGATION.md),
[flujos](docs/requirements/USER_FLOWS.md), [reglas](docs/requirements/BUSINESS_RULES.md)
y [recomendaciones](docs/architecture/RECOMMENDATION_FLOW.md) antes de cada incremento.
Estos documentos distinguen diseño y evidencia; no suponen que lo nuevo ya funciona.

Login/registro normales con correo y contraseña PROPIA de RuTeam, hash scrypt salado y
parámetros justificados/versionados, verificación de correo y recuperación seguras.
Jamás contraseñas USC ni selector de identidades/botón desarrollo como acceso normal.
Cuentas de prueba atraviesan ese mismo formulario y sesión; proveedores de correo/eligibilidad
sintéticos sólo en entornos aislados y nunca activables en producción.

Distinguir sesión de cuenta, control del correo, estamento/matrícula, preferencia de uso y
capacidad efectiva. Cuenta pendiente puede gestionar sólo cuenta/verificación/onboarding
básico expresamente permitidos, sin viajes. Elegir conductor no habilita publicación.
Onboarding persistido/retomable; pasajero puede iniciar habilitación desde Perfil.
Conducción documental vencida conserva pasajero si matrícula vigente, no publicar/START.

Navegación según capacidades actuales del servidor, con inicio útil, feed y perfil separado;
API protege también URL directa/IDs ajenos/capacidad desactualizada. Movilidad privada no
es solicitud de transporte. Matching recomienda automáticamente viajes publicados;
feed general existe aun sin preferencias. Recomendaciones/avisos internos persistentes
y deduplicados no ocupan plazas ni implican push/tiempo real. Sin datos o integración,
mostrar estado honesto; nunca controles de éxito falso. Modelo/HTTP/UX/persistencia y
recorrido E2E/visual son parte del DoD, no basta endpoint o prueba aislada.

## Producto y autoridad

- Sólo estudiantes USC con vigencia acreditada. Una identidad con capacidades compatibles
  de pasajero y conductor; Nest decide la elegibilidad. Ningún rol, acceso, panel,
  endpoint, seed o flujo funcional de administración. La operación técnica de infraestructura
  es distinta. Preservar auditoría histórica sin convertir usuarios antiguos en estudiantes.
- Control de correo, autenticación, estamento, matrícula y permiso para conducir son
  comprobaciones distintas. Correo @usc.edu.co, foto o QR no acreditan vigencia.
  Fuente institucional autorizada bloqueada mientras no exista acceso legítimo; producción
  falla cerrada. No scraping ni almacenamiento de contraseñas institucionales.
- El conductor publica un desplazamiento previsto y fija ruta, fecha, vehículo,
  plazas de pasajeros, paradas y condiciones. DESDE_USC parte de campus USC;
  HACIA_USC termina allí. Dos extremos externos se rechazan aunque haya USC intermedia.
  Validar campus con identidad institucional, nunca sólo con nombres de texto.
- Buscar descubre viajes; no crea solicitudes de transporte ni cambia el recorrido.
  Una confirmación ordinaria válida ocupa plaza directamente, sin aprobación del conductor.
  Sin duplicados ni participación en viaje propio. Cupos por viaje completo: auto≤4,
  moto≤1; concurrencia e idempotencia en PostgreSQL real, también frente a cancelaciones.
- Propuestas de recogida sólo HACIA_USC y sobre recorrido compatible. Decide el conductor
  propietario. Aceptarlas no cambia geometría, no reserva y no confirma participación.
- Encuentro libre por texto, incluido interior/piso/sótano, vinculado al campus.
  Ubicación general aproximada y punto exacto son distintos. No exigir coordenadas
  propias al encuentro interior ni inventarlas. UI sin latitud/longitud/GeoJSON/UUID manuales.
- Grupos requieren identidad y consentimiento explícito de cada integrante; un lote
  conjunto es atómico. Invitaciones temporales pendientes no retienen plazas.
  Priorizar confirmación individual segura mientras no exista ese mecanismo.
- Estado del viaje, disponibilidad, participación y abordaje son distintos. Abordar
  requiere participación confirmada y no consume otra plaza. Cancelar conserva historial;
  retiro futuro permitido libera plazas. Sin cambios esenciales silenciosos ni multas.
- Conservar vehículos, chat, calificaciones, seguridad y compensaciones compatibles.
  Autogestión documental no equivale a verificación oficial. No inventar RUNT, USC,
  pagos, reputación, despacho SOS o resultados de pruebas.

## Arquitectura y continuidad

TypeScript strict, monolito modular MVC Nest, Prisma 7/adapter-pg/PostgreSQL y una
app Expo Router SDK 54 React Native/Web. React presenta; controllers traducen HTTP;
application orquesta; domain conserva invariantes; repositorios persisten.
Contratos en packages/contracts y API.md, nunca Prisma en React. No frontend paralelo,
capas MVC globales ni reorganizaciones por preferencia. .web/.native sólo cuando se requieren.

Sesiones revocables con expiración, cookie HttpOnly web y SecureStore móvil; proteger
Origin/CSRF/CORS, límites y autorización por recurso. Fixtures/proveedores sintéticos
exclusivos de desarrollo y tests aislados; no constituyen acceso alternativo a producción.
No PII real, documentos, originales privados, secretos, tokens ni dumps en Git.

Antes de tocar schema, migraciones, contratos, lockfile o app.module coordinar un único
integrador. Migraciones incrementales, sin modificar aplicadas, resets, drops ni borrado
indiscriminado. Preservar geometrías y FKs históricas; no promover pendientes antiguas
silenciosamente a confirmadas. TEST_DATABASE_URL independiente terminada en _test;
suites que escriben en la misma BD se ejecutan secuencialmente. No tocar bases de PULSO.

Git: task/* → feature → dev → main. Reutilizar task activa pertinente, sin feature/*.
No stage/commit/push/PR/merge sin autorización; prohibidos reset --hard, clean -fd,
branch -D y force push. Respetar cambios ajenos. Dueños humanos POR_ASIGNAR.
CURRENT_STATUS sólo cambia por integrador; avances locales no son integración.

Cada incremento exige código/pruebas reales, contrato, trazabilidad, decisiones,
PROGRESS y handoff NUEVO, aunque falle o sea parcial. Estados: implementado y verificado,
parcial, pendiente, bloqueado externo o aceptación PO pendiente. No inferir cobertura por
actualizar docs ni prueba física por export/viewport. Fecha académica: 28/11/2026;
sprints≤2 días, sin ceremonias ni responsables inventados. Consultar SPRINTS.

Originales privados localizables en docs/RuTeam_Referencias_Codex_PRIVADO; ignorados.
Leer sólo por canal local autorizado; no versionar originales ni conversiones con PII.
Los cotejos históricos 50 RF/RNF y 36 pestañas permanecen en ERS_CATALOG/UML_CROSSWALK.
RF-001 sigue sin prioridad unívoca. Guías previas conservadas como
[historia](docs/history/2026-11-24-guides.md), junto con reviews/handoffs fechados.

## Continuidad operativa

Mantener sede institucional y campus en IDs verificables del catálogo. No atribuir
coordenadas a una sede sólo porque exista su dirección publicada. Geocodificar
consultas explícitas con el proveedor autorizado. Las alternativas viales firmadas
vinculan geometría y tiempos de tramos. La coincidencia intermedia usa la hora de
recogida acreditada por esa ruta, incluso al cambiar de día.

Registrar llegadas en orden y abordajes en la parada vigente. Mantener la operación
segura de cierre bajo propiedad y sesión válida. Chat de coordinación limitado a
participantes autorizados, histórico de 24 h para quienes viajaron, idempotencia
y avisos internos sobre la misma infraestructura. Consultar la documentación de
continuidad para límites y comprobaciones.

## Consolidación funcional

RF-010 usa enteros de 1 a 5 y media aritmética independiente por capacidad.
Califica sólo el par conductor ↔ pasajero que abordó en un viaje completado.
El comentario queda con su autor. Grupos invitan con código opaco vencible
y sólo el lote completo ocupa plazas. QR RuTeam complementa el registro manual.
La ubicación voluntaria se limita al conductor activo y su última muestra.
Costos privados en COP son una estimación. Para reglas de reparto, incidencias,
fuente USC y promoción consulta las decisiones y el handoff.
