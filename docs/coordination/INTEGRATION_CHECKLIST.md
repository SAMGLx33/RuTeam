# Revisión e integración

- [ ] Rama task/* desde feature; git status e historial inspeccionados.
- [ ] Dueño y revisor humano confirmados; cambios limitados al frente.
- [ ] Contratos compatibles con ramas concurrentes; consumidores actualizados.
- [ ] Schema/migraciones revisados por integrador de datos, BD aislada migrada.
- [ ] Lint/typecheck/Jest/HTTP/PostgreSQL y flujo web ejecutados; Expo físico declarado.
- [ ] Último cupo concurrente probado realmente cuando se agreguen reservas.
- [ ] Referencias/UML y prioridades cotejadas o bloqueos registrados.
- [ ] Nuevo handoff + PROGRESS + trazabilidad/ADR incluidos en el mismo commit.
- [ ] Sin secretos, logs, dependencias, PII, outputs ni .gitkeep sobrantes.
- [ ] PR task→feature revisado; feature→dev prueba integración; dev→main demo y aprobación.
- [ ] Sólo integrador actualiza CURRENT_STATUS tras comprobar dev.

GitHub: responsable humano debe proteger main/dev/feature, exigir PR/revisor y job CI,
impedir force push y borrado. No se ha configurado ni verificado protección remota.
