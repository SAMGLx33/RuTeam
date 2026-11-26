# Estimación privada y decisión de compensaciones

26/11/2026, America/Bogota. Producto y Economía, POR_ASIGNAR. RF-008/009.
El registro de conductor suma combustible, peajes y estacionamiento en COP
enteros. La cifra es un total estimado privado, editable antes de iniciar.
La operación se guarda con el viaje en PostgreSQL. Las personas que consultan
o confirman plazas continúan viendo las condiciones ya aceptadas.

El RF-008 literal divide un costo derivado de kilómetros entre cupos ofertados.
La definición vigente aún requiere decidir la base y distribución definitiva.
La diferencia entre cupos ofertados y quienes efectivamente abordaron cambia
quién asume plazas vacías. Los métodos RF-009 pertenecen a la siguiente
decisión de visibilidad y confirmación.

| Alternativa para Producto                      | Cálculo candidato                                                                       | Asunto por resolver                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Equitativa entre pasajeros efectivos           | Gasto elegible dividido por participantes abordados                                     | Caso cero pasajeros, parte del conductor y ajuste al finalizar             |
| Equitativa entre quienes compartieron el viaje | Gasto elegible dividido por participantes abordados más conductor                       | Cuándo aplicar estacionamiento y costos de un tramo particular             |
| Proporcional por tramos                        | Cada tramo reparte sus costos entre ocupantes efectivos de ese tramo; sumar por persona | Fuente del costo por tramo, peajes únicos, ausencia y redondeo de residuos |

Para una futura política se propone que el backend congele la versión de
condiciones aceptadas, mantenga estimación previa separada de cierre definitivo
y distinga declaración de compensación de confirmación entre participantes.
Cualquier residual de reparto debe conservar la suma exacta en COP. La política
pendiente debe resolver cancelación, gastos admisibles y asignación de residuos.
Referencias en [ERS](../requirements/ERS_CATALOG.md#rf-008) y
[decisiones](../decisions/OPEN_DECISIONS.md).
