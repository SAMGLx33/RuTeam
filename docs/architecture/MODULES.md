# Módulos

Implementados para primer flujo: auth (controller/service/repository/DTO), profiles
(controller/service/repository/DTO), campus (catálogo lectura), health readiness,
infrastructure Prisma/config/verificación, common guard/filtro/validación global.
Dominio puro actual: política de afiliación activa/vigente.

Planificados: users ampliado, seguimiento de ride-execution,
boarding, costs, compensations, chat, ratings, safety, administration. No están
implementados por existir sus carpetas. Por módulo se conserva estructura MVC:
controllers, application, domain/models/policies/events, infrastructure/repositories,
dto y tests. Evitar convertir el servicio auth en un módulo de viajes general.

Fase2 añade VehiclesModule y TripsModule: controladores delgados, servicios de aplicación,
políticas puras y repositorios. UI Expo compartida y revisión administrativa exclusivamente
de documentos DEMO, sin implementar todavía dashboard admin de RF-017.
La unidad transaccional de publicación agrega lecturas de identidad, licencia, vehículo y
campus; no expone Prisma a React ni escribe tablas de otro frente sin responsabilidad.

Desde el corte del 24 de noviembre, TripsModule contiene la política de pares
ordenados y la lectura de matching sobre su agregado. CampusModule conserva
metadatos institucionales. ReservationsModule usa DTO, controller, aplicación y
repositorio propios. Los locks conservan el orden conductor → viaje. El agregado
de reserva persiste un grupo que decide el conductor y usa el itinerario existente.
