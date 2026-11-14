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
