# ADR0001 — Fundación local y sesiones demo

Estado: adoptada para corte académico reversible, 2026-11-13; no validación institucional.
Prompt exige stack fijo y ejecución. Se descartan frontend paralelo y login basado
sólo en email porque no acreditan pertenencia activa. Adapter demo consulta membresía
BD con estado y vigencia, guard la vuelve a verificar en cada acceso.

Sesiones opacas con crypto.randomBytes32, SHA256 en BD, expiración y revocación.
No se usan contraseñas en login sintético; si se incorporan, Argon2id salado y nunca
AES reversible (corrección explícita al texto atribuido a ERS; cotejo pendiente).
Web HttpOnly SameSite Strict; móvil SecureStore. Cabecera no simple y Origin allowlist
protegen mutaciones web. HTTP LAN/secure=false es una excepción demo, no seguridad
productiva. Login de cualquier identidad sintética es públicamente accesible en demo:
no exponer esta instancia ni cargar PII. Modo demo prohibido con NODE_ENV production.

Prisma7.10.1 fijado con prisma.config.ts y generator prisma-client ESM, adapter-pg,
output ignorado. Fuente consultada: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
SDK54/React19.1/RN0.81.5 verificados con expo install --fix y expo-doctor.
https://docs.expo.dev/versions/v54.0.0/ (puede redirigir a versión actual; prevalece
la matriz instalada SDK54). No actualizar a SDK más nuevo para resolver auditoría
sin acreditar Expo Go físico. Consecuencia: test físico sigue pendiente.

Revisión: logout verifica token/sesión pero permite revocación propia tras baja de afiliación;
no permite consultar perfil ni catálogo. Prueba HTTP de regresión403→204; guard de datos
sigue exigiendo ACTIVE. Playwright también valida URL de test distinta con sufijo _test.
