# Integración del rediseño de frontend

Base `feature@2b69336`. Corte histórico del rediseño en `task/frontend-ux-redesign`. Estado integrado en [PRODUCT_INTEGRATION](PRODUCT_INTEGRATION.md).

## Cortes de implementación

1. Tema semántico claro y oscuro con preferencia local, navegación adaptable y componentes de interacción. Mantener las comprobaciones actuales de sesión y capacidades.
2. Acceso convencional e inicio por contexto. Mostrar recomendaciones, actividad y avisos de los contratos existentes. Contrastar escritorio y móvil con el concepto.
3. Compartir un mapa Web Mercator en Expo para marcadores, geometría, encuadre y selección. Conservar teselas XYZ configuradas, Photon, OSRM, GPS consentido y sus respuestas de error.
4. Organizar publicación, detalle, confirmación, actividad y operación en pasos o paneles. Reutilizar consultas, mutaciones y reglas de Nest.
5. Probar con cuentas convencionales en PostgreSQL aislado. Registrar capturas, disponibilidad móvil y puntos de integración pendientes sin tocar el trabajo del otro computador.

## Límites de la integración

No hay cambios de API, backend, Prisma, migraciones, lockfile o política del producto.
Se conserva `SessionProvider`, clientes HTTP, pantallas protegidas y operaciones
asíncronas existentes. Las vistas envían los mismos campos de creación y actualización
de viaje, publicación recurrente, confirmación directa, propuestas, acciones de
operación, avisos, QR y chat.

| Punto de unión               | Presentación y dependencia vigente                                                                                                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio y viaje activo        | `HomeScreen`, `TripOperationScreen`, `MobilityMap` y `RoutePreview` muestran publicaciones, participación, progreso y última ubicación autorizada. Están preparados para recibir progreso adicional al integrar el contrato, incluidos descensos, retrasos o expiraciones. |
| Exploración y detalle        | `useTripFeed` mantiene `/trips/feed`; el mapa de resultados consulta el detalle existente `/trips/:id`. `/trips/available` conserva filtros del buscador. No se añadieron guardados ni preferencias de búsqueda avanzada.                                                  |
| Publicación                  | `PublishForm` conserva mutaciones de vista previa económica, alternativas viales y guardado. `PublishProgress` y `PublishSummary` leen RHF. Tomar primero el contrato de edición aprobado en la otra rama y adaptar sólo esos puntos.                                      |
| Geocodificación y mapa       | `PlaceSearch` conserva `POST /geocoding/search` y resultados del servidor. `MeetingMapPicker` sólo envuelve el mapa y mantiene su callback. Integrar lugares habituales mediante un nuevo origen de candidatos cuando el otro frente esté disponible.                      |
| Actividad y agenda           | Las vistas leen `/activity` y `/agenda` existentes. Después de integrar recordatorios o borradores, agregar filas según los datos del contrato y conservar la distinción entre publicaciones y participaciones.                                                            |
| Mensajes y avisos            | Preservan paginación, invalidaciones SSE existentes, lectura y mutaciones. Incorporar push y recuperación offline cuando los clientes del otro frente estén disponibles.                                                                                                   |
| Perfil, economía y seguridad | Conservan cuenta, apariencia local, vehículos y licencia, reputación, historial/compensación, incidencias, contactos, pase y cámara. Las visualizaciones usan totales y series existentes.                                                                                 |

Tras recibir el otro frente, comparar primero endpoints y tipos contra `2b69336`,
componer sus consultas con las vistas nuevas y resolver los archivos compartidos
por funcionalidad. Revalidar login, elegibilidad, ubicación, permisos de cámara,
grupos, cancelación y trayecto activo en web y Expo Go. Repetir suites contra una base
aislada y registrar resultados. Confirmar las instrucciones para promocionar cambios
con el integrador.

## Inventario frontend y pruebas

### Nuevos

- `frontend/src/components/maps/map-gestures.ts`
- `frontend/src/components/maps/mercator.ts`
- `frontend/src/components/maps/mobility-map.tsx`
- `frontend/src/components/navigation/app-navigation.tsx`
- `frontend/src/components/ui/bottom-sheet.tsx`
- `frontend/src/components/ui/icon.tsx`
- `frontend/src/features/trips/public-stop-directions.tsx`
- `frontend/src/features/trips/publish-wizard.tsx`
- `frontend/src/features/trips/trip-surface.tsx`
- `frontend/src/theme/appearance-storage.native.ts`
- `frontend/src/theme/appearance-storage.ts`
- `frontend/src/theme/appearance-storage.web.ts`
- `frontend/src/theme/appearance.tsx`
- `frontend/src/theme/primitives.tsx`
- `tests/web/frontend-ux.spec.ts`

