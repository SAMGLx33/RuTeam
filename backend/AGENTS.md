# Backend

Leer primero ../AGENTS.md y coordinación. MVC por módulo: controllers traducen
HTTP/DTO, application orquesta, domain contiene reglas puras, infrastructure/repositories
persiste. Configuración validada, ValidationPipe whitelist estricto, guard de sesión
con verificación institucional en cada petición. No exponer hashes ni tokens en logs.

Prisma 7.10.1: prisma.config.ts, generator prisma-client, output src/generated/prisma,
adapter-pg. No versionar generated. Migraciones incrementales y seed sintético
idempotente, sin borrar datos existentes. Schema/migraciones requieren revisión del
integrador de datos (POR_ASIGNAR). No conectar tests a desarrollo: TEST_DATABASE_URL
con sufijo _test. Al implementar reservas, escribir prueba simultánea de último cupo
con PostgreSQL real antes de declarar completitud. No sustituirla por mocks.

Verificar npm run db:generate, db:test:setup, typecheck, lint, test y actualizar
API.md, TRACEABILITY, decisiones/handoff/PROGRESS. No agregar endpoints de éxito falso.

## Vehículos y publicación

VehiculoController/Service/Repository y ViajeController/Service/Repository siguen MVC.
Reglas puras VehiculoPolicy/Viaje; DomainPolicyError se traduce a400 en filtro.
ViajeRepository expone unidad de publicación sin cliente Prisma a pantallas; aplicación
orquesta permisos/documentos/catálogo/intervalos dentro de withDriverLock. Lecturas de
User/Vehicle/Campus en esa unidad son la vista del agregado transaccional, no escrituras
en módulos ajenos. SELECT FOR UPDATE parametrizado sobre conductor serializa publicación
y cambios de documentos; no mover verificación fuera de la transacción.
Revisión admin lleva revision, compara dentro del bloqueo y devuelve409 si quedó obsoleta.
Nunca aprobar una presentación nueva desde una tarjeta vieja. Nuevas licencias revocan
aprobación al volver a PENDING. Vigencia se exige hasta expectedEndAt del viaje DEMO.
Cupos/estado/actor no se reciben del cliente como campos autoritativos. Reservas posteriores
necesitan su propia prueba de último cupo; prueba de solapamiento no la sustituye.

## Estructura obligatoria y responsabilidades

Este workspace es el antiguo apps/api completo; preservar sus sufijos internos. Leer
AGENTS raíz, este documento, ownership/estado/handoff antes de modificar; probar y
actualizar contrato, evidencia, PROGRESS y un handoff nuevo después de CADA avance,
incluso parcial o fallido. Los agentes de los seis integrantes siguen la misma regla.

- backend/src/modules/<módulo>/controllers recibe HTTP/DTO e identidad y delega a application.
- application coordina casos de uso, dominio e interfaces de persistencia existentes.
- domain/models, domain/policies y sus archivos actuales contienen las invariantes; no HTTP,
  React o consultas Prisma arbitrarias. Preservar también ubicaciones heredadas documentadas.
- infrastructure/repositories persiste con Prisma. No saltar application desde controllers.
- backend/src/common contiene sólo capacidades transversales; no volcar aquí los módulos.
- Vista visual: frontend React/Expo; Nest responde JSON/contratos de packages/contracts.
  No agregar backend/views, backend/src/backend/api/mvc ni capas globales alternativas.

Ejemplo FUTURO aprobado: nuevo DTO en src/modules/trips/dto, política en el domain del
módulo y repositorio en su infrastructure/repositories. No crear código para cumplir
un árbol idealizado. Este traslado conserva incluso carpetas futuras con .gitkeep.
No cambia SQL, schema, contratos o reglas de negocio; reservas son otra tarea no iniciada.
Scripts usan ../.env y ../node_modules desde backend. Integrador de datos POR_ASIGNAR.
Ver docs/architecture/REPOSITORY_STRUCTURE.md y review del refactor para excepciones.
