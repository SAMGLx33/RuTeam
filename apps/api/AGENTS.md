# Backend

Leer primero ../../AGENTS.md y coordinación. MVC por módulo: controllers traducen
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
