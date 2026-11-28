# Publicación y participación con Pampalinda

Trabajo local en `task/trip-operations` desde `b23d120`.

## Bloqueo y configuración

La fila real `USC-CALI-PAMPALINDA` estaba activa y tenía latitud y longitud vacías. El nuevo flujo usa exclusivamente esa sede para publicaciones nuevas. El punto aproximado del campus es `3.403412, -76.547719`. El encuentro interior se guarda como texto. [Dirección de la USC](https://www.usc.edu.co/preguntas-frecuentes/) · [Coordenada pública](https://www.wikidata.org/wiki/Q5575968).

Ejecuta estos comandos desde la raíz del repositorio. Inicia la API y la web en terminales distintas.

```bash
node --env-file=.env scripts/configure-pampalinda.mjs
npm run dev:api
npm run dev:web
```

El primer comando completa únicamente la referencia vacía de la sede activa. Una segunda ejecución con `--test` en `ruteam_test` conservó la referencia. La base habitual se consultó en lectura y conserva sus datos.

## Flujo y archivos

- `publish-screen.tsx`, `trip-place-picker.tsx` y `trip-departure-picker.tsx` concentran la publicación en una pantalla. Incluyen buscador, selección por mapa, cálculo de la ruta tras autorizar el envío de coordenadas públicas, selección visual de horario, plazas y aporte opcional. La ruta declarada sigue disponible como alternativa.
- `mobility-map.tsx` convierte el punto tocado a coordenadas, mantiene el marcador en el sitio seleccionado y distingue el desplazamiento de la selección. `place-search.tsx` integra el buscador en cada selector.
- `publication-campus.ts`, el módulo `campus` y los servicios de `trips` aplican la sede real, las reglas por sentido y la validación vial. `configure-pampalinda.mjs` y `test-db.mjs` preparan la referencia en sus entornos respectivos.
- `home-screen.tsx`, `search-trips-screen.tsx` y `trip-detail.tsx` ordenan el descubrimiento, la elección del descenso, la toma de una plaza y la confirmación de la publicación.
- Se actualizaron las pruebas de publicación, participación y continuidad, y los documentos de configuración, API, progreso y alcance del producto.

## Evidencia y límites

Los proveedores reales respondieron HTTP 200. Photon devolvió Parque del Perro y OSRM devolvió una ruta de 4,95 km y unos 9 min 13 s desde la referencia pública del campus. La consulta de teselas devolvió un PNG en el nivel de zoom 15.

El recorrido de Playwright pasó en escritorio y en Chromium móvil emulado con NestJS y PostgreSQL reales, `DEMO_MODE=false`, dos cuentas registradas por la interfaz y proveedores cartográficos controlados. En DESDE_USC se publica con «Plazoleta de los Sabios», el pasajero elige un descenso autorizado y el conductor comprueba el cupo ocupado, inicia el viaje y registra abordaje, descenso y finalización. En HACIA_USC se marca el origen, se verifica la posición visual del marcador y se comprueba que la geometría publicada usa las coordenadas enviadas al motor vial. La participación usa el destino USC automático. Ambas sesiones conservan los resultados tras recargar.

Jest pasó 12 pruebas focalizadas de publicación, participación y cartografía, incluidas la validación de ruta firmada y la estimación por parada. Pasaron también dos pruebas de navegador para edición de recurrencia y publicación con aporte, coincidencia y aviso. El typecheck, ESLint focalizado, la exportación web y `git diff --check` pasaron. Al alternar entre los proveedores de pruebas y el entorno habitual, usa `npm run export:web -w @ruteam/client -- --clear` para regenerar la configuración incorporada por Metro.

El recorrido registra dos cuentas en la interfaz. Para repetirlo, prepara el PostgreSQL aislado y guarda el OTP de pruebas en un archivo temporal de acceso restringido.

```bash
npm run db:test:setup
umask 077
export RUTEAM_OTP_TEST_LOG="$(mktemp)"
npm run test:e2e -- tests/web/institutional-registration.spec.ts --project=desktop --project=mobile-web
rm -f "$RUTEAM_OTP_TEST_LOG"
unset RUTEAM_OTP_TEST_LOG
```

Android físico queda pendiente por disponibilidad de dispositivo. El archivo original del logo no estaba en el repositorio ni en los adjuntos disponibles. Para integrarlo, añade el PNG original en `frontend/assets/branding/ruteam-logo.png`.

El mensaje de commit recomendado es `feat(trips): simplify Pampalinda publication and booking`.
