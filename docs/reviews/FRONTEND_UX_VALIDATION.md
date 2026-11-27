# Validación del rediseño de RuTeam

27 de noviembre de 2026 · `task/frontend-ux-redesign` desde `2b69336`

## Criterios de contraste visual

Se comparó el concepto original con capturas de Expo Web. La composición conceptual
muestra tres superficies en una lámina; escritorio y teléfono se verifican en sus
ventanas independientes. El material no entró en el bundle como imagen de interfaz.

| Aspecto                  | Comparación y decisión                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad y distribución | Se conservan el signo de recorrido azul, el fondo neutro, el énfasis en el mapa y el panel breve de próximo viaje. Escritorio usa barra lateral y dos columnas.                                                                                   |
| Navegación               | Cinco etiquetas constantes y estado actual visible. En teléfono, la barra inferior conserva disponibilidad durante el desplazamiento. Los accesos secundarios conservan las rutas existentes.                                                     |
| Jerarquía y controles    | Tipografía de sistema, títulos breves y botones principales con objetivos de 44 pt. El texto primario sobre selección clara mide 4,71:1 y el botón azul con texto blanco alcanza 5,71:1.                                                          |
| Acceso y primeros textos | Conserva «Muévete con tu comunidad» y «Iniciar sesión». Los enlaces de recuperación y estado de cuenta están presentes por el flujo real. Nombres, avisos y viajes dependen de sesión y API; no se copian las personas ni las rutas del concepto. |
| Móvil                    | El rótulo de Inicio pasa al encabezado y la altura del mapa se ajusta en pantallas bajas para acercar el próximo viaje. El panel se pliega con control accesible; publicación mantiene su indicador de paso.                                      |
| Mapas y datos            | Las capas de prueba son teselas XYZ controladas. Los marcadores y la polilínea se alimentan de la geometría seleccionada o publicada y los datos de viaje. Sin proveedor se informa el estado; el concepto no se usa como mapa.                   |
| Tema oscuro              | El contraste se aplica a navegación, tarjetas, estados, entradas y CTA. El QR mantiene fondo claro e impresión oscura; el proveedor conserva el color de sus teselas.                                                                             |

## Infraestructura de prueba

Browser plugin no disponible. Playwright Chromium usa Expo web, NestJS y PostgreSQL
temporal, con usuarios que entran por el formulario convencional. Se aplican las
migraciones existentes en una base distinta de desarrollo. Geocodificación, rutas y
teselas de la prueba se controlan para verificar el cliente de forma repetible.
Los archivos de captura incluyen datos de esas cuentas sintéticas.

El selector comprueba la tesela bajo el punto antes de confirmar coordenadas. Si
falla una tesela lateral, el centro sigue disponible una vez cargada su tesela. El
reloj local de Inicio actualiza qué viaje aparece como próximo.

## Verificación técnica

| Comando                                                | Resultado                          |
| ------------------------------------------------------ | ---------------------------------- |
| `npm run typecheck`                                    | API, cliente y contratos correctos |
| `npm run lint`                                         | Sin alertas de ESLint              |
| `npm run format:check`                                 | Formato verificado                 |
| `npm run build:web`                                    | Exportación de Expo Web correcta   |
| `npm exec -w @ruteam/client -- expo export -p android` | Bundle Hermes generado             |
| `npm exec -w @ruteam/client -- expo export -p ios`     | Bundle Hermes generado             |
| `npx expo-doctor frontend`                             | 18 de 18 controles correctos       |
| `git diff --check`                                     | Sin errores de espacios            |

La suite completa de Playwright ejecutó 16 casos. Pasaron 14 en esa ejecución.
Los dos casos de seguridad fallaron porque la prueba contaba las teselas públicas
que se descargan en Inicio. Tras acotar la medición a `/safety/`, los dos pasaron
con `npm run test:e2e -- --last-failed` y cero solicitudes de teselas en esa vista.
La repetición de `npm run test:e2e -- tests/web/publication.spec.ts` pasó en
escritorio y móvil web con cobertura adicional de pase QR. La prueba verifica la
emisión en la ventana de abordaje, la hora de vencimiento, el ocultamiento del pase
y la ausencia del control de inicio de viaje en la sesión del pasajero.

## Capturas

Evidencia local en `frontend/.expo/ux-evidence/`, excluida de Git. El concepto se
conserva como `concepto.png`. En `desktop/` y `mobile-web/` se pueden consultar
`acceso.png`, `inicio.png`, `perfil-oscuro.png`, `publication-preview.png`,
`trip-detail.png`, `confirmed-detail.png`, `recorrido.png`, `trip-chat.png`,
`safety.jpg` y `private-incident.jpg`. Inicio, acceso y perfil se capturaron a
1280 × 800 y 390 × 664 CSS px. Playwright también comprobó el ancho de la interfaz
en 360 × 800, 768 × 1024 y 1920 × 1080.

## Límites

El video referido no se encontraba en los adjuntos ni en el checkout accesible.
Queda pendiente probar con teselas y proveedores operativos de Cali, un dispositivo
con Expo Go SDK 54 y datos reales de maniobras, cuando el contrato los entregue.
El otro computador sigue siendo la fuente de las extensiones no integradas, incluido
seguimiento continuo, recuperación offline, guardados y push.

[Inventario de integración](../development/FRONTEND_UX_INTEGRATION.md) ·
[Handoff](../handoffs/2026-11-27_frontend-ux-redesign.md).
