# Sistema de diseño de RuTeam

27 de noviembre de 2026 · Expo SDK 54 · `task/frontend-ux-redesign`

La identidad usa un signo de recorrido en azul, líneas de navegación y marcadores
turquesa para los puntos de partida. La familia de iconos Feather ya se distribuye con
Expo. Inter se usa si está disponible en el sistema y cede a la fuente del navegador o
del dispositivo. La aplicación arranca sin descargar fuentes de Internet.

| Token            | Claro     | Oscuro    |
| ---------------- | --------- | --------- |
| Fondo            | `#f8fafc` | `#0b1120` |
| Superficie       | `#ffffff` | `#141e30` |
| Texto            | `#10243a` | `#eaf2fb` |
| Texto secundario | `#4f6278` | `#a8b8ce` |
| Selección        | `#eaf2ff` | `#203758` |
| Borde            | `#dce5ef` | `#2f4059` |

El botón principal usa azul `#125fda` con blanco. Enlaces, éxito, aviso y error tienen
tokens propios. Radios 12/16/22 para controles, paneles y hojas; espaciado 4, 8, 12,
16, 24 y 32. Superposiciones de mapa quedan dentro del área recortada de su panel.

`theme/appearance` aplica los temas Sistema, Claro y Oscuro. Guarda sólo esa preferencia
en localStorage web o SecureStore móvil, mediante claves independientes de la sesión.
`theme/primitives` aplica los tokens semánticos a los estilos de vista, texto, input,
enlace, scroll, indicador y acción. Los colores con significado propio, como una imagen
QR, conservan sus requisitos de lectura.

`Button` ofrece variantes primaria/secundaria, estado de carga, foco e icono.
`IconButton` reserva un objetivo de 44 pt e incluye nombre accesible. Los títulos
de pantalla, secciones, estados y entradas se centralizan en `ProtectedPage`,
`AccountPage`, `formStyles` y `accountStyles`. `BottomSheet` compone los paneles
cartográficos con control explícito y movimiento breve que respeta la preferencia.

Registro, cuenta y navegación vial usan los tokens de tema. `AppearanceProvider`
contiene un Stack y la barra de estado temática con sesión y avisos.
