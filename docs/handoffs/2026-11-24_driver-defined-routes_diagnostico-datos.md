# Handoff — diagnóstico y datos del itinerario

Rama `task/driver-defined-routes`, base `690d486` de feature confirmada en origin. Checkout inicial limpio. Fase 2 de publicación y refactor ya son ancestros de la base. Las notas de separación anterior son antecedentes. PostgreSQL de la configuración histórica no respondía. Se preparó un clúster temporal en loopback y se confirmó la línea base de 71 pruebas existentes. El nuevo caso TDD falló inicialmente por ausencia de la política que debía implementar.

Los originales ERS, UML, rúbrica, Product Backlog y registros Scrum no están presentes en las carpetas privadas de este checkout. Se preservaron los derivados cotejados. Se especificaron cambios a RF-003/004/005/006/012/015/018/027/029 y a sus diagramas. Alcance y calendario en el [plan](../development/DRIVER_DEFINED_ROUTES_PLAN.md) y [SPRINTS](../development/SPRINTS.md).

`backend/prisma/schema.prisma`, seed y primera migración `20261124203000_driver_itineraries` amplían catálogo, Trip y TripStop. Mantener historial sin atribuir geometría nueva a registros existentes. Contratos en `packages/contracts/src/routes.ts`. Se comprobó migración incremental y un fixture anterior conservó ID, FK, coordenadas y parada. Detalle en [ADR 0002](../architecture/ADRs/0002-driver-defined-itineraries.md).

Continuidad para Datos, Viajes e Integración. Revisar SQL y ratificar alcance USC en [OPEN_DECISIONS](../decisions/OPEN_DECISIONS.md). Nada promovido a rama compartida.
