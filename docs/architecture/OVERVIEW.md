# Arquitectura de RuTeam

App única React Native/Web con Expo Router SDK54 → REST NestJS /api/v1 →
servicios de aplicación → repositorios Prisma7/adapter-pg → PostgreSQL local.
React sólo muestra/interactúa. TypeScript strict. Monolito modular, sin cloud.

AuthModule emite sesiones opacas demo, SessionGuard autoriza cada petición a través
de InstitutionalVerificationProvider; InfrastructureModule global proporciona Prisma,
config validada y adapter demo u oficial que falla cerrado. ProfilesModule permite
editar nombre propio. CampusModule lista referencias y puntos institucionales activos. Health
comprueba realmente SELECT 1. Swagger generado en /api/v1/docs.

Web usa cookie HttpOnly SameSite=Strict; móvil token en SecureStore. Tokens almacenados
como SHA256 en BD, caducan en ≤1h y se revocan por logout. No hay registro libre ni
contraseñas en este corte. Login sintético sólo DEMO_MODE true y nunca producción.
CORS allowlist, cabecera mutante y Origin obligatorio cuando existe, throttling,
helmet, DTO whitelist, payload32kb, errores sin detalles DB/PII.

TripsModule guarda el itinerario definido por el conductor, consulta casos compatibles
y ofrece alternativas viales cuando OSRM está configurado. ReservationsModule controla
solicitud, decisión, capacidad y transiciones con PostgreSQL. Expo representa los
puntos y la geometría publicados. Ver [ADR 0002](ADRs/0002-driver-defined-itineraries.md).

Socket.IO, QR, geolocalización del dispositivo, costos y API oficial USC siguen
pendientes. Los viajes y el acceso institucional se prueban con datos DEMO.
