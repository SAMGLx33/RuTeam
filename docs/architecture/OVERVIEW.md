# Arquitectura del primer corte

App única React Native/Web con Expo Router SDK54 → REST NestJS /api/v1 →
servicios de aplicación → repositorios Prisma7/adapter-pg → PostgreSQL local.
React sólo muestra/interactúa. TypeScript strict. Monolito modular, sin cloud.

AuthModule emite sesiones opacas demo, SessionGuard autoriza cada petición a través
de InstitutionalVerificationProvider; InfrastructureModule global proporciona Prisma,
config validada y adapter demo u oficial que falla cerrado. ProfilesModule permite
únicamente editar nombre propio; CampusModule lista destinos activos USC. Health
comprueba realmente SELECT 1. Swagger generado en /api/v1/docs.

Web usa cookie HttpOnly SameSite=Strict; móvil token en SecureStore. Tokens almacenados
como SHA256 en BD, caducan en ≤1h y se revocan por logout. No hay registro libre ni
contraseñas en este corte. Login sintético sólo DEMO_MODE true y nunca producción.
CORS allowlist, cabecera mutante y Origin obligatorio cuando existe, throttling,
helmet, DTO whitelist, payload32kb, errores sin detalles DB/PII.

Socket.IO, routing/mapas, matching, QR de abordaje, pagos manuales y reservas todavía
no están implementados. Sus directorios contienen .gitkeep, no controladores falsos.
No hay API USC. Adaptadores futuros deben respetar las invariantes del prompt maestro.
