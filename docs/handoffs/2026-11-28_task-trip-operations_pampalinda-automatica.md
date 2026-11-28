# Pampalinda automática al iniciar RuTeam

La fila activa `USC-CALI-PAMPALINDA` de la base habitual tenía latitud y longitud nulas. El endpoint de publicación exigía ambas coordenadas y el arranque anterior dependía de un comando manual.

Al arrancar en `DECLARED_DOMAIN`, NestJS completa los campos geográficos vacíos del registro existente. Conserva su UUID, relaciones y coordenadas ya registradas. La ubicación pública aproximada es `3.403412, -76.547719`, en la sede principal de Cali. El encuentro interior sigue siendo texto libre. [Dirección USC](https://www.usc.edu.co/preguntas-frecuentes/) · [Coordenadas públicas](https://www.wikidata.org/wiki/Q5575968).

En una instalación nueva ejecuta `npm ci`, `npm run db:generate` y `npm run db:migrate` con la configuración habitual. En una base ya migrada, inicia estos procesos desde la raíz en terminales distintas.

```bash
npm run dev:api
npm run dev:web
```

- **Backend.** `publication-campus.ts`, `campus.service.ts` y `campus.repository.ts` incorporan la referencia y su inicialización. `scripts/test-db.mjs` prepara las pruebas con el mismo camino de arranque que la API habitual.
- **Frontend.** `publish-screen.tsx` muestra el extremo universitario fijo. `app-navigation.tsx` integra la versión recortada del logo adjunto desde `frontend/assets/branding/ruteam-logo.png`.
- **Pruebas.** `declared-access.e2e.test.mjs` parte de la fila sin coordenadas, comprueba su identidad y verifica en PostgreSQL que el segundo arranque no vuelve a escribirla. Dos cuentas publican, descubren y toman plaza en ambos sentidos con `DEMO_MODE=false`. `mobility-journey.ts` comprueba el extremo fijo y el logo en el formulario.

Pasaron la prueba HTTP focalizada, el recorrido Playwright en escritorio, el typecheck y `git diff --check`. Playwright arrancó NestJS con la referencia vacía en PostgreSQL aislado y proveedores cartográficos controlados. Desde la USC se conservó «Plazoleta de los Sabios». Hacia la USC se publicó con el destino automático y la referencia de llegada vacía. La segunda cuenta confirmó una plaza en cada viaje y la participación persistió al recargar. La base habitual se consultó en modo de solo lectura.
