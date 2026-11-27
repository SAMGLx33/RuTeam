# RuTeam · dependencias del corte de consolidación

26/11/2026, America/Bogota. Rama `task/driver-defined-routes`, base
`5af65f2d1c11f3b6091af21605a3eab21a50e163`, con cambios locales en el manifiesto
de frontend y el lockfile. Node 22.22.3 y npm 12.2.2. SHA-256 de
`package-lock.json` durante ambos escaneos
`8168266ae76d9c1a78094d45b0aebc45e12debc6d9ee1fe37826500a32fe4aa0`.

## Resultados npm

| Comando                       | Salida | Moderadas | Altas | Críticas | Total |
| ----------------------------- | -----: | --------: | ----: | -------: | ----: |
| `npm audit --json`            |      1 |        34 |     8 |        0 |    42 |
| `npm audit --omit=dev --json` |      1 |        12 |     8 |        0 |    20 |

Ambos comandos obtuvieron un informe JSON válido del registro npm. La comparación
de los JSON del 25/11 y 26/11 arroja los mismos once avisos propios en seis
paquetes y el mismo conjunto de paquetes informados en cada alcance. El recuento
incluye entradas propagadas por npm. Las ocho altas son
`decode-uri-component`, `effect`, `image-size`, `postcss` y sus padres
`query-string`, `expo-router`, `@prisma/config` y `prisma`. El filtro
`--omit=dev` mantiene herramientas de Expo y dependencias alcanzadas por peers
opcionales. La aplicabilidad se evaluó sobre el código y el grafo locales.
[Informe del corte anterior](PRODUCT_CONTINUITY_DEPENDENCIES.md).

Evidencia bajo `/home/darik/RuTeam/.local-data/consolidacion-2026-11-26/`.
`consolidation-npm-audit-full.{json,stderr,exit}`,
`consolidation-npm-audit-prod.{json,stderr,exit}`,
`consolidation-audit-lock-{before,after}.txt` y
`consolidation-registry-compat.log`. El hash del lockfile coincidió al inicio
y al cierre.

## Cambios de dependencias y compatibilidad

El cotejo estructural con el punto de control detectó sólo tres entradas de
paquete añadidas y la actualización de la lista del workspace frontend. Se
conservaron versiones, integridades y demás metadatos de las resoluciones
previas. Las tres dependencias directas nuevas usan licencia MIT y carecen de
entradas en los dos resultados de npm de este corte.

| Dependencia y resolución | Uso observado                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `expo-camera@17.0.10`    | Escaneo QR en el componente nativo. La versión coincide con `~17.0.10` del manifiesto Expo SDK 54. El flujo manual sigue accesible. |
| `expo-location@19.0.8`   | Ubicación puntual previa solicitud de permiso en primer plano. La versión coincide con `~19.0.8` del SDK.                           |
| `qrcode-generator@2.0.4` | Genera el QR localmente a partir del código temporal emitido por RuTeam. El paquete carece de dependencias propias.                 |

