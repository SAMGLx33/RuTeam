# Handoff — publicación, mapa y matching

Rama `task/driver-defined-routes`. `trips` y `campus` resuelven puntos y conservan el itinerario elegido. Desde `/publish` se selecciona catálogo o punto público personalizado, orden, accesos, vías y vehículo, se consulta resumen y se confirma. Desde `/search-trips` se filtra por USC, punto, coordenadas, salida y cupos, con pares autorizados y sin replanificar. Las pruebas de dominio y API cubren ambos sentidos, sótano, geometría frente a punto autorizado y horario.

`POST trips/route-options` usa OSRM opcional, `GET trips/available` pagina el matching y `GET campus/meeting-points` devuelve el catálogo tipado. GeoJSON compartido y teselas opcionales se representan en la misma app Expo. Importación manual y lista de puntos siguen disponibles cuando el motor falta. Contratos y límites en [API](../development/API.md) y [ADR](../architecture/ADRs/0002-driver-defined-itineraries.md).

Continuidad para Recorrido/QA y Viajes. Validar motor y teselas con un proveedor y extracto de Cali, coordenadas institucionales reales bajo autorización, precisión y Expo Go físico. La geocodificación y ETA por parada permanecen pendientes. RF-003/005, RF-018 parcial y RNF-031/033/046/048 pendientes de métricas. Cambios no integrados.
