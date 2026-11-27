# Continuidad · restauración PostgreSQL y preparación para Expo Go

26/11/2026, America/Bogota. Agente Codex y responsable humano POR_ASIGNAR.
Rama `task/driver-defined-routes`, base
`5af65f2d1c11f3b6091af21605a3eab21a50e163`. Cambios locales pendientes de
integración. Se preservaron `.env`, respaldo y migraciones históricas.

- **Restauración ejecutada.** PostgreSQL 18.6, `ruteam_restore_20261126_test`.
  `pg_restore` terminó con código 0. 10/10 checksums de Prisma, 22/22 tablas y
  contenido de 81 filas coincidente con COPY. Consultas y catálogo comprobaron
  relaciones, restricciones e índice único. El respaldo carece de viajes y
  reservas grabados. [Informe y reproducción](../reviews/POSTGRESQL_RESTORE_DRILL.md).
- **Expo Go preparado.** NestJS y el manifiesto Android de Metro respondieron HTTP 200 por la IP privada de la VM. La prueba
  física queda pendiente por falta de dispositivo accesible. El escenario de
  VirtualBox requiere confirmación del modo de red desde el anfitrión y revisión
  autorizada de reglas, sin exponer PostgreSQL. [Procedimiento de QA](../development/MOBILE_TESTING.md).

Siguiente paso de QA e Infraestructura, POR_ASIGNAR. Ejecutar el procedimiento
desde un teléfono compatible con SDK 54 y registrar conexión, SecureStore,
cámara y ubicación según las capacidades disponibles en el corte. Si hay datos
de viajes cuyo respaldo deba comprobarse, repetir la restauración con una copia
autorizada en otra base nueva e independiente.