Cotejo de SDK y manifiestos publicados. [Manifiesto Expo SDK 54](https://github.com/expo/expo/blob/sdk-54/packages/expo/bundledNativeModules.json),
[Expo Camera](https://registry.npmjs.org/expo-camera/17.0.10),
[Expo Location](https://registry.npmjs.org/expo-location/19.0.8),
[QR Code Generator](https://registry.npmjs.org/qrcode-generator/2.0.4).

La biblioteca `expo-camera` declara `RECORD_AUDIO` en su manifiesto Android.
La configuración de RuTeam bloquea ese permiso heredado en un binario propio
mediante `android.blockedPermissions`. La validación de cámara y ubicación
en Expo Go queda sujeta a prueba física. [Permisos de Expo](https://docs.expo.dev/guides/permissions/).

## Avisos y condiciones de aplicación

- **`decode-uri-component@0.2.2` · alta.** Expo Router `6.0.24` importa
  `query-string@7.1.3`, que fija `^0.2.2`. Los avisos de disponibilidad
  requieren decodificar entrada no confiable con la función afectada. En la ruta
  examinada, `parseQueryParams` usa `URL.searchParams` para leer y
  `query-string` serializa los enlaces salientes. El análisis estático acota
  esa ruta y deja abierta la revisión si se añade otro consumidor. La primera
  versión que cubre ambos avisos es `0.5.1`, ESM y fuera del rango del
  consumidor CommonJS. El salto sugerido por npm es Expo Router 58.
  [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr),
  [GHSA-qr28-fpjm-wq7f](https://github.com/advisories/GHSA-qr28-fpjm-wq7f),
  [manifiesto de query-string](https://registry.npmjs.org/query-string/7.1.3).
- **`effect@3.20.0` · alta.** `prisma@7.10.1` exige
  `@prisma/config@7.10.1`, que fija Effect `3.20.0`. El cliente Prisma puede
  incorporar la CLI como peer opcional y `@hookform/resolvers` declara Effect
  como peer opcional. El aviso requiere procesar entrada no confiable con
  `Schema.TemplateLiteral`. El código inspeccionado de la CLI usa
  `Schema.Struct` para configuración local y el backend carece de importes
  directos de esa función. `3.22.1` corrige el aviso. La última CLI estable 7.x
  conserva la versión vulnerable y npm sugiere bajar a Prisma 6.12.0. La
  actualización del padre debe comprobarse junto con el cliente y el adapter.
  [GHSA-7589-6fvf-x4pw](https://github.com/advisories/GHSA-7589-6fvf-x4pw),
  [manifiesto de @prisma/config](https://registry.npmjs.org/@prisma%2Fconfig/7.10.1).
- **`image-size@1.2.1` · alta.** Metro `0.83.3` exige `^1.0.2` y usa la
  biblioteca para inspeccionar imágenes del bundle. Los avisos requieren que
  contenido de imagen no confiable llegue al analizador afectado. En este corte
  se inspeccionan assets de compilación y el backend carece de una ruta de subida
  para ese análisis. La primera versión con ambas correcciones es `2.0.3`, fuera
  de rango. Metro `0.83.8` retiró la dependencia, pero Expo
  `@expo/metro@54.2.0` fija `0.83.3`. La interfaz CommonJS de la actualización
  permite evaluar un override acotado a Metro en un corte de pruebas separado.
  [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq),
  [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr),
  [manifiesto Expo Metro 54.2.0](https://registry.npmjs.org/@expo%2Fmetro/54.2.0),
  [manifiesto Metro 0.83.8](https://registry.npmjs.org/metro/0.83.8).
- **`postcss@8.4.49` · alta.** `@expo/metro-config@54.0.17` exige
  `~8.4.32`. Los avisos afectan situaciones de procesamiento de CSS o de mapas
  de origen no confiables. En este corte el transformador de Expo inicia con
  `map: false` y `from` definido. La revisión del proyecto encontró entrada CSS
  de compilación controlada por el equipo. `8.5.23` cubre los cuatro avisos y
  supera el rango del padre. Es el candidato para una prueba aislada de override
  dentro de la misma versión mayor, con exportación web y comprobación de Metro.
  [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93),
  [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q),
  [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp),
  [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849),
  [manifiesto Expo Metro Config](https://registry.npmjs.org/@expo%2Fmetro-config/54.0.17).
- **`glob@13.0.7` y `10.5.0` · moderada.** La primera resolución alimenta
  herramientas Expo y Jest, y la segunda proviene de `test-exclude`. El aviso
  concierne la interrupción de recorridos del sistema de archivos. Las rutas
  HTTP inspeccionadas carecen de entradas de patrones o directorios para esas
  herramientas. Las resoluciones `7.2.3` quedan fuera del rango afectado.
  La versión corregida `14.0.2` supera los rangos `^13` y `^10`.
  [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).
- **`minimatch@9.0.9` y `10.2.6` · moderada.** Las resoluciones afectadas
  pertenecen a Expo CLI, Fingerprint, globbing y QA. El aviso requiere patrones
  no confiables y las opciones de procesamiento implicadas. Los patrones
  examinados corresponden a herramientas del equipo. La resolución `3.1.5`
  queda fuera del aviso. La versión corregida `11.0.1` supera los rangos
  `^9` y `^10`. La compatibilidad debe comprobarse con sus padres y Glob.
  [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Decisión del corte

El registro consultado conserva los padres afectados en las últimas versiones
estables de Expo 54, Expo Router 6.0.x y Prisma 7.x. Una actualización ordinaria
dentro de los rangos actuales deja abiertos los seis paquetes con avisos.
La corrección de dependencias queda pendiente de un candidato aislado que pase
auditoría con lock reproducible, Expo Doctor, builds web y nativos y los E2E
pertinentes. Mantener Expo/Metro y CI con assets, CSS y patrones del equipo y
revisar las rutas de entrada al cambiar esas superficies. Los resultados de
este documento corresponden al árbol local y conservan los avisos abiertos.
