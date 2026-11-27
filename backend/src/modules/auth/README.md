# Cuentas, correo y autorización

Incremento B del encargo del 25 de noviembre de 2026. Controller traduce HTTP,
AccountService coordina, domain valida correo/credenciales/transiciones y
AuthRepository persiste con Prisma. EmailDelivery es infraestructura SMTP.

Una sesión de cuenta acredita autenticación propia de RuTeam; no prueba matrícula.
AccountSessionGuard permite consultar la propia cuenta y retomar onboarding.
SessionGuard conserva la autorización de producto: correo confirmado, usuario no
deshabilitado, estudiante vigente y proveedor autorizado en cada petición.
Completar onboarding o seleccionar conductor no crea afiliación ni permisos.

## API bajo /api/v1/auth

| Ruta                  | Entrada                                | Respuesta                                                                             |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| POST register         | name, email, password, usagePreference | 202 message + emailDeliveryAvailable, igual para nueva/duplicada                      |
| POST login            | email, password                        | 200 account + expiresAt; token sólo móvil, cookie HttpOnly web                        |
| GET account           | Sesión de cuenta                       | Cuenta propia, correo, onboarding, elegibilidad y capacidades                         |
| PATCH onboarding      | step 0..4, usagePreference?, complete? | Cuenta actualizada; máximo un paso nuevo por petición                                 |
| POST email/request    | email                                  | 202 genérico; 503 si SMTP/enlaces no están configurados                               |
| POST email/confirm    | token, password                        | 200 correo confirmado y contraseña elegida por su dueño                               |
| POST password/request | email                                  | 202 genérico; 503 sin correo configurado                                              |
| POST password/reset   | token, password                        | 200 contraseña renovada; revoca sesiones anteriores                                   |
| GET access            | Público                                | Fuente institucional indisponible, accountEmailAvailable y flag de fixtures sólo test |

GET me sigue exponiendo el contrato histórico sólo con acceso de producto.
POST logout conserva la revocación de la sesión propia tras pérdida de vigencia.
El endpoint histórico demo/login existe únicamente en NODE_ENV=test con proveedor
y modo sintéticos explícitos. El formulario normal no depende de él.

La cuenta devuelve id/email/profile, emailVerified, usagePreference,
onboarding{step,completed}, eligibility{status,source,validUntil},
capabilities{passenger,driverAccess,driver} y synthetic. Nunca hashes ni tokens
documentales. Los estados institucionales son PENDING_VERIFICATION,
VERIFIED_CURRENT, INELIGIBLE, EXPIRED o REVOKED. Un correo confirmado puede seguir
pendiente de acreditar matrícula. Una preferencia de conducción no valida licencia,
SOAT, vehículo o propiedad. Una cuenta real no utiliza documentos sintéticos.

## Credenciales y enlaces

Se adopta contraseña propia de RuTeam y scrypt integrado en Node, sin dependencia
adicional. Parámetros N=32768/r=8/p=3, sal aleatoria16bytes, clave64bytes y límite de
memoria64MiB; derivación asíncrona y comparación temporalmente constante de claves.
El registro acepta 12..128 caracteres y no pide contraseña institucional.
La selección corresponde a la configuración de32MiB de la
[guía OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).
Las cuentas inexistentes realizan también una derivación costosa al intentar login.
El formato almacena parámetros; cambiar su versión requiere evaluar compatibilidad.

Correo normalizado a minúsculas, único por cuenta, dominio exacto usc.edu.co. El
registro consulta correo sin distinguir mayúsculas bajo advisory lock antes de
crear; una petición duplicada nunca sobrescribe contraseña, perfil o afiliación.
Los fixtures con demoIdentity sólo admiten login normal usando el dominio exacto
student-fixtures.ruteam.invalid y configuración no productiva explícita.

Enlaces impredecibles de32bytes. PostgreSQL sólo guarda HMAC-SHA256 separado por
propósito y timestamps, con AUTH_TOKEN_SECRET externo. Confirmación vence en30min,
recuperación en15min. Emisión por cuenta/propósito serializada con lock de User:
intervalo mínimo60s y máximo10por hora, además del throttling HTTP por dirección.
Un nuevo enlace permitido invalida los anteriores del mismo propósito. Los intentos
durante cooldown conservan el enlace reciente.

El consumo exige propósito, vigencia y consumedAt nulo, y reclama la fila mediante
actualización condicional dentro del lock del usuario. Dos consumos concurrentes no
pueden tener éxito. Confirmar correo exige elegir/reconfirmar la contraseña en ese
momento: evita que un dueño que confirma un enlace conserve una contraseña que
otro registró previamente. Confirmación y recuperación revocan TODAS las sesiones
y tokens anteriores. Crear una sesión con contraseña compara de nuevo el hash
vigente bajo el mismo lock; no puede competir con un cambio de credenciales y
producir una sesión válida con la contraseña anterior.

Las solicitudes públicas devuelven la misma respuesta genérica para un destinatario
existente o ausente. El transporte sólo se invoca al emitir un enlace permitido; las
cuentas ausentes y los reintentos durante cooldown no reciben mensajes. El resultado
SMTP no modifica la respuesta pública y se registra por código sin correo ni token.
El registro persiste pendiente sin SMTP y devuelve `emailDeliveryAvailable=false`.
La bandera describe configuración, no entrega ni acreditación de matrícula.

## Transporte y entorno

Variables compartidas gestionadas centralmente: AUTH_TOKEN_SECRET (mínimo32),
AUTH_PUBLIC_URL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER/SMTP_PASSWORD y
MAIL_FROM. SMTP usa TLS implícito con certificados validados. TCP sin TLS sólo se
permite en localhost/127.0.0.1/::1 no productivo. No hay downgrade STARTTLS ni captura
de correos en disco o endpoint de pruebas. No se imprimen contraseñas, tokens,
credenciales SMTP o contenidos. Los tests inyectan transporte exclusivamente en
memoria dentro de su proceso.

Cada envío tiene timeout de inactividad10s y plazo total15s, incluyendo conexión,
negociación y DATA. Un peer que envíe bytes continuamente tampoco puede prolongarlo.
account-smtp.test.mjs comprueba el diálogo TCP/SMTP real contra loopback efímero con
direcciones test.invalid, contenido base64 y deadline; no envía datos o correo USC.

AUTH_PUBLIC_URL requiere HTTPS en producción; HTTP sólo loopback no productivo.
Los enlaces apuntan a /verify-email?token= y /recover-access?token=.
SMTP/secretos ausentes impiden enviar/consumir enlaces; no impiden registrar cuenta
pendiente ni autenticar credenciales ya existentes. Cambiar AUTH_TOKEN_SECRET
invalida los enlaces pendientes; no cambia hashes de contraseñas o sesiones.

## Verificación y límites

account-policy.test.mjs cubre correo, hash, separación de fuentes/capacidades y
transiciones. account.e2e.test.mjs usa PostgreSQL_test real y transporte inyectado:
registro normal, duplicados, cuenta pendiente, bloqueo de producto, reenvío,
consumos simultáneos de confirmación/reset, revocación, expiración y reanudación.
Las suites que escriben BD deben ejecutarse secuencialmente desde el coordinador.

La entrega a un buzón externo requiere SMTP provisionado y prueba de entrega;
el transporte en memoria no la acredita. La vigencia institucional real y el QR
siguen bloqueados sin fuente autorizada. No hay conector oficial inventado, scraping,
almacenamiento de carnés o aprobación administrativa.
