# Cierre del flujo de conductores y viajes

28/11/2026, America/Bogota. Rama `task/trip-operations`, HEAD de partida
`91bda2c`. Incremento local.

## Causas y correcciones

- Al abrir Vehículos y licencia con una cuenta nueva, el controlador devolvía
  HTTP 200 con cuerpo vacío. Nest Express omitía el cuerpo cuando el servicio
  devolvía `null`. El cliente fallaba al interpretar JSON y mostraba un error
  de conexión. El endpoint responde ahora con JSON `null` y el cliente
  distingue un JSON inválido de un fallo de red.
- Antes del ajuste, el formulario enviaba `DD/MM/AAAA` con un sufijo ISO sin
  normalizar la fecha. Esa solicitud devolvió HTTP 400. La fecha
  `AAAA-MM-DD` produjo HTTP 201. La UI acepta ambos formatos y presenta
  validación junto al campo. Nest evalúa el último milisegundo de la fecha
  calendario en Colombia para licencia y SOAT. El contrato de declaración
  contiene vencimiento y categoría para la licencia.
- La preferencia de conductor abre su configuración. La capacidad de publicar
  depende de licencia vigente y de un vehículo compatible con SOAT vigente.
  La UI refresca el estado de cuenta al guardar y muestra la acción pendiente.
  El asistente distingue categorías compatibles y el catálogo general de
  viajes abre aunque no haya recomendaciones.
- DESDE_USC permite descenso en las paradas autorizadas y en el destino.
  HACIA_USC permite abordar sólo en el origen y descender sólo en la USC.
  Sus puntos intermedios son de paso. Nest conserva el historial y bloquea
  nuevas propuestas e incorporaciones de recogida.

## Demostración y límites

Usa `npm run dev:api` y `npm run dev:web` con el acceso académico declarado.
Completa licencia y SOAT en la cuenta conductora. Abre Publicar viaje y
selecciona una sede con una referencia geográfica autorizada. Publica y
abre Viajes desde una sesión pasajera independiente. Selecciona el descenso
autorizado y confirma. En la cuenta conductora abre el viaje, comprueba el
participante y registra el abordaje manual dentro de la ventana permitida o
cuando el origen esté alcanzado. Registra las llegadas y el descenso antes de
finalizar.

Las tres sedes reales de esta instalación carecen de coordenadas aprobadas.
El responsable del catálogo puede habilitarlas mediante el procedimiento de
[configuración](../development/SETUP.md#habilitación-de-una-sede-usc-para-la-demostración).
Photon respondió 200 para Parque del Perro y Estadio Olímpico Pascual Guerrero.
OSRM respondió 200 con una ruta de 1.435,7 m y nueve maniobras. El ensayo web
usa un catálogo y proveedores sintéticos en PostgreSQL aislado.

El logo original está pendiente de entrega. La ruta esperada es
`frontend/assets/branding/ruteam-logo.png`. La ejecución física con Expo Go
queda pendiente de un Android disponible.

## Evidencia

- 39 pruebas focalizadas de backend aprobadas. La repetición de habilitación
  con la corrección del JSON de licencia aprobó sus cuatro casos.
- Playwright aprobó el recorrido de dos cuentas nuevas con OTP en escritorio
  y web móvil. En DESDE_USC se comprobó acceso por dominio declarado, licencia y SOAT,
  ruta firmada, descubrimiento, descenso intermedio elegido, plazas,
  recarga, abordaje manual, revocación de GPS y cierre. En HACIA_USC se
  confirmó la participación entre extremos y Nest rechazó el abordaje en el
  punto intermedio.
- Typecheck, lint focalizado, build web de pruebas y `git diff --check`
  completados.

## Archivos del incremento

- Nest en `modules/vehicles`, `modules/trips` y `modules/mobility`.
- Expo en `features/trips`, Inicio, Perfil, el campo de formulario y el
  cliente HTTP. Escenarios en `backend/test` y `tests/web`.
- Contrato y demostración en `API.md` y `SETUP.md`. Reglas en
  `PRODUCT_DEFINITION.md`, `BUSINESS_RULES.md` y `TRACEABILITY.md`.

Mensaje propuesto `fix(trips): unblock driver setup and enforce fixed USC routes`.
