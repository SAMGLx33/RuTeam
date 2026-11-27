# Notificaciones nativas y navegación autorizada

27/11/2026, America/Bogota. Agentes Codex y native_push.
Responsable humano POR_ASIGNAR. Rama local `task/trip-operations` en
`2b69336ac7a4bc509d06e00bb58c296ffa05e633`. Trabajo en el árbol local.

Se incorporaron `expo-notifications`, `expo-device` y `expo-dev-client`
alineados con SDK 54. La bandeja de Expo Go sigue usando la API. El adaptador
nativo carga push sólo en un build elegible con configuración de proyecto y
solicita consentimiento por acción del usuario. Secreto de instalación y
asociación residen en SecureStore. El cliente gestiona revocación, cambios de
permiso, rotación y revalidación de la sesión.

El esquema interno `ruteam` admite viajes, chat, grupos, actividades e
historial mediante rutas validadas. Una pulsación en un aviso lleva su ID,
retoma tras login y vuelve a consultar su disponibilidad y autorización en
Nest. Las credenciales de FCM/APNs siguen en infraestructura autorizada.

`frontend/tests/notification-navigation.test.mts` cubre el parser y
`evolution.spec.ts` prueba navegación con sesión y un recurso ajeno.
Consultar pruebas y límites en el
[handoff de integración](2026-11-27_trip-operations_integracion.md).
Hace falta un equipo físico y un proyecto autorizado para verificar permisos,
recepción en primer y segundo plano, apertura en frío y rotación. Seguir
[las instrucciones de configuración](../development/NOTIFICATION_SETTINGS.md).
