# Frontend compartido Expo — reglas vigentes

Leer ../AGENTS.md, PRODUCT_DEFINITION, API, coordinación y handoff reciente.
Una app Expo Router SDK 54, React 19.1/RN 0.81.5, para web y móvil. frontend/app sólo
rutas/layouts ligeros; screens en src/features, UI en components, sesión en providers,
HTTP/adaptadores en services. No segundo frontend ni Prisma/SQL/backend dentro de React.
Mantener estructura interna útil; .web/.native sólo por necesidad de plataforma.

Nest decide elegibilidad, capacidad, confirmación y autorización por recurso.
TanStack Query para remoto; Context de sesión; RHF/Zod sólo validación de UX.
Una identidad estudiantil con capacidades de pasajero y conductor compatibles.
Sin menús/pantallas/login/revisión ADMIN. Login normal convencional (correo y contraseña
propia RuTeam), registro, verificación y recuperación cuando funcional. Sin selector de
identidades o botón desarrollo; pruebas usan el mismo formulario/ciclo de sesión y
providers aislados. No botones de identidad oficial inexistente ni bypass de vigencia.
Cuenta autenticada pendiente tiene pantalla de cuenta/verificación, sin feed protegido.
Preferencia de conducción no concede permisos; onboarding guarda y retoma sus pasos.
Leer AUTHORIZATION_MATRIX/FRONTEND_NAVIGATION/USER_FLOWS y BUSINESS_RULES.

Navegación con Inicio útil, Viajes disponibles (Para ti/Desde/Hacia/Todos), participaciones,
perfil/configuración y notificaciones reales; publicar/propios sólo para conducción
autorizada. Perfil fuera del inicio y vehículos desde habilitación/gestión correspondiente.
Feed consume API sin búsqueda manual obligatoria ni preferencias previas. Movilidad
privada configura campus/zonas/horarios/avisos, nunca solicitud de transporte. Conductor
conserva experiencia pasajero y distingue propios de participaciones ajenas. Web aprovecha
layout lateral y ancho; móvil pestañas principales/pantallas secundarias, una sola app.
Capturas e interacción de ambas vistas verifican menús y estados según capacidades.
No anunciar apartados futuros como funcionales.
Búsqueda filtra viajes existentes; acción ordinaria «Confirmar participación» directa.
El propietario consulta confirmados sin aprobarlos individualmente. Propuestas de parada
sólo HACIA_USC, decisión separada, sin indicar que aceptarla reserva automáticamente.
Mostrar cupos/estados devueltos por API, errores de conflicto y reintentos coherentes.

Publicación: modalidad, campus, encuentro textual libre, ubicación externa elegida,
recorrido/condiciones, vehículo y plazas; resumen antes de confirmar.
Sin campos manuales de latitud/longitud/GeoJSON/UUID/endpoint. Mapas, búsqueda de dirección,
resultados y marcadores obtienen coordenadas internamente. Encuentro interior no exige GPS;
señalar cuando el mapa sólo ubica campus. No línea recta como ruta vial ni recorrido
recalculado tras publicar. Proveedor fallido informa error y calidad de datos disponible.
Texto y proximidad geográfica no equivalen. No UUID como código de invitación grupal.

Cookie HttpOnly web; expo-secure-store nativo, nunca AsyncStorage para tokens.
URL API configurable: localhost en teléfono es el teléfono. No secretos en EXPO_PUBLIC_*,
extra ni frontend/.env. app.config.ts carga ../.env sin override; variables de proceso
explícitas prevalecen. Playwright impone API3100/Expo8082 en test aislado.

