# RuTeam

RuTeam permite a estudiantes vigentes de la Universidad Santiago de Cali compartir
viajes que un estudiante conductor ya prevé realizar. El conductor publica sus condiciones
y recorrido; los pasajeros descubren viajes y confirman directamente su participación
si cumplen las reglas y hay plazas. Modalidades: **DESDE_USC** y **HACIA_USC**.
Los viajes entre dos extremos externos quedan excluidos.

Una identidad estudiantil reúne capacidades de pasajero y conductor. El producto no
incluye administración ni aprobación ordinaria de participantes. Una propuesta adicional
de recogida sólo en HACIA_USC la decide el propietario; no confirma participación.
Encuentros interiores aceptan texto libre; los mapas no requieren coordenadas manuales.

Consultar la [definición vigente](docs/requirements/PRODUCT_DEFINITION.md) antes de cambiar
negocio. La redefinición del 25/11/2026 corrige una base existente, con adaptación en curso:
este README describe el producto acordado y no certifica que todos sus flujos estén listos.
[PROGRESS](docs/development/PROGRESS.md), [trazabilidad](docs/requirements/TRACEABILITY.md)
y [evidencias](docs/demo/EVIDENCE.md) registran implementación, pruebas y límites reales.

## Arquitectura

Monorepo TypeScript strict: backend NestJS MVC modular + Prisma 7/PostgreSQL;
frontend única app React Native/Web Expo Router SDK 54; packages/contracts compartidos.
Nest autoriza y aplica invariantes; React presenta e interactúa. Sesiones revocables,
cookie HttpOnly web y SecureStore nativo. [Estructura](docs/architecture/REPOSITORY_STRUCTURE.md).

## Desarrollo local

Desde la raíz con package.json: Node 22.12–22.x, npm 10+ y PostgreSQL 17/18 o Compose.
Leer [SETUP](docs/development/SETUP.md) antes de iniciar o migrar una base existente.

```bash
npm ci
test -f .env || cp .env.example .env
# Ajustar URLs e iniciar la BD autorizada. Para fixtures locales, en .env:
# NODE_ENV=development, DEMO_MODE=true, VERIFICATION_PROVIDER=demo.
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
# En otra terminal, elegir uno:
npm run dev:web
# npm run dev:client
```

Web localhost:8081; API localhost:3000/api/v1; health y docs bajo esa API.
En el computador principal se documentó PostgreSQL persistente en55432: comprobar
entorno efectivo, no sustituirlo por5432 automáticamente ni reinicializar datos.
En teléfono usar IP LAN alcanzable y versión Expo Go compatible, nunca localhost del PC.

## Entornos e integraciones

La plantilla .env.example trae DEMO_MODE=false y proveedor official: el acceso queda
bloqueado hasta disponer de integración legítima. Para fixtures locales, optar
explícitamente por development + DEMO_MODE=true + VERIFICATION_PROVIDER=demo antes
de seed/test:setup y reiniciar los servicios. El acceso sintético queda limitado
a desarrollo/tests por DEMO_MODE y proveedor demo,
con datos controlados; no es identidad institucional ni acceso alternativo a producción.
No usar cuentas administrativas o estamentos no estudiantiles como usuarios válidos.
La acreditación real de matrícula necesita una fuente USC autorizada. Verificar dominio
o control del correo no la sustituye: producción debe fallar cerrada mientras falte.
Verificación documental autorizada, geocodificación, motor vial y teselas requieren
configuración y validación explícitas. No hay servicios de pago obligatorios.

Chat, calificaciones, abordaje, compensaciones y seguridad mantienen su lugar en el
producto; consultar su estado efectivo antes de demostrarlos. No se prometen pagos,
QR institucional, respuesta de emergencia ni prueba física por existir una pantalla.

## Validación y equipo

```bash
npm run db:test:setup
npm run typecheck
npm run lint
npm run format:check
npm test
# Tras finalizar Jest:
npm run test:e2e
npm run build:api
npm run build:web
npx expo-doctor frontend
```

[TEST_PLAN](docs/development/TEST_PLAN.md): PostgreSQL_test real y suites secuenciales.
No inferir resultados del corte actual desde conteos anteriores. Expo Go físico requiere
prueba propia. [Guion académico](docs/demo/DEMO_SCRIPT.md) demuestra sólo lo acreditado.

Leer [AGENTS](AGENTS.md), [CONTRIBUTING](CONTRIBUTING.md), coordinación y handoff antes
de editar. Git task/*→feature→dev→main; sin commit/push/PR/merge automáticos.
Seis frentes sin asignaciones nominales inventadas; entrega 28/11/2026 y
[sprints≤2d del 21–28](docs/development/SPRINTS.md).
Los [antecedentes](docs/history/2026-11-24-guides.md) y handoffs conservan los cortes
anteriores; sus administradores, solicitudes y fechas de estado no son instrucciones vigentes.
Originales académicos privados nunca se versionan con PII.
