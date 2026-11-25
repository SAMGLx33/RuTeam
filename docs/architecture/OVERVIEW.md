# Arquitectura vigente de RuTeam

[PRODUCT_DEFINITION](../requirements/PRODUCT_DEFINITION.md) establece el dominio.
Este diseño actualiza responsabilidades al 25/11; su ejecución y pruebas se acreditan
por incremento en API/PROGRESS/EVIDENCE. No confundir diseño objetivo con cobertura.

Una app React Native/Web Expo RouterSDK 54 → REST NestJS /api/v1 → servicios de
aplicación/dominio → repositorios Prisma 7/adapter-pg → PostgreSQL. Monolito modular,
TypeScript strict, contratos compartidos; sin segundo frontend ni microservicios.

- Modelo: entidades, invariantes, políticas y casos de uso; repositorios/infraestructura
  persisten. Controladores delgados traducen HTTP/DTO/actor. Vista: React/Expo,
  interacción y estados visuales; Nest conserva autoridad de elegibilidad y cupos.
- Identidad: una cuenta estudiantil y dos capacidades compatibles. Separar control de
  correo, autenticación, estamento, matrícula y conducción. Provider institucional
  autorizado pendiente; real falla cerrado. DEMO sólo aislado en desarrollo/tests.
- Sesión: opaca, hash en BD, expiración y revocación. Cookie HttpOnly/SameSite web,
  SecureStore nativo, Origin/cabecera/CORS y límites. Logout propio tras baja sin acceso
  a datos. Seguridad productiva exige TLS/cookies seguras y fuente institucional real.
- Viajes/campus: DESDE_USC/HACIA_USC por identidad del campus, texto libre para encuentro
  interior, mapa aproximado cuando corresponda. Ruta/condiciones del conductor quedan
  persistidas. Puntos de paso y paradas reservables son distintos. Matching es lectura.
- Participación: confirmación directa bajo lock conductor→viaje, reloj/estado/paradas,
  elegibilidad y capacidad revalidados; idempotencia y retiro conservan historial.
  Grupo completo sólo con consentimiento explícito y atomicidad. Ninguna aprobación
  ordinaria por el propietario.
- Propuestas: entidad/proceso separado, sólo HACIA_USC. Decide el propietario sobre
  punto compatible; no modifica geometría ni ocupa plaza. Participación posterior
  requiere una confirmación normal con disponibilidad.
- Vehículos: autogestión, formatos/propiedad/capacidad y vigencias; separar declaración
  de acreditación oficial. Se retira revisión administrativa como dependencia funcional.
  Preservar auditoría histórica sin permisos de administración.

Fuentes USC, validación documental, motor vial, teselas y geocodificación son adaptadores
con contratos, límites y errores explícitos. No sustituir fallo externo por éxito.
La vista de un mapa no prueba ruta vial, geolocalización real ni exactitud de catálogo.

Chat/ratings/economía/seguridad se conectan a participantes y estados autorizados según
su implementación efectiva. QR de abordaje es interno y distinto del carné USC;
SOS no implica despacho y compensaciones no implican pasarela. Datos mínimos/consentidos.

Ver [módulos](MODULES.md), [datos](DATA_MODEL.md) y [ADR0003](ADRs/0003-student-participation-redefinition.md).
ADR0001/0002 y [guías previas](../history/2026-11-24-guides.md) conservan antecedentes;
las reglas incompatibles quedaron sustituidas por la redefinición.
