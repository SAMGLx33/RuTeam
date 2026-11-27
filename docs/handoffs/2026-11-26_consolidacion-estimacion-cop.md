# Estimación privada de costos

26/11/2026, America/Bogota. Codex. Economía y PO, POR_ASIGNAR.
`task/driver-defined-routes`, base `5af65f2`. Cambio local sin promoción.

`ExpensesModule` mantiene un registro por viaje. El conductor guarda tres
importes enteros COP antes de iniciar. Nest autoriza propietario y estado y
calcula el total. El dato aparece en `/expenses/[tripId]` tras recarga y no
se publica en las condiciones de la participación. La migración aditiva
`20261126020000_trip_expense_estimates` añade FKs y límites por concepto.

`expenses-policy.test.mjs`, `expenses.e2e.test.mjs` y el recorrido
`ratings.spec.ts` cubren cálculo exacto, visibilidad y persistencia. Resultados
en [consolidación](../reviews/PRODUCT_CONSOLIDATION.md). La distribución, gastos
definitivos, declaraciones y confirmación esperan política de Producto.
Comparar las [alternativas de reparto](../development/COMPENSACIONES_COP.md).
