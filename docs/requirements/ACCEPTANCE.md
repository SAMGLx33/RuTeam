# Aceptación primer hito

Given PostgreSQL migrado/seed y DEMO_MODE=true, when Ana/Diego inician sesión,
then Nest persiste sesión y devuelve perfil consultable desde auth/me.
Given Laura INACTIVE, when intenta login, then403, sin crear sesión y con intento auditable.
Given sesión activa, when administrador cambia afiliación a INACTIVE o vence,
then siguiente petición protegida403. When logout/expira, then401.
Given cliente web, when guarda nombre y recarga, then se conserva por PostgreSQL;
campos role/membership extra se rechazan400. Dos contextos no comparten identidad.
Given modo demo false, when login sintético, then404.

Hito no se declara completo hasta confirmar Expo Go físico y referencias faltantes.
Exportar bundles y Doctor no equivale a probar un teléfono. Prueba UI en viewport
móvil representa web, no cámara/GPS/SecureStore de dispositivo.
