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

## Criterios de la redefinición

- **A y B.** Dado un conductor habilitado, al publicar desde la Plazoleta de los Sabios o el sótano 2 hacia Floralia, el origen, destino, nivel e indicaciones se conservan. Se identifican como ejemplos DEMO.
- **C.** Dado un viaje hacia USC con parada en Calle Quinta, al consultar el itinerario se muestra el punto autorizado y la geometría publicada, cuando existe. Solicitar esa parada conserva el trayecto.
- **D.** Dado un punto cercano sólo a la línea o a un punto de paso, buscar en su radio no devuelve un par por ese punto. El sentido inverso y la ventana incompatible tampoco devuelven coincidencias.
- **E.** Dado un viaje programado con dos puntos válidos, dos miembros pueden integrar una solicitud. El conductor confirma el grupo dentro de la capacidad. Con dos aceptaciones concurrentes por la última plaza, una sola confirma. ID de otro viaje, orden inverso, afiliación inactiva o actor ajeno se rechazan.
- **Ciclo.** Cancelar un viaje programado conserva el registro y libera cupos confirmados. Iniciar y terminar requieren el estado anterior y al conductor propietario. QR, seguimiento y confirmación física tienen sus propias pruebas pendientes.

La aceptación formal se registra con el PO. Evidencia ejecutada y límites en el informe de entrega.
