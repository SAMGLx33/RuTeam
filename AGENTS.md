# RuTeam — instrucciones permanentes

Leer antes de cambiar reglas: [definición vigente](docs/requirements/PRODUCT_DEFINITION.md),
AGENTS del módulo, CONTRIBUTING, docs/architecture/REPOSITORY_STRUCTURE.md,
coordinación CURRENT_STATUS/WORKSTREAMS/MODULE_OWNERSHIP, PROGRESS, trazabilidad,
UML derivado y handoff reciente. Inspeccionar rama, commit y árbol de trabajo.
La definición funcional del 25 de noviembre de 2026 prevalece sobre interpretaciones
anteriores incompatibles; los RF/RNF y HU originales conservan sus identificadores.

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