### Modificados

- `frontend/AGENTS.md`
- `frontend/app.config.ts`
- `frontend/app/_layout.tsx`
- `frontend/app/index.tsx`
- `frontend/src/components/forms/field.tsx`
- `frontend/src/components/forms/place-search.tsx`
- `frontend/src/components/ui/account-page.tsx`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/protected-page.tsx`
- `frontend/src/features/auth/account-lifecycle-screens.tsx`
- `frontend/src/features/auth/account-screens.tsx`
- `frontend/src/features/auth/login-screen.tsx`
- `frontend/src/features/auth/profile-screen.tsx`
- `frontend/src/features/boarding/boarding-camera.native.tsx`
- `frontend/src/features/boarding/boarding-camera.tsx`
- `frontend/src/features/boarding/boarding-pass.tsx`
- `frontend/src/features/chat/chat-screens.tsx`
- `frontend/src/features/expenses/compensation-screen.tsx`
- `frontend/src/features/expenses/economic-history-screen.tsx`
- `frontend/src/features/expenses/economic-terms.tsx`
- `frontend/src/features/expenses/expenses-screen.tsx`
- `frontend/src/features/groups/group-invitations.tsx`
- `frontend/src/features/groups/groups-screen.tsx`
- `frontend/src/features/home/home-screen.tsx`
- `frontend/src/features/home/notification-settings-screen.tsx`
- `frontend/src/features/home/notifications-screen.tsx`
- `frontend/src/features/mobility/daily-mobility-screens.tsx`
- `frontend/src/features/mobility/environment-panel.tsx`
- `frontend/src/features/mobility/mobility-screen.tsx`
- `frontend/src/features/mobility/mobility-statistics-screen.tsx`
- `frontend/src/features/mobility/vehicle-energy.tsx`
- `frontend/src/features/ratings/ratings-screens.tsx`
- `frontend/src/features/ratings/reputation-label.tsx`
- `frontend/src/features/safety/emergency-contacts.tsx`
- `frontend/src/features/safety/incident-summary.tsx`
- `frontend/src/features/safety/incidents-screen.tsx`
- `frontend/src/features/safety/personal-incidents-screen.tsx`
- `frontend/src/features/safety/trip-location.tsx`
- `frontend/src/features/safety/trip-safety-link.tsx`
- `frontend/src/features/safety/trip-safety-screen.tsx`
- `frontend/src/features/trips/cancellation-reasons.tsx`
- `frontend/src/features/trips/itinerary-form.tsx`
- `frontend/src/features/trips/meeting-map-picker.tsx`
- `frontend/src/features/trips/my-trips-screen.tsx`
- `frontend/src/features/trips/pickup-proposals.tsx`
- `frontend/src/features/trips/publish-screen.tsx`
- `frontend/src/features/trips/recurring-trips-screen.tsx`
- `frontend/src/features/trips/reservations-screen.tsx`
- `frontend/src/features/trips/route-preview.tsx`
- `frontend/src/features/trips/search-trips-screen.tsx`
- `frontend/src/features/trips/trip-detail.tsx`
- `frontend/src/features/trips/trip-feed.tsx`
- `frontend/src/features/trips/trip-operation-screen.tsx`
- `frontend/src/features/trips/vehicles-screen.tsx`
- `frontend/src/theme/tokens.ts`
- `tests/web/continuation.spec.ts`
- `tests/web/publication.spec.ts`
- `tests/web/safety.spec.ts`

### Documentación

- Nuevos `DESIGN_SYSTEM.md`, `UI_UX_GUIDELINES.md`, `FRONTEND_NAVIGATION.md`,
  `MAP_EXPERIENCE.md` y este inventario en `docs/development/`.
- Actualizado `docs/development/PROGRESS.md`.
- Nueva [validación visual y técnica](../reviews/FRONTEND_UX_VALIDATION.md) y nuevo
  [handoff de integración](../handoffs/2026-11-27_frontend-ux-redesign.md).