Estados loading/error/empty/success, accesibilidad, responsive y confirmación de acciones
sensibles. No identidades, documentos o datos privados ajenos ni credenciales en logs.
Cámara/GPS consentidos sólo cuando se implementen; no afirmar QR oficial ni emergencias.
Verificar typecheck/lint/expo install --check/Doctor/export/Playwright aplicables.
Export o viewport móvil no acredita Expo Go físico; registrar modelo/OS/versión y resultado.
Después de cada avance: pruebas y límites reales, contrato/docs/PROGRESS y handoff nuevo.
Revisores humanos POR_ASIGNAR; no Git compartido sin autorización.

Notificación interna persistente no es reserva, push, correo ni tiempo real. Reconsultar
detalle/estado actual al abrir; datos/razones de compatibilidad vienen de backend. Sin
preferencias o coincidencias, orientar a Todos y configuración, no inventar recomendaciones.
Al cambiar cuenta/elegibilidad, limpiar/cancelar caché privada y reevaluar navegación.
Probar negativos por UI y URL directa, más API; no declarar autorización por ocultar botón.

Buscar lugares sólo con una acción explícita y confirmar el resultado o marcador.
Mostrar la sede y su estado de configuración. Distinguir hora estimada de llegada
registrada. Las acciones de avance dependen de la parada alcanzada. Chat usa la misma
app y bandeja, con actualización periódica y modo de lectura al completar.

## Consolidación

Mantener estrellas accesibles, estado pendiente y confirmación persistida.
Presentar los resúmenes del servidor por capacidad. Crear grupos desde un
tramo válido y distinguir consentir de confirmar. El escáner QR va en
nativo y el abordaje manual sigue disponible. Solicitar ubicación en primer
plano por acción explícita. El usuario confirma antes de abrir el selector o
teléfono. Conservar las guías de QA en MOBILE_TESTING.

La revisión de publicación obtiene del servidor el total, plazas y aporte.
Mostrar condiciones públicas antes de confirmar una plaza o consentimiento
grupal. Usar el estado del servidor en compensaciones e incidencias. En
seguridad, confirmar antes de abrir marcador o selector y ocultar la muestra
GPS al vencer o perder autorización. Las pantallas de perfil y seguridad
manejan contactos propios con claves de consulta por cuenta.

## Continuidad del producto

Usa las pantallas secundarias de Perfil e Inicio y los componentes compartidos de publicación para las recurrencias. Pide confirmación en cuenta, retiro, cancelación e interrupción. Separa el permiso de centrar el mapa de la elección de un punto público. El resumen de una incidencia se previsualiza antes de compartir. La bandeja de avisos usa la API y funciona en web y Expo Go.

## Evolución ambiental y comunicación

Presentar los resultados y la cobertura ambiental de la API por rol y alcance. El flujo SSE invalida las consultas HTTP y mantiene su sondeo. Usar los componentes de abordaje, seguridad, localización y gestión existentes dentro del resumen de viaje. Los controles de preferencias deben guardar cambios reales. El registro push requiere un cliente nativo configurado con consentimiento.

## Rediseño de experiencia

Reutilizar `theme/tokens`, `theme/appearance` y `theme/primitives` para que la UI
responda a temas claro, oscuro y del sistema. `ProtectedPage` compone navegación
adaptable y conserva guardas. `MobilityMap` consume coordenadas y geometría publicadas
y mantiene la atribución configurada. Una posición privada no determina solicitudes
de teselas remotas. No añadir rutas, permisos ni operaciones de negocio para
completar una maqueta. Consultar DESIGN_SYSTEM, FRONTEND_NAVIGATION, MAP_EXPERIENCE
y FRONTEND_UX_INTEGRATION en docs/development.
## Operación, conexión y dispositivos

Mostrar salida programada, nueva estimación, inicio efectivo y vencimiento como
hechos distintos. Conservar la versión vista al empezar a editar. Una acción sin
respuesta se reconcilia con el backend antes de confirmar al usuario su resultado.
GPS en primer plano y adaptador de notificaciones tienen disponibilidad por
plataforma. Consultar la [guía de dispositivos](../docs/development/MOBILE_TESTING.md).
