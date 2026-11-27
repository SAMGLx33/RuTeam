# ADR0004 — Cuentas propias, verificación y capacidades

Incremento A, 25/11/2026. Decisión técnica coordinada para la transformación integral.
**Diseño adoptado; implementación, parámetros y pruebas se acreditan por incremento.**
Complementa ADR0003; sustituye el acceso sintético como experiencia principal y la antigua
sugerencia de no crear cuentas mientras faltara integración académica.

## Decisión y justificación

Autenticación convencional con correo institucional y contraseña PROPIA de RuTeam.
Se elige scrypt con sal aleatoria y parámetros/codificación versionados: permite usar
el soporte criptográfico de Node del stack actual sin añadir un proveedor de identidad
inexistente o una dependencia obligatoria de pago. El implementador documenta y verifica
coste, longitudes y comparación segura; esta ADR no inventa valores ya medidos.
No usar cifrado reversible ni almacenar contraseñas o tokens reutilizables en texto plano.
No solicitar claves del sistema USC. La alternativa passwordless por correo no es el
mecanismo primario elegido; correo y recuperación siguen necesitando tokens seguros.

Control de buzón, autenticación, estamento/matrícula y permiso para conducir son estados
independientes. Cuenta/sesión propia puede existir antes de acreditar elegibilidad; acceso
limitado a cuenta/verificación/onboarding básico. Feed/viajes requieren correo verificado
y estudiante vigente; provider autorizado ausente falla cerrado. Nunca elevar fixtures,
docentes/trabajadores/revisores históricos a alumnos reales mediante migración.

Reutilizar sesiones opacas con hash en BD, expiración/revocación, cookie HttpOnly web y
SecureStore nativo. Registro/recuperación con errores no enumerantes y límites. Tokens de
correo/recuperación impredecibles, almacenados por hash, expirables y de uso único.
SMTP/entrega y acreditación académica son adaptadores separados; transporte local de captura
exclusivo de pruebas/desarrollo. No emitir tokens de verificación o credenciales por una
API normal para facilitar un test, ni permitir provider sintético con configuración productiva.
Cambiar/recuperar credenciales exige revocar sesiones según la política implementada,
incluido token de recuperación ya consumido y sesiones previamente robadas.

## Persistencia y migraciones a revisar

Conservar User/Profile/AuthSession/InstitutionalMembership y sus FKs. Evaluar dónde ubicar
hash/sal/parámetros/versión de credencial, correo verificado y tokens de uso único sin crear
una tabla independiente por cada concepto. Unicidad/normalización de correo se valida
antes de aplicar constraints a datos anteriores. Credenciales nuevas no se inventan para
usuarios legados ni se envían al cliente.

Onboarding conserva preferencia y avance/fin, separados de elegibilidad/capacidad.
Movilidad privada, recomendaciones y notificaciones incorporan persistencia e índices en
el incrementoD; publicación/evento/tarea recuperable se coordinan con schema/contratos.
Los nombres concretos de campos/modelos se confirman con integrador; no son tablas ya
creadas por esta ADR. Sólo migraciones incrementales, tests reales y preservación histórica.

## Validación y límites

Registro→verificación→login→sesión de cuenta→acreditación→onboarding→feed con negativas
HTTP/URL/UI. Probar expiración/uso único/intentos, entrega ausente, no enumeración,
recuperación/revocación, preferencia sin permisos y pérdida de conducción/matrícula.
Fixtures usan el mismo formulario y credenciales controladas por test, sin selector ni
endpoint normal alternativo. Saltar verificación mediante seed no acredita SMTP real o USC.

Las fuentes USC/documentales, SMTP operativo y pruebas físicas mantienen estado separado.
La decisión no declara integración, protección de producción completa ni resultados nuevos.
API/TRACEABILITY/EVIDENCE y handoff deben registrar lo efectivamente implementado.

## Decisión materializada

La migración `20261125140000_product_accounts_and_mobility` conserva tablas históricas.
La contraseña se deriva con scrypt N=32768, r=8, p=3, sal aleatoria de 16 bytes y hash de
64 bytes. Se almacena una representación versionada con parámetros. `AccountToken` guarda
HMAC del enlace por propósito, vencimiento y consumo. La confirmación permite al dueño del
buzón elegir contraseña, revoca credenciales de sesión previas y mantiene pendiente el
estado académico hasta comprobarlo por separado.
