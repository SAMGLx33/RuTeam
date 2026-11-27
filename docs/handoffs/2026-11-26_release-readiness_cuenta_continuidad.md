# Relevo · RF-020 · gestión de cuenta

- Fecha 26/11/2026, America/Bogota
- Rama `task/release-readiness` sobre `f7013ea`
- Área Auth
- Estado local para revisión

## Implementación

El cierre exige contraseña y confirmación, revoca credenciales de sesión, pausa recurrencias y resuelve compromisos futuros mediante reglas de Reservations. Un viaje activo bloquea el cierre. Tras retirar una solicitud abierta se admite recuperar la cuenta y volver a autenticar. El estado cuenta distingue el registro de la solicitud de la ejecución de borrado.

## Integración y evidencia

Auth, Reservations, Trips y Groups. `/auth/lifecycle`, pantallas de configuración y recuperación, migración `20261126141000_account_lifecycle`. HTTP comprueba sesión revocada, cierre bloqueado, solicitud y recuperación. Decidir la conservación antes de implementar el borrado.

Para reproducir usa los [comandos y criterios del plan](../development/TEST_PLAN.md#pruebas-de-continuidad-del-producto). El estado de integración se mantiene en [preparación de entrega](../reviews/RELEASE_READINESS.md).

Cuando el conductor pierde elegibilidad durante un viaje, Cuenta y privacidad mantiene el flujo de interrupción segura usando la sesión de identidad. La misma API comprueba titularidad, motivo y confirmación. El cierre de la cuenta vuelve a estar disponible después de resolver el viaje.
