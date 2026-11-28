# Publicación sin reglas adicionales

La consulta de solo lectura confirmó que la base habitual tenía cero reglas. El formulario enviaba `ruleIds: []`, pero el repositorio buscaba `DEFAULT` y el servicio exigía que encontrara una fila. Esa regla procedía del seed sintético.

- `trips.service.ts` y `trips.repository.ts` guardan cero condiciones cuando la selección está vacía y verifican que toda regla seleccionada exista y esté activa.
- `publish-screen.tsx` muestra un aviso sobre visibilidad y conserva la autorización informada al solicitar el cálculo vial. El itinerario declarado sigue disponible.
- `itinerary.dto.ts`, `routes.ts` y `recurring-trips.service.ts` retiran el campo de la publicación actual. El DTO aún acepta el valor anterior `true` si un cliente antiguo lo envía.
- Las pruebas focalizadas cubren ambos sentidos, tres plazas, paradas opcionales, recarga, participación y cupos. Para reproducir el catálogo vacío se deshabilitaron temporalmente las reglas ya existentes únicamente en el PostgreSQL aislado.

Ejecuta estos comandos desde la raíz en terminales distintas.

```bash
npm run dev:api
npm run dev:web
```

El cambio se aplica al reiniciar ambos procesos con el código actualizado.
