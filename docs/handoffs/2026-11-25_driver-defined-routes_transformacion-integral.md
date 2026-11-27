# Handoff | cuentas, experiencia y recomendaciones

25/11/2026, America/Bogota. Codex integrador y agentes de identidad, movilidad y QA.
Responsable humano POR_ASIGNAR. Rama `task/driver-defined-routes`, base `5af65f2`.
Trabajo local en revisión. El árbol comenzó limpio; el índice continúa vacío.
Promoción propuesta `task/* → feature → dev → main` bajo revisión y autorización.

## Objetivo y fuentes

Sustituir la pantalla basada en identidades sintéticas por el flujo de cuentas,
integrar navegación por capacidades y conectar publicaciones reales con recomendaciones,
avisos y participación. Fuente vigente [Producto](../requirements/PRODUCT_DEFINITION.md).
Conservados los originales privados ERS, rúbrica y UML y los identificadores derivados.
La [revisión](../reviews/PRODUCT_TRANSFORMATION_DELIVERY.md) reúne recorridos, riesgos
y evidencia, y la [trazabilidad](../requirements/TRACEABILITY.md) mantiene divergencias.

## Archivos y cambios

- Backend. Cuenta/login/recuperación, autenticación separada de elegibilidad,
  transporte SMTP, onboarding, movilidad, búsqueda recomendada, avisos y cola.
  Viajes actualiza recomendación al publicar, liberar plaza y aceptar recogida.
  Inicio revalida documentación y la aceptación de recogida revalida disponibilidad.
- Datos. Una migración aditiva, `20261125140000_product_accounts_and_mobility`.
  PostgreSQL 18.6 en 55432, bases `ruteam` y `ruteam_test` separadas.
  Historial 10/10 checksums coincidentes en ambas. Seeds repetidos y pruebas en serie.
- Frontend. Una app Expo SDK 54 con inicio, registro, recuperación, verificación,
  onboarding, menú lateral y navegación móvil, paneles por capacidades,
  feed/detalle, perfil, movilidad y avisos. Se conservan publicación, búsqueda,
  participaciones y vehículos. `packages/contracts` sincroniza cuentas y movilidad.
- Documentación. AGENTS, README, API/SETUP, PROGRESS, TEST_PLAN, SPRINTS, frentes,
  requisitos, cruce UML y evidencia. CURRENT_STATUS corresponde al integrador
  de la rama compartida. Handoff de [movilidad](2026-11-25_mobility-recommendations-backend.md).

## Reproducción

Usar el clúster persistente autorizado o bases locales equivalentes separadas.
Seguir [SETUP](../development/SETUP.md) para origen/puertos, credencial exclusiva
de test y transporte SMTP. Ejecutar en orden:

```bash
npm run check:env
npm run db:generate
AUTH_FIXTURE_PASSWORD='<clave exclusiva de pruebas>' npm run db:test:setup
npm test
AUTH_FIXTURE_PASSWORD='<misma clave de pruebas>' npm run test:e2e
```

Para smoke, apuntar a una API aislada en ejecución y usar la misma credencial.
Capturas y consola de pruebas se conservaron fuera de Git. Las cifras y resultados
exactos constan en la revisión de entrega.

## Próxima intervención

La persona integradora debe revisar el diff de la migración y repetir Jest/Playwright
contra `ruteam_test` antes de autorizar el primer commit de este corte. Luego solicitar
revisión cruzada de identidad, Prisma, viajes y navegación. Propuesta de series:

1. `docs(product): specify student account and mobility flows`.
2. `feat(product): integrate student accounts, capabilities and trip recommendations`
   con migración, código, contratos y pruebas que dependen entre sí.
3. `docs(qa): record product transformation validation and handoff`.

Pendientes externos y funcionales: fuente oficial USC, SMTP operativo, documentos oficiales,
geocodificación/teselas y prueba Expo Go física. Se mantiene backlog de chat,
calificaciones, grupos, compensaciones, seguimiento, QR y SOS.

## Verificación observada

161/161 Jest, 4/4 Playwright en dos tamaños, smoke 6/6, Expo Doctor 18/18, builds
Nest/web y bundles Android/iOS aprobados. Chromium registró y autentificó cuentas
pendientes en ambos tamaños y comprobó 403 de feed. El informe conserva comandos,
alertas audit, limitaciones y el [inventario de archivos](../reviews/evidence/2026-11-25-transformation/changes.json).
