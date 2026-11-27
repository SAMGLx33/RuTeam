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

## Cuentas y movilidad en el corte local del 25/11/2026

Auth separa sesión de cuenta de autorización de producto. Viajes y participaciones
conservan la frontera de escritura y la capacidad transaccional. Mobility lee las
preferencias privadas y la geometría publicada; un worker local consume la cola durable
en PostgreSQL. Frontend presenta sesiones, capacidades y estados derivados por NestJS en
una app Expo. Ver [autorización](AUTHORIZATION_MATRIX.md), [navegación](FRONTEND_NAVIGATION.md)
y [flujo de recomendaciones](RECOMMENDATION_FLOW.md).

## Límites modulares de continuidad

Geocoding recibe texto explícito y consume un adaptador Photon. Viajes valida el extremo
institucional, sella la alternativa y persiste estimaciones. Participaciones gestiona
avance, abordaje, ausencia y cierre. Chat deriva la conversación de ese mismo viaje y
guarda mensajes y recibos bajo su política de acceso. Mobility prefiltra por sede y
horario, y expone avisos internos compartidos. Nest autoriza cada mutación y Expo presenta
el estado confirmado. Véase [revisión](../reviews/PRODUCT_CONTINUITY.md).

## Consolidación y revisión de MVC

`RatingsModule` calcula reputación desde filas válidas por capacidad histórica.
Las proyecciones de viajes agregan conductores en lote; el listado de participantes
consulta la reputación sólo dentro de la lectura autorizada. `GroupsModule` usa la
transacción de Participaciones y guarda una fila individual por integrante efectivo.
El QR reutiliza la misma comprobación del abordaje manual, con emisión y consumo
separados. `SafetyModule` delimita contexto y posición por viaje en curso.
`ExpensesModule` guarda importes exactos del conductor y suma conceptos.

Los DTOs validan forma, los controllers derivan el actor de sesión, los servicios
deciden las reglas y los repositorios persisten. Los guards limitan la lectura
externa; las mutaciones revalidan el estado de su recurso bajo bloqueo.
Expo presenta DTOs mediante servicios HTTP y usa la cámara o la ubicación sólo
cuando el usuario activa el control. El selector de compartir del dispositivo
se mantiene fuera del backend. Ver [matriz](AUTHORIZATION_MATRIX.md),
[modelo de datos](DATA_MODEL.md) y [revisión integrada](../reviews/PRODUCT_CONSOLIDATION.md).

## Cierre funcional

Los controllers económicos y de seguridad reciben DTO y actor. La aplicación
determina autorización de escritura y reglas de negocio. Prisma aplica
restricciones, ownership y transacciones. Los avisos de operaciones críticas
usan el mismo cliente transaccional que el cambio. La vista Expo consume los
contratos compartidos. Revisar [hallazgos MVC y privacidad](../reviews/RELEASE_AUDIT.md).
