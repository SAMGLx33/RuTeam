# RF-010 | implementación y antecedente de diseño

## Decisión resuelta el 26 de noviembre de 2026

El encargo de consolidación fija estrellas enteras de 1 a 5 inclusive, media
aritmética por capacidad evaluada y una evaluación por pareja y viaje.
Se habilita a conductor y pasajeros con abordaje de viajes completados.
La aplicación ofrece un comentario opcional de hasta 500 caracteres,
consultable por el evaluador en su historial. Las tarjetas y el perfil
muestran promedio y cantidad de evaluaciones. Cuando no existen notas,
muestran «Sin calificaciones».

`TripRating` persiste viaje, evaluador, evaluado, capacidad, estrellas,
comentario y fecha. La clave única de la pareja por viaje previene carreras.
Nest revalida pertenencia, abordaje y elegibilidad bajo bloqueo. La consulta
agrega las notas de cada capacidad y la vista redondea sólo al presentar.

- `GET /ratings` entrega un historial paginado que incluye objetivos pendientes.
- `GET /ratings/reputation` entrega los resúmenes propios de conductor y pasajero.
- `GET /trips/:tripId/ratings` consulta las evaluaciones autorizadas del viaje.
- `POST /trips/:tripId/ratings` registra la nota. Un duplicado conserva la primera
  evaluación y devuelve conflicto.

Consultar [trazabilidad](../requirements/TRACEABILITY.md#consolidación-funcional-26112026)
para los escenarios HTTP y web. La siguiente frontera requiere decisión sobre
retención y moderación del comentario.

## Diseño histórico anterior a la decisión

El siguiente bloque conserva el diseño preliminar, incluidos los contratos
propuestos antes del corte de implementación.

26 de noviembre de 2026, America/Bogota. Propuesta de continuidad para
`task/driver-defined-routes` en base `5af65f2`. Estado **pendiente de decisión PO**.
Responsabilidad humana Comunicación y PO, POR_ASIGNAR.

El [cotejo literal de RF-010](../requirements/ERS_CATALOG.md#rf-010--sistema-de-calificaciones)
define evaluación bidireccional entre conductor y pasajero tras completar el viaje,
un valor entero y un comentario. También pide retomar calificaciones pendientes
al volver a iniciar sesión. El
[registro de decisiones](../decisions/OPEN_DECISIONS.md)
mantiene abiertos el rango y la fórmula.

## Decisiones a resolver

| Tema          | Lectura literal o verificada                                                                                   | Alternativas de producto                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rango entero  | La condición escrita `5 > Valor estrella > 1` admite 2, 3 y 4.                                                 | El PO puede confirmar 2–4 o autorizar una corrección documental a 1–5, con el mismo rango en DTO, DB y accesibilidad.                                   |
| Promedio      | La fórmula del texto usa un promedio anterior como sumando y no conserva el total.                             | Calcular `SUM(estrellas) / COUNT(calificaciones)` desde registros válidos. La vista redondea a dos decimales y muestra también el recuento.             |
| Participantes | El texto autoriza conductor→pasajero y pasajero→conductor. El encargo exige participación efectiva y abordaje. | La primera entrega cubre sólo esos pares. Publicar comentarios y habilitar pares pasajero→pasajero quedan fuera hasta decisión expresamente autorizada. |
| Comentario    | La ERS pide un campo de texto y no fija visibilidad ni límite.                                                 | Confirmar si es opcional y cuánto se conserva. Propuesta de tope de 500 caracteres, con acceso privado como punto de partida.                           |

## Frontera técnica propuesta tras aceptación

- Modelo `TripRating` con viaje, evaluador, evaluado, puntuación, comentario y
  fecha. Clave única por viaje, evaluador y evaluado. FK a usuarios y viaje.
  El promedio no se materializa mientras una agregación sea suficiente.
- `POST /trips/:id/ratings` toma al evaluador de la sesión. Nest verifica
  elegibilidad actual, propiedad o participación en ese viaje, viaje completado,
  participante abordado y que el par tenga exactamente un conductor. Bloquea
  autocalificación, duplicados, ausencias y cancelaciones.
- `GET /ratings/pending` lista destinos de evaluación autorizados y sin
  evaluación existente. La consulta se reanuda al iniciar sesión y desde el
  historial. El resto de usuarios ve, en las superficies autorizadas, recuento
  y promedio. Cuando el recuento es cero se presenta «Sin calificaciones».
- Una sola transacción PostgreSQL valida y escribe, con el orden conductor →
  viaje de las operaciones existentes. Una infracción de la clave única
  devuelve 409 y conserva la evaluación original.
- Integración MVC en un módulo de calificaciones con DTOs y contratos
  compartidos. Pantallas de historial y detalle habilitan sólo las acciones
  que concede la API. La reputación en listas se consulta por lotes para
  evitar una agregación por tarjeta y evitar publicar comentarios privados.

## Criterios de aceptación pendientes de ejecutar

Pruebas HTTP con PostgreSQL de viaje programado, completado sin abordar,
ausencia, cancelación, abordaje efectivo, evaluador ajeno, autocalificación,
puntuación fuera del rango aprobado, duplicado concurrente y promedio exacto.
Prueba Playwright con dos sesiones, finalización real, recarga y evaluación
desde el historial. Validar visualmente la ausencia de puntuación en cuentas
nuevas.

Próxima acción humana: confirmar rango, fórmula y manejo del comentario en
`OPEN_DECISIONS.md`. La implementación, la migración y las pruebas quedan
pendientes de esa confirmación.
