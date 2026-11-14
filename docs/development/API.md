# API v1 implementada

Base /api/v1; Swagger UI /api/v1/docs y JSON /api/v1/docs-json. DTOs validan y rechazan
campos desconocidos. Mutaciones exigen `x-ruteam-client: web|native`; Origin, si existe,
debe pertenecer a CORS_ORIGINS exactos. Para web fetch credentials include y cookie
HttpOnly SameSite Strict; native recibe token y usa Authorization Bearer. HTTP sólo demo.

| Método/ruta             | Entrada                        | Resultado                             | Acceso                     |
| ----------------------- | ------------------------------ | ------------------------------------- | -------------------------- |
| GET health              | —                              | 200 status/database/demo,503 BD caída | público                    |
| POST auth/demo/login    | identity ana/diego/laura/admin | 201 user/expiresAt, token sólo native | bandera demo;403 inactivo  |
| GET auth/me             | —                              | 200 CurrentUser                       | sesión + afiliación activa |
| POST auth/logout        | —                              | 204 revocación                        | sesión válida              |
| GET me                  | —                              | 200 CurrentUser                       | sesión + afiliación activa |
| PATCH me/profile        | displayName2–80 trim           | 200 displayName persistido            | dueño de sesión            |
| GET campus/destinations | —                              | 200 catálogo activo USC DEMO          | sesión + afiliación activa |

CurrentUser en packages/contracts. MEMBER/ADMIN asignado en seed; capabilities.driver
es sintético y no permite publicar sin validar vehículo en siguiente fase.
No se retornan hashes, sesiones o documentos. Auth/guard usa vigencia, no sólo email.
Errores400 DTO,401 sesión,403 acceso,404 no implementado,429 throttling; login20/min,
resto100/min por IP en memoria de la instancia. No hay registro libre/contraseñas.
Sesión opaca256bits, hash SHA256,1h máximo, revocación logout, SecureStore nativo.

WS: ningún gateway/evento implementado aún. Contrato futuro del prompt:
reservation.requested/decided, trip.started/position/stop.arrived/completed,
chat.send/message, notification.created. No emitirlos ni anunciar Socket.IO funcional.
Validar handshake y autorización por evento/sala e idempotencia cuando se implemente.
