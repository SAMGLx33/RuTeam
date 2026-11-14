# Evidencia real — 2026-11-13 (America/Bogota)

Estado del corte: PARCIAL; no integrado por PR en dev. Sin despliegue ni push.
Entorno Linux VirtualBox, Node22.22.3, npm12.2.2, PostgreSQL18.6 local temporal55432.
Referencia inicial7967674 y remoto existente preservados.

## Versiones instaladas

| Paquete          | Versión |
| ---------------- | ------- |
| @nestjs/core     | 11.2.10 |
| @prisma/client   | 7.10.1  |
| prisma           | 7.10.1  |
| expo             | 54.0.38 |
| expo-router      | 6.0.24  |
| react            | 19.1.0  |
| react-native     | 0.81.5  |
| react-native-web | 0.21.4  |
| typescript       | 5.9.3   |
| jest             | 30.5.2  |
| @playwright/test | 1.65.1  |

## Resultados observados

| Comando/acción                                | Resultado                                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| npm install / lockfile real                   | Instalación ejecutada; npm12 bloqueó scripts de dependencias no aprobados                                   |
| npm run db:generate                           | Prisma7.10.1 generado con --config prisma.config.ts                                                         |
| migrate dev inicial + db:migrate              | Dos migraciones aplicadas a desarrollo y test; sin reset                                                    |
| npm run db:seed (repetido)                    | Cuatro identidades + destino DEMO, conserva existentes                                                      |
| npm run db:test:setup                         | BD_test separada preparada sin borrar datos                                                                 |
| npm test                                      | 3 suites,27/27 aprobadas; HTTP/Supertest y PostgreSQL reales                                                |
| npm run test:e2e                              | 2/2 aprobadas, Chromium escritorio1280x720 e iPhone 13 web390x664                                           |
| npm run smoke                                 | 6/6 aprobadas contra API3000 y BDdesarrollo                                                                 |
| curl docs-json                                | 200 y documento OpenAPI real                                                                                |
| npm run lint / npm run typecheck              | Ejecutados sin errores; estáticos, no prueba de runtime                                                     |
| npm run build:web                             | Export Metro correcto,838 módulos; no Vite/Next                                                             |
| expo export --platform android --platform ios | Ambos bundles Hermes exportados;export final: 1120 Android / 879 iOS (caché Metro); ambos bundles generados |
| expo install --fix                            | Dependencies are up to date (SDK54)                                                                         |
| expo-doctor                                   | 18/18 checks passed                                                                                         |

Jest ESM emite aviso experimental de VM Modules de Node; no falla el test.
Playwright: Browser plugin no disponible; Chromium descargado en /tmp/ruteam-playwright.
Pruebas iniciales RED: auth404 antes de conectar módulos; logout de afiliación inactiva403;
web mantenía perfil tras logout por retirar query observado. Corregidos con pruebas GREEN.
No se presentan esos fallos previos como funcionalidad pendiente.

Prueba UI: login Laura403→Ana activa→GETauth/me200→editar→guardar→recargar→mismo valor
PostgreSQL; segundo contexto Diego docente/conductor demo aislado; logout en ambos.
Se revisaron capturas reales escritorio y móvil sin clipping/overlay. Capturas de sesión
(no versionadas) en /tmp/ruteam-desktop-{login,profile}.png y
/tmp/ruteam-mobile-web-{login,profile}.png. Son web móvil, no un teléfono con Expo Go.
Consola: ninguna excepción pageerror en el contexto principal; HTTP401 inicial sin sesión
y403 de inactivo son respuestas esperadas. No se afirma ausencia global de warnings de navegador.

## Auditoría de dependencias

npm audit inicial44:1baja,34moderadas,9altas. Prisma7.9.1→7.10.1 y correcciones
compatibles sin --force redujeron a40:1baja,34moderadas,5altas,0críticas. Audit exit1
por alertas remanentes, no se etiqueta como aprobado. Incluye cadena Expo Router /
query-string / decode-uri-component, postcss y image-size; otras cadenas de herramientas
Expo/Jest/TypeScript. No se forzó Expo Router58 ni Expo52 propuestos por npm porque
rompen SDK54. Evaluación y correcciones compatibles siguen pendientes (D11).
No se ha realizado un scan de seguridad exhaustivo ni se afirma seguridad productiva.

## Límites de verificación

Expo Go físico/versiones reales no disponibles; no cámara/GPS/SecureStore en dispositivo,
no Windows, no carga/RNF, no concurrencia cupos aún (reservas no implementadas).
Sin referencias ERS/UML/rúbrica;30+20 posiciones de matriz son inventario provisional.
Pipeline GitHub aún no ejecutado en remoto. Protecciones de ramas no configuradas.
Red detectada autorizadamente:10.0.2.15/24 en VM, no demuestra acceso LAN de un teléfono.
API y PostgreSQL se usaron en puertos3000 y55432. Pruebas web levantaron3100/8082 y los
cerraron al finalizar; no confundir con demo8081. API3000, web8081 y PostgreSQL55432 se dejan iniciados para revisión local.
Pruebas3100/8082 sí cerraron sus servidores. Detención y reinicio en SETUP.
