# Relevo · Cartografía, avisos y navegación

- Fecha 26/11/2026, America/Bogota
- Rama `task/release-readiness` sobre `f7013ea`
- Área Frontend y Mobility
- Estado local para revisión

## Implementación

La ubicación del dispositivo centra el selector tras autorización y deja la selección pública a la persona. Los recorridos guardados permiten reutilizar geometría y tiempos sin nueva consulta de rutas. Viajes recurrentes, cuenta, incidencias y economía usan la bandeja durable y enlaces por contexto.

## Integración y evidencia

SDK 54 y API actual. Para push remoto Android e iOS requieren un development build y credenciales. La bandeja interna está disponible en web y Expo Go. Chromium cubre navegación. Pendiente comprobar permisos y compartir en dispositivos físicos. [Expo FAQ](https://docs.expo.dev/push-notifications/faq/)

Para reproducir usa los [comandos y criterios del plan](../development/TEST_PLAN.md#pruebas-de-continuidad-del-producto). El estado de integración se mantiene en [preparación de entrega](../reviews/RELEASE_READINESS.md).
