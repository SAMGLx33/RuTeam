# Backend — reglas vigentes

Leer ../AGENTS.md, PRODUCT_DEFINITION, API, ownership y último handoff.
Nest MVC modular: controllers reciben HTTP/DTO/actor, application coordina casos
transaccionales, domain conserva reglas puras e infrastructure/repositories usa Prisma.
No Prisma en controllers de negocio ni reglas críticas en React o contratos.

Sólo estudiante vigente; verificar estamento y vigencia al autorizar cada operación
protegida. Fuente real falla cerrada sin acreditación autorizada. Revocación de la propia
sesión debe funcionar tras baja de afiliación sin abrir datos protegidos. No permisos
ADMIN operativos ni aprobación administrativa de vehículos; preservar auditoría antigua
sin habilitar sus cuentas ni convertir docentes/trabajadores en estudiantes.

Vehículos/documentos por autogestión del propietario: formato, capacidad, titularidad,
licencia/SOAT y vigencia no se confunden con verificación externa. Separar lo declarado,
lo aportado y lo acreditado por fuente autorizada. Producción no usa fixtures como prueba.

Viajes: DESDE_USC/HACIA_USC con campus por FK o identidad institucional equivalente,
un extremo USC y otro externo. Texto del encuentro interior válido sin GPS propio.
Itinerario publicado inmutable; paso y parada autorizada distintos. Matching de lectura
no cambia ruta ni confirma recogidas cercanas. No compatibilidad basada sólo en cadenas.

Confirmación ordinaria directa: estudiante, reloj/estado, vehículo/documentos,
propiedad, duplicados, par de paradas y capacidad se validan dentro de la transacción.
Conservar orden de locks conductor→viaje de la base existente. Ocupación y estados
atómicos; idempotencia y último cupo probados sobre PostgreSQL real. Retiro permitido
libera plazas y conserva filas; viaje lleno no equivale a iniciado. Grupo sólo con
consentimiento de cada estudiante, sin UUID como invitación ni retención indefinida.

Propuesta de recogida separada de participación, sólo HACIA_USC; propietario acepta
punto compatible sin alterar geometría/condiciones ni ocupar plazas. Revalidar estado,
orden y duplicados bajo lock. Abordaje requiere confirmación y no descuenta dos veces.

Prisma 7.10.1 actual: prisma.config.ts, generator prisma-client ESM, output ignorado
src/generated/prisma y adapter-pg. No cambiar versiones sin evaluar impacto.
Migraciones nuevas revisadas centralmente; preservar FKs, geometrías, revisores y
reservas históricas. No convertir PENDING antiguas en confirmaciones. No reset/drop.
Tests en BD distinta _test; Jest y Playwright secuenciales. Nunca tocar otra aplicación.

ValidationPipe whitelist estricto, límites, Origin/cabecera, CORS y errores sin secretos.
Sesiones opacas hasheadas, expiración y revocación. No fuentes externas inventadas ni
endpoints de éxito ficticio. Verificar generate/test:setup/typecheck/lint/test y los
checks aplicables; actualizar API, TRACEABILITY, PROGRESS y handoff nuevo en cada avance.
Schema/seed/migraciones/app.module/contratos/lockfile requieren un único integrador.
