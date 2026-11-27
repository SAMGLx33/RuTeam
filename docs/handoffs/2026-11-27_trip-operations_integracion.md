# Integración local de operación y movilidad cotidiana

27/11/2026, America/Bogota. Agente integrador Codex. Responsable humano
POR_ASIGNAR. Rama `task/trip-operations`; base integrada `2b69336ac7a4bc509d06e00bb58c296ffa05e633`.
La implementación se encuentra en el árbol de trabajo local. El integrador
humano conserva `CURRENT_STATUS.md` y el proceso de revisión de ramas.

## Alcance entregado

- [Descenso, manifiesto y cierre](2026-11-27_trip-operations_descenso.md)
- [Horarios, demora, vencimiento y edición](2026-11-27_trip-operations_horarios-y-edicion.md)
- [Guardados, agenda y recordatorios](2026-11-27_trip-operations_movilidad-cotidiana.md)
- [Seguimiento consentido y conectividad](2026-11-27_trip-operations_seguimiento-y-conectividad.md)
- [Registro nativo y enlaces autorizados](2026-11-27_trip-operations_notificaciones-nativas.md)

El backend y la app comparten contratos TypeScript. Las pruebas de regla y
PostgreSQL usan Nest MVC y Prisma 7.10.1. La interfaz conserva un solo
Expo Router SDK 54. El adaptador nativo añade `expo-notifications` 0.32,
`expo-device` 8 y `expo-dev-client` 6.

## PostgreSQL y evidencia

El clúster local 18.6 en 127.0.0.1:55432 se reanudó si estaba detenido.
La regresión usa `ruteam_operations_final_test` y fixtures sintéticos.
`db:test:setup` aplica las 31 migraciones y el seed. Se verificaron 31
checksums SHA-256 contra PostgreSQL. Las cuatro nuevas son
`20261127010000_trip_operations`, `20261127030000_daily_mobility`,
`20261127030100_saved_trip_signals` y `20261127040000_trip_location_accuracy`.
El archivo `.env` local conserva su configuración. Se pasó la URL de pruebas
por variables de proceso y se desactivó el envío push. La base de desarrollo
configurada en `.env` quedó fuera de las pruebas. No se editaron migraciones
anteriores.

La copia previa y los logs están en
`/home/darik/RuTeam/.local-data/operacion-2026-11-27/`, fuera del repositorio.
Para reproducir en cualquier clúster local autorizado configura una URL de
pruebas distinta de la de desarrollo, con nombre terminado en `_test`.
Ejecuta `npm run db:generate`, `npm run db:test:setup`, `npm test` y
`npm run test:e2e` secuencialmente. Playwright ejecuta un Chromium de
escritorio y el mismo navegador con viewport móvil, con API en 3100 y export
web en 8082. El smoke usa una API efímera en 3198 y la misma base de pruebas
cuando terminaron las demás suites.

## Resultados

| Comprobación                                                                                                                  | Resultado observado                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:generate`                                                                                                         | Aprobado. Prisma Client 7.10.1 generado.                                                                                                                         |
| `npm run db:test:setup`                                                                                                       | Aprobado en PostgreSQL 18.6 aislado. 31 migraciones, seed y checksums coincidentes.                                                                              |
| `npm run typecheck`, `npm run lint`, `npm run format:check`                                                                   | Aprobados, salida 0.                                                                                                                                             |
| `npm test`                                                                                                                    | Aprobado en la repetición integral, 37 suites y 224 casos. Incluye PostgreSQL real, concurrencia entre viajes y entre edición y confirmación, descenso y grupos. |
| `node --experimental-strip-types --test frontend/tests/notification-navigation.test.mts`                                      | Aprobado. El archivo comprueba destinos permitidos y rechazados.                                                                                                 |
| `npx --yes expo-doctor frontend`                                                                                              | Aprobado, 18 de 18 verificaciones.                                                                                                                               |
| `git diff --check`                                                                                                            | Aprobado, salida 0.                                                                                                                                              |
| `npm run test:e2e`                                                                                                            | Aprobado en la repetición integral. Chromium local, 9 casos de escritorio y 9 con viewport móvil.                                                                |
| `npm run smoke`                                                                                                               | Aprobado, 6 de 6 casos contra Nest y PostgreSQL aislado.                                                                                                         |
| `npm run build:api`, `npm run build:web`                                                                                      | Aprobados, salida 0.                                                                                                                                             |
| `npm exec -w @ruteam/client -- expo export --platform android --platform ios --output-dir <directorio-local> --max-workers 2` | Aprobado. Metro exportó un bundle Hermes por plataforma.                                                                                                         |
| Expo Go físico y recepción push remota                                                                                        | Pendientes por entorno. Requieren un teléfono y, para push, un development build con proyecto autorizado.                                                        |

Una primera regresión Jest registró dos expiraciones de tiempo de espera y sus
errores derivados. La ejecución integral siguiente pasó con la configuración
Jest ordinaria. La primera pasada Playwright detectó tres problemas en ambos
viewports. Los textos de grupos conservaban la etiqueta anterior, un rechazo
explícito HTTP 503 del motor vial se mostraba como resultado desconocido y el
cierre con manifiesto desactualizado no abría la confirmación. Se corrigieron
los tres casos antes de repetir la suite. El aviso de deprecación de `pg` se
mantiene como dato de entorno de los logs.

## Decisiones y relevo

Revisar el margen de expiración configurable, la demora máxima de tres horas,
el bloqueo conservador de cambios esenciales con referencias y el orden de
bloqueos exclusivo antes de integrar. La prueba física exige dos cuentas
sintéticas, un teléfono compatible y una red privada. Preparar el development
build por separado para push remoto. Los pasos están en
[Prueba móvil](../development/MOBILE_TESTING.md) y
[Preferencias de avisos y push](../development/NOTIFICATION_SETTINGS.md).

El siguiente paso humano es revisar los cambios y ejecutar el recorrido físico
de GPS y apertura de avisos. Mensaje sugerido para un commit autorizado
`feat(trips): add trip operations and daily mobility`. El índice está vacío.
HEAD y la referencia local `feature` están en `2b69336`. No hubo commit,
merge, PR ni push de esta intervención.
