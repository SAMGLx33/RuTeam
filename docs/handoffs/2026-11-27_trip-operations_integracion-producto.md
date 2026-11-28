# Handoff de integración de producto

27/11/2026, America/Bogota. Agente Codex. Responsable humano POR_ASIGNAR.
Rama `task/trip-operations`, HEAD `79bc69319bfb54c7fd16a7c1259665c81a0304e2`.
El merge #8 ya estaba completado al iniciar. Los cambios permanecen en el
árbol de trabajo local.

[PRODUCT_INTEGRATION](../development/PRODUCT_INTEGRATION.md) registra padres
del merge, puntos de unión, contratos, cambios y migraciones. La evidencia
local y el respaldo previo comprobable están en
`/home/darik/RuTeam/.local-data/product-integration-SepprP/`.

## Verificación

La regresión usa PostgreSQL 18.6 en el clúster local y la base separada
`ruteam_product_final_test`. La URL de pruebas se pasó por el proceso.
Las 33 migraciones y el seed se aplicaron en esa base. La base de desarrollo
y el archivo de configuración local quedaron fuera de las pruebas.

| Comprobación                                                                                                            | Resultado observado                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:generate`                                                                                                   | Prisma Client 7.10.1 generado.                                                                                              |
| `npm run db:test:setup`                                                                                                 | 33 migraciones y seed sintético en PostgreSQL aislado.                                                                      |
| `npm test`                                                                                                              | 38 suites y 230 casos aprobados en la regresión completa.                                                                   |
| Photon, OSRM y tesela XYZ                                                                                               | Prueba acotada con lugares públicos de Cali. [Resultados](../development/MAP_EXPERIENCE.md).                                |
| `npm run typecheck`, `npm run lint`, `npm run format:check`                                                             | Aprobados.                                                                                                                  |
| `npm run test:e2e`                                                                                                      | Segunda pasada integral 20/22, con dos fallos por un selector ambiguo en la publicación.                                    |
| `npm run test:e2e -- tests/web/publication.spec.ts`                                                                     | 2/2 en la repetición focalizada tras acotar el selector visible. Cubre flujo compartido, chat, aviso caducado, QR y retiro. |
| `node --experimental-strip-types --test frontend/tests/{notification-navigation,route-progress,upcoming-trip}.test.mts` | 3/3.                                                                                                                        |
| `npm run smoke`                                                                                                         | 6/6 contra la API aislada.                                                                                                  |
| `npm run build:api`, `npm run build:web`                                                                                | Aprobados.                                                                                                                  |
| `npm exec -w @ruteam/client -- expo export --platform android --platform ios --max-workers 2`                           | Bundles Hermes de Android e iOS exportados fuera del repositorio.                                                           |
| `npx --yes expo-doctor frontend`                                                                                        | 18/18 comprobaciones.                                                                                                       |
| `npm ci --no-audit --no-fund`                                                                                           | 1.282 paquetes en el directorio aislado del lockfile. npm notificó scripts de instalación bloqueados por su política.       |
| `git diff --check`, `git diff --cached --check`                                                                         | Aprobados.                                                                                                                  |

Los checksums SHA-256 de las 33 migraciones coinciden con PostgreSQL. Se
verificó que `NODE_ENV=production` rechaza el modo declarado en configuración.
La primera pasada web detectó ocho fallos en cuatro recorridos. Se restauró
el aviso de mensaje recuperado, se precisaron los selectores de registro y
conectividad y se verificó que el enlace de una recomendación caducada
mantiene el descubrimiento ordinario autorizado. La segunda pasada y la
prueba focalizada están registradas por separado.

Hay capturas del registro, Inicio y publicación con cuentas sintéticas
en `evidence/` dentro del directorio de validación. La lectura del proveedor
real se probó puntualmente con lugares públicos de Cali. La app y los
ensayos web utilizan la configuración del proceso. Faltan una prueba en
teléfono con Expo Go y la recepción push en un development build autorizado.

## Reproducción y promoción

Con PostgreSQL local confirmado, usa una URL de prueba distinta de desarrollo
y con sufijo `_test`. Ejecuta `npm run db:generate`, `npm run db:test:setup`,
`npm test` y `npm run test:e2e` en secuencia. Mantén proveedores, credenciales
y capturas privadas fuera del repositorio. Verifica el recorrido físico en
[la guía móvil](../development/MOBILE_TESTING.md).

Índice vacío. La rama local sigue en `79bc693` y `feature` en `7742a09`.
Propuesta de commit `feat(product): integrate USC declared access and route guidance`.
Tras revisar y autorizar el commit en la misma rama, el integrador puede
abrir la revisión hacia `feature`. Revalidar las dos migraciones aditivas
y la prueba física antes de promover.
