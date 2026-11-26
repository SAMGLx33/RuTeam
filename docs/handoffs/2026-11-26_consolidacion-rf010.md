# RF-010 · Calificaciones y reputación por capacidad

26/11/2026, America/Bogota. Codex. Responsabilidad humana POR_ASIGNAR.
Rama `task/driver-defined-routes`, HEAD inicial `5af65f2d1c11f3b6091af21605a3eab21a50e163`.
Cambio local; revisión e integración pendientes.

Se cotejó RF-010 en la ERS. El encargo del 26/11 fija 1–5 estrellas enteras y
media aritmética por capacidad. Se evalúa al conductor o a quien abordó como
pasajero en viaje completado. El comentario queda en el historial del autor.
La reputación muestra promedio y recuento de filas válidas, con resultado vacío
explícito. No se aplica una política automática de sanción.

El incremento vive en `backend/src/modules/ratings`, contrato `ratings.ts`,
migración `20261126010000_trip_ratings` y rutas Expo `/ratings` y
`/ratings/[tripId]`. Proyecta conductor en feed/detalle/búsqueda y pasajero en
contexto autorizado. La unicidad viaje+emisor+receptor se protege en PostgreSQL
y el cierre emite aviso persistente dentro de la transición.

Validación dirigida. Pasaron cuatro pruebas unitarias/HTTP y dos pruebas
Playwright tras finalizar un viaje, evaluar, recargar y comprobar el promedio.
La [revisión integrada](../reviews/PRODUCT_CONSOLIDATION.md) contiene los totales
finales, limitaciones y comandos. Revisión de publicación de comentarios y
política de retención institucional corresponden a Producto y Privacidad.
