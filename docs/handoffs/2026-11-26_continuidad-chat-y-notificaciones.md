# Continuidad de chat y notificaciones internas

26/11/2026, America/Bogota. Agente Codex. Persona responsable POR_ASIGNAR. Rama
`task/driver-defined-routes`, base `5af65f2d1c11f3b6091af21605a3eab21a50e163`.

Chat deriva las conversaciones del viaje, revalida permisos bajo el orden de
bloqueos conductor → viaje y guarda mensajes, recibos y avisos con Prisma. Acepta
reintentos del mismo UUID con el mismo contenido, pagina por mensajes y avanza
el recibo de lectura. Retiro, cancelación y ausencia revocan acceso. El conductor
y las personas que abordaron pueden consultar la conversación completada durante
24 horas. La tarea horaria purga en lotes, independientemente de la ventana que
aplica la API en cada lectura.

Datos y código. `20261126001000_trip_chat`, módulo `backend/src/modules/chat`,
contrato `packages/contracts/src/chat.ts`, notificación `CHAT_MESSAGE`, rutas
Expo `/chat` y `/chat/[tripId]`. El cliente comparte consulta periódica en web y
nativo. Ver [endpoints](../development/API.md), [validación](../reviews/PRODUCT_CONTINUITY.md)
y pruebas `chat-policy.test.mjs`, `chat.e2e.test.mjs` y
`tests/web/publication.spec.ts`.

Siguiente paso de Comunicación y QA, POR_ASIGNAR. Confirmar la política
institucional de retención y comprobar la vista Expo Go con una sesión por rol.
