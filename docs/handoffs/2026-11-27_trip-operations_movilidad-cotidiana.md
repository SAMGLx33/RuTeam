# Guardados, disponibilidad, agenda y preferencias

27/11/2026, America/Bogota. Agentes Codex y daily_mobility.
Responsable humano POR_ASIGNAR. Rama local `task/trip-operations` en
`2b69336ac7a4bc509d06e00bb58c296ffa05e633`. Trabajo en el árbol local.

Mobility incorpora guardados de viaje y opción de aviso al recuperar plazas,
recordatorios de 15, 30 o 60 minutos, agenda con recogida y descenso previstos
e incompatibilidades propias, lugares habituales privados y límite opcional de
aporte en COP. La pantalla Inicio muestra recordatorios accionables. Búsqueda y
publicación permiten reutilizar lugares seleccionados. El trabajador relee datos
vigentes y deduplica en PostgreSQL. Guardar un viaje conserva la información
disponible para el actor. Confirmar una plaza requiere su propia transacción.

Los cambios residen en `backend/src/modules/mobility`, `packages/contracts`,
`frontend/src/features/mobility` y enlaces de Inicio, detalle y búsqueda.
Migraciones `20261127030000_daily_mobility` y
`20261127030100_saved_trip_signals`. Las señales privadas aplican al propietario
del guardado. El feed y la respuesta de disponibilidad exigen autorización
por las vías existentes.

Jest focalizado del agente pasó 28 casos de `daily-mobility`,
`mobility-policy` y `mobility.e2e` sobre PostgreSQL sintético. Los resultados de
la rama integrados se consignan en el
[handoff de integración](2026-11-27_trip-operations_integracion.md).
Revisar el límite de frecuencia de escaneo con volumen real antes de despliegue.
