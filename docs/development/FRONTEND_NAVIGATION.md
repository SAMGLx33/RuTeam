# Navegación del rediseño

La misma app Expo Router presenta barra inferior en móvil y barra lateral desde
900 pt. A partir de 1100 pt, el inicio y los recorridos admiten paneles en columnas.
Las rutas anteriores se conservan y las secundarias tienen regreso contextual.
Encabezado protegido muestra avisos sin leer de la página actual y acceso al perfil
desde escritorio.

| Sección   | Entrada canónica y accesos                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio    | `/` resuelve acceso, verificación, incorporación o inicio. Contextos Pasajero/Conductor visibles sólo con capacidad efectiva de conducción. |
| Viajes    | `/available-trips` con filtros y Lista/Mapa; `/search-trips` y `/trip/[id]` conservan sus destinos. Publicar desde Inicio conductor.        |
| Actividad | `/activity`, agenda, participaciones, viajes propios, recurrencias y operación según permisos.                                              |
| Mensajes  | `/chat` y `/chat/[tripId]`; lista y conversación usan autorización original.                                                                |
| Perfil    | `/profile`, cuenta, apariencia, preferencias, avisos, reputación, vehículos según capacidad y seguridad.                                    |

El encabezado, la barra y el contenido no sustituyen `SessionProvider`, los guardas
actuales de página ni NestJS por recurso. El modo del inicio es estado de vista.
Se inicializa según la preferencia actual únicamente si el conductor está autorizado.
Cuenta limitada y onboarding no muestran navegación protegida. Los accesos
directos conservan su autorización y redirección original.
