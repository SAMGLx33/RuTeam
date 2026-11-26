# Continuidad de cartografía, sedes y horarios

26/11/2026, America/Bogota. Agente Codex. Persona responsable POR_ASIGNAR. Rama
`task/driver-defined-routes`, base `5af65f2d1c11f3b6091af21605a3eab21a50e163`.

Viajes ofrece alternativas OSRM con duración por tramo. La selección con tramos
tiene firma de 30 minutos y valida actor, secuencia de coordenadas, geometría y
duración antes de guardar. Si el proveedor falla, el flujo muestra el estado y
permite publicar manualmente conforme a las reglas existentes. El formulario
conserva texto y previsualización, con una búsqueda explícita a través de Photon.

El catálogo conserva las tres sedes de la fuente pública USC y los puntos de
pruebas siguen asociados a su sede sintética. Los puntos interiores aceptan texto.
Las sedes públicas requieren coordenadas verificadas antes de enrutarse. Movilidad
evalúa hora estimada de recogida y sede en coincidencias directas, incluso al
cruzar medianoche en Colombia. Una coincidencia potencial carece de ETA fiable
hasta que exista una parada publicada con estimación.

Datos y código. `20261125235000_campus_and_stop_estimates`, módulos Campus, Trips,
Mobility y Geocoding, contratos `routes.ts` y `mobility.ts`, formulario y feed de
Expo. Pruebas `routing-selections.test.mjs`, `campus-timing.e2e.test.mjs`,
`mobility-policy.test.mjs`, `photon-geocoding*.test.mjs` y
`tests/web/publication.spec.ts`. La [revisión de continuidad](../reviews/PRODUCT_CONTINUITY.md)
enlaza los resultados, comandos y limitaciones de los ensayos externos.

Siguiente paso de Cartografía y Datos, POR_ASIGNAR. Validar las coordenadas de
embarque por sede con la Universidad y acordar el suministro operativo de teselas,
geocodificación y rutas. Referencia del catálogo al final. [Ubicaciones USC](https://www.usc.edu.co/preguntas-frecuentes/).
