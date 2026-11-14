# Cliente compartido Expo

Leer ../../AGENTS.md y handoff vigente. Una app Expo Router SDK 54, React 19.1,
RN 0.81.5 y Web. No frontend paralelo. Rutas y controles comunes; adaptadores
.web/.native sólo cuando son necesarios. No mover autoridad del backend al cliente.

TanStack Query para remoto; Context sesión. Formularios RHF/Zod sólo para UX,
servidor valida todo. Sesión web en cookie HttpOnly; móvil expo-secure-store;
jamás AsyncStorage para tokens. URL API configurable, localhost no es computador
en teléfono. No loguear credenciales. UI muestra estados loading/error/empty/success.

Mapas/cámara/GPS futuros: Leaflet web, react-native-maps nativo, expo-camera,
expo-location foreground. No simular pruebas físicas, pagos o afiliación oficial.
Verificar typecheck, lint, expo install --fix, expo-doctor, export y Playwright;
Expo Go físico debe etiquetarse NO VERIFICADO hasta probar dispositivo real y versión.
Actualizar docs y nuevo handoff en cada avance.
