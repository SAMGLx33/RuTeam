# Correo de cuenta con Mailpit local

Mailpit permite comprobar la entrega SMTP de RuTeam en un buzón de pruebas.
El correo recibido demuestra que el transporte local funciona. La cuenta sigue
necesitando acreditación independiente de matrícula para utilizar los viajes.

## Arrancar el capturador

En la raíz del monorepo, con Docker Compose v2, PostgreSQL de prueba activo,
y los puertos 1025 y 8025 libres:

```sh
docker compose -f compose.mailpit.yaml up -d
```

Abre el [buzón en loopback](http://127.0.0.1:8025/). El servicio fija la imagen por digest,
publica ambos puertos sólo en loopback y usa el aislamiento del proyecto Compose. Admite
destinatarios de prueba `ruteam-prueba+<16 hexadecimales>@usc.edu.co`, sin configurar
relay, forwarding ni volúmenes. Usa sólo esos alias aleatorios. Para detener el
servicio y descartar el buzón en la red de este proyecto:

```sh
docker compose -f compose.mailpit.yaml down
```

[Imagen oficial de Mailpit](https://mailpit.axllent.org/docs/install/docker/) ·
[Configuración de SMTP](https://mailpit.axllent.org/docs/configuration/smtp/)

### Equivalente con Docker Engine

Si falta el complemento Compose, abre una terminal dedicada y deja correr el
contenedor durante la prueba. Salir con Ctrl+C retira el contenedor.

```sh
docker run --rm --name ruteam-mailpit-local \
  -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 \
  -e MP_ALLOWED_HOSTS=127.0.0.1,localhost -e MP_DISABLE_VERSION_CHECK=true \
  -e MP_SMTP_DISABLE_RDNS=true \
  -e 'MP_SMTP_ALLOWED_RECIPIENTS=^ruteam-prueba[+][0-9a-f]{16}@usc[.]edu[.]co$' \
  ghcr.io/axllent/mailpit:v1.34.0@sha256:23a2ef85bc50853ab3093645d1d64679afd8887e89da5e48a88940c172591a4e
```

## Smoke de Nest, PostgreSQL y SMTP

Con las migraciones y la generación de Prisma preparadas en una base de prueba
distinta de desarrollo, compila el backend y ejecuta:

```sh
npm run build:api
node --env-file=.env scripts/smoke-mailpit.mjs
```

El script usa `TEST_DATABASE_URL`, que debe apuntar a PostgreSQL en `127.0.0.1` y
a una base cuyo nombre termine en `_test`. Arranca Nest en un puerto efímero,
inyecta la configuración de Mailpit en ese proceso y genera sus propios
secretos. Registra un alias aleatorio, recibe enlaces mediante SMTP, comprueba
confirmación y recuperación de uso único, revocación de sesiones y bloqueo
del feed con correo verificado pero sin acreditación. Elimina su usuario de
prueba al terminar. El script comprueba los enlaces reutilizando el contrato
HTTP de la aplicación. Para verificar la navegación de la interfaz, usa la
prueba manual.

## Prueba manual con Expo web

En la terminal de Nest, con una base local autorizada, establece estas variables
en el proceso. Usa la misma URL del navegador como origen permitido. El frontend
y el backend continúan en terminales separadas.

```sh
export AUTH_PUBLIC_URL=http://127.0.0.1:8081
export CORS_ORIGINS=http://127.0.0.1:8081
export SMTP_HOST=127.0.0.1
export SMTP_PORT=1025
export SMTP_SECURE=false
export MAIL_FROM=pruebas@ruteam.invalid
export AUTH_TOKEN_SECRET="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
unset SMTP_USER SMTP_PASSWORD
npm run dev:api
```

Si el `.env` local ya contiene credenciales SMTP, no lo uses para arrancar
esta prueba manual. La validación automatizada elimina esas variables del proceso
antes de crear Nest. Conserva el mismo secreto durante registro y recuperación.
En la web, registra un alias generado, autentícate, abre el enlace en Mailpit,
establece una contraseña y comprueba el estado de matrícula en la cuenta.
Repite con «Recuperar contraseña» y comprueba que la sesión anterior caduca.

## Configuración SMTP para un entorno autorizado

| Variable                     | Valor y requisito                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `SMTP_HOST`                  | Host del servidor SMTP aprobado. Mailpit usa `127.0.0.1`.                                        |
| `SMTP_PORT`                  | 465 por defecto con TLS implícito. Mailpit usa 1025.                                             |
| `SMTP_SECURE`                | `true` con TLS implícito y certificados validados. `false` sólo en loopback fuera de producción. |
| `SMTP_USER`, `SMTP_PASSWORD` | Credenciales del SMTP, configuradas juntas cuando el servidor exige autenticación.               |
| `MAIL_FROM`                  | Remitente autorizado por el relay.                                                               |
| `AUTH_PUBLIC_URL`            | Origen del frontend sin credenciales ni consulta. HTTPS en producción.                           |
| `AUTH_TOKEN_SECRET`          | Secreto aleatorio de al menos 32 caracteres, separado de las credenciales SMTP.                  |

El adaptador usa TLS desde la conexión, por lo que requiere un relay compatible
con TLS implícito. La alternativa preferente es el SMTP existente del equipo
o de la USC, con autorización de uso y de remitente. Como opción externa con
cuota gratuita al momento de esta revisión, Brevo documenta SMTP por el puerto
465 y 300 envíos diarios. Su uso requiere autorización, dominio y remitente
verificados, y una comprobación de entrega a un destinatario consentido.
[Configuración SMTP de Brevo](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP) ·
[Cuota de Brevo](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans)

La confirmación vence en 30 minutos y la recuperación en 15. Una cuenta puede
solicitar un enlace por minuto y hasta diez por hora para cada propósito. Si
el transporte falla, la aplicación registra `ACCOUNT_EMAIL_DELIVERY_FAILED`
y mantiene una respuesta genérica. Una nueva solicitud después del intervalo
genera un enlace vigente. La emisión actual no tiene cola de reintentos
automáticos. Conserva credenciales, mensajes y enlaces únicamente en el entorno
privado de la prueba.
