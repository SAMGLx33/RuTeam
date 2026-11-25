# Incrementos de la redefinición del 25 de noviembre de 2026

Base local 72a31d7, task/driver-defined-routes. Aplicar la definición funcional
vigente en el monorepo existente. Separar cambios por módulo, revisar las
migraciones de forma central y ejecutar las suites con una sola base test a la vez.

1. Identidad y vehículos. Habilitar sólo estudiantes activos, retirar la revisión
   administrativa de la interfaz y API, preservar las relaciones de auditoría y
   separar datos declarados de verificación autorizada.
2. Participaciones. Usar el bloqueo de viaje existente al confirmar directamente,
   procesar reintentos, retirar participaciones y preservar filas históricas.
3. Viajes. Validar ambos sentidos en el servidor, conservar geometrías y permitir
   puntos de encuentro textuales. Introducir propuestas compatibles de recogida
   mediante una entidad separada.
4. Integración. Actualizar docs vigentes, adaptar suites HTTP/web y comprobar
   integridad real, concurrencia, navegador y compilación. Mantener historial y
   reportar bloqueos según el resultado observado.
