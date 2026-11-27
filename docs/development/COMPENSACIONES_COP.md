# Costos y compensaciones en COP

Producto autorizó el cambio de RF-008 y RF-009 en el encargo del 26/11/2026.
El [requisito literal](../requirements/ERS_CATALOG.md#rf-008) y las alternativas
evaluadas en el [corte anterior](../reviews/PRODUCT_CONSOLIDATION.md) son antecedentes.

## Publicación

- El conductor puede elegir viaje gratuito o declarar combustible, peajes y estacionamiento.
  Cada importe se expresa en COP enteros de 0 a 100.000.000.
- Nest calcula el total sumando los tres gastos y el aporte por pasajero dividiendo
  el total por las plazas ofertadas más uno para incluir al conductor. Redondea el
  cociente hacia abajo al peso entero. Por ejemplo, 10.001 COP y tres plazas
  resultan en 2.500 COP por persona.
- La revisión previa muestra los tres gastos, total, plazas, importe y procedencia
  declarada por el conductor. La cartografía suministra datos del recorrido.
  La publicación económica funciona con el itinerario descrito y gastos declarados
  cuando el motor vial está indisponible.
- Con aporte positivo se ofrecen uno o dos métodos distintos de Nequi, DaviPlata y
  efectivo. Con importe cero se publica como gratuito, sin métodos.
- El detalle del pasajero y la vista previa grupal muestran el importe y métodos.
  PostgreSQL preserva ambos como parte inmutable del viaje. Un viaje histórico
  anterior al corte conserva el valor desconocido. Las plazas vacías y el residuo
  quedan a cargo del conductor. El importe publicado acompaña el historial.
- El desglose es privado. La estimación que produjo un aporte positivo queda fija.
  La estimación privada de un viaje gratuito o histórico se puede guardar antes
  de iniciar para llevar un registro sin cambiar sus condiciones publicadas.

## Registro posterior al viaje

El titular de una participación individual que abordó puede declarar el importe
sugerido usando un método publicado después de que el viaje se complete. Una
participación grupal confirmada cumple el mismo criterio por su registro individual.
El conductor puede reconocer la recepción o registrar discrepancia. El pasajero
puede cancelar una declaración aún sin resolver. El registro conserva estados y
fechas con acceso de las dos partes. La base garantiza una sola declaración por
participación, las decisiones terminales conservan el historial y los reintentos
idénticos devuelven el registro existente.

El aporte es voluntario. El dinero se gestiona fuera de RuTeam y la recepción
reconocida es una declaración del conductor. El registro carece de credenciales,
integración bancaria, multas, ajuste por ocupación y obligación por ausencia.
Consultar [API](API.md), [trazabilidad](../requirements/TRACEABILITY.md) y
[decisiones](../decisions/OPEN_DECISIONS.md).
