# Ventanas, demoras, vencimiento y edición

27/11/2026, America/Bogota. Agente Codex. Responsable humano POR_ASIGNAR.
Rama local `task/trip-operations` en `2b69336ac7a4bc509d06e00bb58c296ffa05e633`.
Trabajo en el árbol local.

El advisory lock transaccional compartido por los módulos se adquiere en
modo exclusivo para asignar nuevos horarios, antes de conductor y viaje.
Aplica a publicación ordinaria o recurrente, confirmación individual o grupal,
demora y edición. Después se validan actividades de la misma persona. Se usa
el tramo estimado si sus dos offsets son útiles y, en caso contrario, la
ventana completa. El extremo final es exclusivo. Los cambios de capacidad
y confirmaciones preservan su atomicidad.

`POST /trips/:id/delay` mantiene la salida publicada, valida titular, periodo y
documentación, verifica compatibilidad de conductor y pasajeros confirmados y
emite avisos. El trabajador reclama viajes programados cuya ventana venció;
conserva los datos y deja `expiredAt`, caduca pases y referencias pendientes.
`PATCH /trips/:id` compara `version` y conserva el mismo viaje. Bloquea
cambios esenciales si hay reservas, grupos o propuestas. Acepta correcciones
descriptivas para esos viajes. El formulario Expo reutiliza la pantalla de
publicación y guarda la versión que el conductor abrió. Con una edición
completa sin referencias se vuelven a validar itinerario, cupo, costos,
vehículo y horario y se reencola matching.

La expiración predeterminada es de 30 minutos tras el final estimado y se
puede configurar entre 0 y 180. La demora máxima queda en tres horas desde
la salida original. Revisar ambos valores con el PO. El vencimiento deja el
historial disponible y requiere una cancelación explícita para cambiar el estado.

Pruebas de intervalos en `activity-window.test` y carreras y políticas HTTP en
`driver-routes.e2e`. Ver resultados y reproducción en el
[handoff de integración](2026-11-27_trip-operations_integracion.md).
