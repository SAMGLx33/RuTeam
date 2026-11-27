# RuTeam · restauración aislada de PostgreSQL

26/11/2026, America/Bogota. Rama `task/driver-defined-routes` sobre
`5af65f2d1c11f3b6091af21605a3eab21a50e163`. Revisión local de Codex.
Responsable humano POR_ASIGNAR.

Se restauró completamente el respaldo privado creado antes de continuidad al
clúster PostgreSQL 18.6 en `127.0.0.1:55432`. El destino nuevo fue
`ruteam_restore_20261126_test`. El script validó host, puerto y nombres de
origen y destino, comprobó que el destino no existía y lo creó a partir de
`template0`. La restauración terminó en una transacción.

```text
pg_restore --single-transaction --exit-on-error --no-owner --no-privileges --dbname ruteam_restore_20261126_test ARCHIVO_PRIVADO
```

Las opciones excluyen la reasignación de propietarios y la reproducción de ACL.
Se comprobó esquema, datos y restricciones. La reproducción de roles o ACL
productivas queda fuera de la restauración local. [Referencia PostgreSQL 18](https://www.postgresql.org/docs/18/app-pgrestore.html).

| Validación                | Resultado observado                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Restauración completa     | Salida 0 de `pg_restore`. SHA-256 del archivo conservado antes y después de la operación.                                                                                             |
| Historial Prisma          | 10/10 checksums SHA-256 del archivo coinciden con las migraciones históricas en disco. Última `20261125140000_product_accounts_and_mobility`.                                         |
| Contenido                 | 22/22 tablas y 81 filas con contenido COPY idéntico por SHA-256 interno tras ordenar las filas. El proceso mantuvo las filas en memoria y registró sólo los totales.                  |
| Integridad                | Nueve FKs/CHECK validadas y el índice único de avisos por destinatario, viaje y clase.                                                                                                |
| Consultas representativas | Siete cuentas con perfil y afiliación. Viajes, paradas, reservas, preferencias y avisos sin filas de origen en este corte. Se ejecutaron las consultas relacionales de esos recursos. |
| Perfil de esquema         | Existían preferencias de movilidad y `Reservation.boardedAt`. El archivo es anterior a chat y a los segundos estimados por parada.                                                    |
| Conectividad local        | NestJS devolvió HTTP 200 y `database: "up"` por la IP del invitado con la base restaurada, sin ejecutar migraciones sobre ella.                                                       |

La comparación COPY comprueba todos los valores serializados del archivo. Las
consultas sin filas de historial documentan el contenido de ese respaldo; para
validar recuperación de viajes reales se requiere un respaldo seguro que los
contenga. Se conservó la base restaurada aislada para inspección. Las bases de
pruebas y desarrollo, `.env` y el archivo original se preservaron.

Evidencia privada en el directorio local de consolidación `consolidacion-2026-11-26`
debajo de `/home/darik/RuTeam/.local-data/`. Los scripts
`restore-validation.mjs` y `restore-row-content.mjs` registraron la comprobación
sin credenciales en `restore-validation.log` y `restore-row-content.log`.
Para ejecutar el cotejo de sólo lectura de nuevo, usa
`node --env-file=.env RUTA_PRIVADA/restore-row-content.mjs` desde el
monorepo. La restauración se diseñó para rechazar un destino que ya exista.

## Ensayo representativo del cierre del 26/11/2026

Fuente sintética `ruteam_cierre_restore_source_test`, destino nuevo
`ruteam_cierre_restored_test` y PostgreSQL del contenedor RuTeam en loopback.
Se aplicaron 21 migraciones en la fuente y se sembraron las identidades
sintéticas. NestJS publicó un viaje programado y otro con consentimiento
grupal, chat, dos abordajes, calificaciones mutuas, un registro privado y
una compensación reconocida. Se confirmó que la posición y los pases ya
habían quedado retirados al finalizar.

Se generó un respaldo de formato custom con `pg_dump` y modo 600, de 109.640
bytes. SHA-256
`396a587ec567834e5b5d3ca7b9cc4c990b14d8c117828fd95bb2148aa2cdefa2`.
El destino se creó con `template0` y se restauró con `pg_restore
--exit-on-error --single-transaction`. Los conteos completos y las consultas
de relación coincidieron antes de iniciar la API restaurada.

| Verificación             | Resultado                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidades y vehículo   | 4 usuarios, 1 vehículo y sus relaciones de titularidad                                                                                          |
| Viajes y geometría       | 2 viajes, uno programado y otro completado. 4 paradas, 2 geometrías                                                                             |
| Reservas y grupo         | 2 participaciones y 2 abordajes. 1 grupo, 2 consentimientos enlazados                                                                           |
| Comunicación             | 1 mensaje de grupo y 17 avisos. Se conservó la marca de lectura comprobada                                                                      |
| Economía y reputación    | 1 estimación, 1 compensación reconocida, 2 calificaciones                                                                                       |
| Seguridad                | 1 contacto, 1 incidencia propia, pases y posición retirados al cierre                                                                           |
| Integridad               | 340 restricciones validadas, ninguna pendiente. 21/21 checksums idénticos a SQL                                                                 |
| NestJS contra el destino | HTTP 200 en health, login normal, bandeja con lectura persistida, historial, aporte, compensación, incidencia, contacto y seguimiento terminado |

Se dejó el dump y la evidencia privada fuera del repositorio en
`RuTeam-cierre-evidencia/restauracion`. El ensayo acredita la recuperación
del modelo actual y el arranque de Nest en una copia. RTO/RPO operativos
requieren política e infraestructura de producción.
