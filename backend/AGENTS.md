# Backend — reglas vigentes

Leer ../AGENTS.md, PRODUCT_DEFINITION, API, ownership y último handoff.
Nest MVC modular: controllers reciben HTTP/DTO/actor, application coordina casos
transaccionales, domain conserva reglas puras e infrastructure/repositories usa Prisma.
No Prisma en controllers de negocio ni reglas críticas en React o contratos.

Separar guard de sesión de cuenta de guard de estudiante vigente. Registro/login,
perfil básico/verificación/logout expresamente permitidos no acreditan correo o matrícula.
Operaciones de viajes/feed/movilidad requieren correo comprobado, estamento y vigencia;
preferir conducir no concede capacidad. Revisar AUTHORIZATION_MATRIX para propietario y
transición. Nueva autenticación con contraseña propia RuTeam y scrypt con sal/parámetros
versionados, jamás password USC. Tokens de correo/recuperación impredecibles, hasheados,
expirables, uso único/intentos limitados; no enumeración/rate limit y revocación por cambio
de credenciales conforme al caso de uso. Proveedores SMTP/eligibilidad aislados, sin
login por nombre de fixture como alternativa normal ni habilitación en producción.
Onboarding/prefencia de uso persisten y se retoman sin asignar permisos desde cliente.
Fuente real falla cerrada sin acreditación autorizada. Revocación de la propia
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

## Preferencias, feed y efectos de publicación

Leer PRODUCT_DEFINITION, BUSINESS_RULES, AUTHORIZATION_MATRIX y RECOMMENDATION_FLOW.
Preferencias privadas y activas pueden ser múltiples; no domicilio exacto obligatorio ni
solicitud pública. Matching permanente prefiltra en PostgreSQL y distingue compatible,
potencial HACIA_USC y no compatible sin cambiar geometría/reservar. Feed actual y general
funcionan sin búsqueda obligatoria o preferencias configuradas. Notificaciones internas
persistentes por destinatario, con deduplicación/lectura y deep link autorizado. No push
por tener bandeja; no eventos sólo en memoria si deben sobrevivir reinicio. Trabajos
persistentes/reintentos/límites e índices se verifican antes de declarar ese flujo terminado.
Separar cuentas, viajes, preferencias y notificaciones en casos de uso coherentes, sin
servicio gigante ni nuevas tablas por cada concepto. Migraciones aditivas preservan
usuarios y verificaciones sintéticas sin convertirlas en cuentas acreditadas reales.

Geocodificación y OSRM son adaptadores configurables. Mantener los tiempos firmados
y persistidos, separados de las marcas reales de inicio, llegada, abordaje y cierre.
Chat aplica autorización y cursor de lectura en su dominio. Enviar, reintentar,
retirar una participación y cerrar conservan el orden de locks conductor → viaje.

## Consolidación

Ratings, Groups, Expenses y Safety conservan MVC modular. Reutilizar la
transacción de Participaciones y el orden conductor → viaje donde corresponda.
El promedio se deriva de las filas por capacidad histórica. Una invitación
consentida sólo crea reservas al confirmar en bloque. QR y abordaje manual
comparten política. La posición publicada es voluntaria, efímera y por recurso.
La estimación de COP es privada y guarda unidades enteras.

En el cierre del 26/11, Nest recalcula el aporte exacto al publicar y separa
gastos privados de condiciones públicas. Las mutaciones de compensación y
seguridad sensibles usan autorización por recurso. El evento de dominio y su
aviso interno comparten transacción. Conservar el índice por destinatario,
viaje, tipo y clave de evento y la agregación por conversación para chat.
Consultar [reglas de cierre](../docs/development/API.md#cierre-funcional-de-economía-y-seguridad).

## Continuidad del producto

Trips orquesta la publicación de ocurrencias y del viaje manual en la misma unidad de publicación. Adquiere el bloqueo de participación antes de los bloqueos de viajes cuando una operación de cuenta afecta cupos. Usa la unidad de Reservations para cerrar viajes y avisar a afectados. Mobility y Expenses proyectan sus historiales desde PostgreSQL. Safety limita el historial y el resumen de cada incidencia al autor. Consulta [modelo](../docs/architecture/DATA_MODEL.md) y [contratos](../docs/development/API.md).

## Evolución ambiental y comunicación

Las funciones de emisiones viven en Mobility/domain. Publicar congela el factor y cerrar registra el reparto en la misma transacción. Preserva las 24 migraciones de continuidad y las nuevas migraciones aditivas. Para tiempo real, los triggers emiten claves mínimas y Nest revisa sesión y recurso. Los recibos del proveedor push se distinguen de tickets y de la recepción física.
