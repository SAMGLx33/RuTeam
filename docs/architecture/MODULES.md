# Módulos

Implementados para primer flujo: auth (controller/service/repository/DTO), profiles
(controller/service/repository/DTO), campus (catálogo lectura), health readiness,
infrastructure Prisma/config/verificación, common guard/filtro/validación global.
Dominio puro actual: política de afiliación activa/vigente.

Planificados: users ampliado, vehicles, trips, matching, reservations, ride-execution,
boarding, costs, compensations, chat, ratings, safety, administration. No están
implementados por existir sus carpetas. Por módulo se conserva estructura MVC:
controllers, application, domain/models/policies/events, infrastructure/repositories,
dto y tests. Evitar convertir el servicio auth en un módulo de viajes general.

Fase2 añade VehiclesModule y TripsModule: controladores delgados, servicios de aplicación,
políticas puras y repositorios. UI Expo compartida y revisión administrativa exclusivamente
de documentos DEMO, sin implementar todavía dashboard admin de RF-017.
La unidad transaccional de publicación agrega lecturas de identidad, licencia, vehículo y
campus; no expone Prisma a React ni escribe tablas de otro frente sin responsabilidad.
