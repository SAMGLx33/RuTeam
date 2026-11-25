# Frontend compartido Expo — reglas vigentes

Leer ../AGENTS.md, PRODUCT_DEFINITION, API, coordinación y handoff reciente.
Una app Expo Router SDK 54, React 19.1/RN 0.81.5, para web y móvil. frontend/app sólo
rutas/layouts ligeros; screens en src/features, UI en components, sesión en providers,
HTTP/adaptadores en services. No segundo frontend ni Prisma/SQL/backend dentro de React.
Mantener estructura interna útil; .web/.native sólo por necesidad de plataforma.

Nest decide elegibilidad, capacidad, confirmación y autorización por recurso.
TanStack Query para remoto; Context de sesión; RHF/Zod sólo validación de UX.
Una identidad estudiantil con capacidades de pasajero y conductor compatibles.
Sin menús/pantallas/login/revisión ADMIN. Login sintético sólo explícito en desarrollo
pruebas; no presentación normal del producto ni bypass de vigencia en producción.

Navegación orientada a buscar/publicar, mis viajes, mis participaciones, perfil/vehículos
y comunicación disponible. No anunciar apartados futuros como funcionales.
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
