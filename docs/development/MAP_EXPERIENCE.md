# Experiencia cartográfica

`MobilityMap` comparte proyección Web Mercator, teselas XYZ, marcadores y LineString entre
web y móvil. Se usa en Inicio, exploración, selección de lugares, previsualización de
publicación, detalle y operación. `map-gestures` administra desplazamiento y zoom por
pinza; los botones permiten ajustar, acercar, alejar, mover/seleccionar el centro en
el selector y localizar bajo consentimiento.

El trazado se basa exclusivamente en geometría publicada o en una alternativa que
devolvió OSRM. Cada marcador muestra el tipo y etiqueta del punto. Un punto interior
puede seguir siendo texto libre ligado al campus. Sin geometría, se pueden mostrar
marcadores y paradas ordenadas. Una LineString dibuja el recorrido persistido; la
vista del conductor presenta las maniobras disponibles de la alternativa firmada. Los tiempos estimados y llegadas registradas
mantienen su distinción. El progreso se lee del contrato de operación.

Sigue vigente `EXPO_PUBLIC_ROUTE_TILE_URL`, plantilla HTTP(S) con {z}, {x}, {y}, y
`EXPO_PUBLIC_ROUTE_TILE_ATTRIBUTION`. Usar un servicio o alojamiento autorizado
y condiciones de licencia/atribución/uso. Sin variables se indica indisponibilidad
del mapa base; no se genera cartografía de sustitución. La capa mantiene su estilo
en tema oscuro. Photon conserva el envío explícito de búsqueda y su atribución.
El asistente conserva la selección firmada de OSRM y las validaciones de NestJS.
[Política de teselas OSM](https://operations.osmfoundation.org/policies/tiles/).

Localizar desde Inicio solicita permiso de primer plano por acción explícita. La vista
centrada en un GPS privado y las vistas con una muestra compartida omiten teselas
remotas. La posición local no se registra ni comparte. La operación conserva el flujo
autorizado de compartición existente. La navegación externa actual abre Google Maps
sólo después de confirmar una parada pública externa con coordenadas. Se envía
únicamente ese destino y no se modifica el itinerario de RuTeam.
[Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).

Para destinos externos se eligió una URL multiplataforma de Google Maps. Waze
dispone de enlaces profundos y Apple ofrece URLs para sus dispositivos. Se
mantiene una sola salida explícita en este corte para evitar diferentes reglas
de descubrimiento y apertura según plataforma. [Waze](https://developers.google.com/waze/deeplinks)
· [Apple Maps](https://developer.apple.com/documentation/mapkit/unified-map-urls).

## Maniobras y proveedores

Nest usa `steps=true` y normaliza orden, tramo, tipo, modificador, vía, distancia,
duración, punto, geometría y asociación de parada. Firma esos datos junto a la
ruta. El progreso usa precisión, antigüedad, sentido y continuidad. Si la posición
es ambigua o fuera de la ruta se informa y se conserva la geometría.

El 27/11 se consultaron lugares públicos de Cali. Photon respondió 200 para
Estadio Olímpico Pascual Guerrero y Parque del Perro. FOSSGIS/OSRM respondió
200 con un tramo, ocho maniobras y 1.758,3 m. OpenStreetMap devolvió una tesela
PNG con 200. Los adaptadores Nest también interpretaron un resultado Photon y
una alternativa OSRM con las ocho maniobras. Las suites de regresión usan
proveedores controlados.
[OSRM](https://project-osrm.org/docs/v5.24.0/api/) ·
[FOSSGIS](https://routing.openstreetmap.de/about.html) ·
[Photon](https://github.com/komoot/photon) ·
[Teselas](https://operations.osmfoundation.org/policies/tiles/).

Las bases usadas para ese ensayo con datos públicos fueron
`GEOCODING_BASE_URL=https://photon.komoot.io`,
`ROUTING_BASE_URL=https://routing.openstreetmap.de/routed-car` y la plantilla
`https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Las políticas del proveedor
rigen su uso y estas bases se probaron sólo en el proceso de validación.

## Continuidad del 28/11

La publicación muestra las alternativas con sus paradas, distancias, duraciones
e indicaciones de OSRM. La alternativa seleccionada sigue visible al volver al
paso del recorrido. Si cambian los puntos o su orden, el asistente pide una
selección vigente. Los encuentros interiores se marcan con la referencia
geográfica autorizada que ya tenga el catálogo. En el entorno habitual,
Pampalinda, Sede Centro y Palmira están registradas sin coordenadas autorizadas.

Los controles de GPS y de lugares habituales abren una vista local. El mapa
público se abre por separado y empieza desde una referencia pública. Si una
cámara deriva de una posición privada, conserva la protección al pausar el
seguimiento o caducar la muestra. Ajustar al recorrido recupera su encuadre.

La navegación distingue la observación de la proyección estimada. El ETA de
posición usa el tiempo restante de las maniobras firmadas cuando la proyección
es reciente y corresponde a la próxima parada operativa. La hora publicada
sigue visible como referencia. La estimación no registra llegadas ni altera
la ruta o el estado de las participaciones.

En una consulta pública limitada, Photon encontró el Parque del Perro y el
Estadio Olímpico Pascual Guerrero en Cali. OSRM devolvió una ruta de 1.435,7 m,
199,5 s, 42 puntos y nueve maniobras. La tesela XYZ solicitada respondió 200
con PNG de 256 × 256 y cabeceras de caché.
[Photon](https://github.com/komoot/photon) ·
[FOSSGIS](https://routing.openstreetmap.de/about.html) ·
[OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
