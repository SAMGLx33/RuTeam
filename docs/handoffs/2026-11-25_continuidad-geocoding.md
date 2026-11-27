# Handoff | búsqueda de lugares y selección cartográfica

25/11/2026, America/Bogota. Incremento aislado sobre la transformación local de
`task/driver-defined-routes`, base `5af65f2` más los cambios del punto de control.
Responsable humano POR_ASIGNAR. La revisión de este incremento es independiente
de la propuesta de commit del árbol original.

## Cambios

- `POST /api/v1/geocoding/search` busca lugares con una sesión de estudiante
  vigente. Recibe `{ query }` de 3 a 120 caracteres. Devuelve hasta seis
  `GeocodedPlace` con etiqueta, contexto y coordenadas internas.
- Nest valida sesión y entrada, aplica un límite de doce consultas por minuto y
  llama al Photon configurado con timeout de cuatro segundos. Se descartan
  coordenadas y formatos inválidos y se distinguen resultado vacío (200),
  proveedor indisponible (503) y respuesta inválida (502). Los resultados
  llevan atribución a OpenStreetMap con enlace.
- `GEOCODING_BASE_URL` es opcional y no tiene valor de fábrica. Define la URL
  base autorizada, sin `/api`, credenciales, query ni fragmento. El adaptador
  utiliza Colombia como filtro y Cali como sesgo de ordenación. Negocia idioma
  por `Accept-Language` para permitir proveedores que no indexan traducción
  explícita al español. El proveedor público rechazó `lang=es` con HTTP 400.
- Los formularios compartidos de publicación y preferencias buscan al pulsar
  el botón o confirmar por teclado. Cuando se cambia el texto o se abandona el
  formulario, se cancela la búsqueda pendiente. Elegir un resultado completa
  el nombre y centra el mapa si hay teselas disponibles. El encuentro interno
  sigue siendo texto libre. Los puntos se agrupan por sede cuando el catálogo
  identifica su campus.
- Una zona habitual sólo textual se puede guardar. Editar su texto elimina
  el marcador anterior. El proveedor recibe una consulta iniciada por la
  persona y se indica que debe buscar referencias públicas. Sin caché de
  servidor ni persistencia de búsquedas. La geocodificación no sustituye la
  tesela, la trayectoria vial, la ubicación del dispositivo o el catálogo USC.

## Pruebas y límites

- Jest del adaptador usa un HTTP controlado sobre loopback. Cubre ausencia de
  configuración, resultados ambiguos, deduplicación, límites, formato inválido,
  proveedor indisponible y cancelación con cierre de conexión.
- La prueba Supertest del endpoint verifica que autorización y validación
  bloquean peticiones antes de contactar al proveedor. Usa PostgreSQL de
  pruebas para sesión y vigencia, y un Photon controlado sobre loopback.
- La comprobación externa se limitó al Estadio Olímpico Pascual Guerrero,
  un lugar público en Cali. Photon respondió con un resultado GeoJSON válido
  usando la negociación de idioma. La evidencia está en `geocoding-live.log`
  en el directorio local de consolidación. El servidor público admite uso
  limitado y no tiene garantía de servicio. Para operación continua se
  requiere un proveedor autorizado con capacidad suficiente.
- Quedan por validar físicamente Expo Go y la cobertura del proveedor
  finalmente seleccionado. Sin cambios sobre datos productivos ni migración
  asociada a este módulo.

[API Photon](https://github.com/komoot/photon/blob/master/docs/api-v1.md) ·
[Política del servidor público Photon](https://github.com/komoot/photon#demo-server) ·
[Atribución OpenStreetMap](https://www.openstreetmap.org/copyright)
