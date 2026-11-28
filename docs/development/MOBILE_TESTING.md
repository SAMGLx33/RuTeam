# Prueba física de RuTeam con Expo Go

**Estado del 26/11/2026, America/Bogota.** Pendiente de dispositivo accesible.
La máquina virtual tiene IPv4 `10.0.2.15/24` y puerta `10.0.2.2`.
Se vio un dispositivo USB de VirtualBox. Estos indicios son compatibles con NAT,
cuyo modo debe confirmar el dueño del anfitrión. Desde el entorno de trabajo
no se encontró un teléfono USB, ni `adb` ni `idevice_id`. Leer UFW y nftables
requirió privilegios ajenos a la sesión. PostgreSQL escuchaba en
`127.0.0.1:55432`. La API configurada en el cliente era `http://localhost:3000/api/v1`.

En la VM, NestJS respondió HTTP 200 en el puerto 3000 y Metro devolvió
HTTP 200 con el manifiesto Android en el puerto 8081. El manifiesto anunció
la IP de invitado para API y bundle. Ambos procesos de diagnóstico se cerraron.
El resultado acredita acceso dentro de la VM. La ruta desde Wi-Fi, SecureStore,
la cámara y los permisos de ubicación siguen pendientes de prueba física.

## Preparar dispositivo y red privada

1. Registra el modelo del teléfono, versión de Android o iOS, versión de Expo Go
   y versión de SDK que admite. El proyecto fija Expo SDK 54. En Android se puede
   descargar desde el selector oficial y elegir SDK 54. Para iOS, la guía de
   incompatibilidad de Expo indica que SDK 54 está disponible en el App Store.
   Si el cliente instalado rechaza SDK 54, confirma el canal compatible antes de
   cambiar versiones. El SDK indica Android 7+ e iOS 15.1+ como bases del stack.
   [Descargas](https://expo.dev/go),
   [compatibilidad de Expo Go](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/),
   [mínimos por SDK](https://docs.expo.dev/versions/v55.0.0/#support-for-android-and-ios-versions).
2. Conecta teléfono y equipo anfitrión al mismo segmento Wi-Fi de confianza.
   Comprueba la dirección del invitado con `ip -brief -4 address show up` y la
   ruta con `ip -4 route show default`. El teléfono debe alcanzar por IPv4 los
   puertos TCP 3000 para NestJS y 8081 para Metro. Una red de invitados o con
   aislamiento entre clientes puede impedirlo.
3. En VirtualBox con puente, elige la interfaz de la LAN y usa la IPv4 del
   invitado. Con NAT, verifica desde el anfitrión el modo en **Configuración →
   Red**. Redirige TCP 3000 y 8081 desde la IP LAN del anfitrión a los mismos
   puertos del invitado y usa la IP LAN del anfitrión en el teléfono. Vincula
   ambas reglas sólo a esa IP LAN. En NAT, la IP `10.0.2.15` normalmente es
   accesible dentro de la VM. [Red y redirección en VirtualBox](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/networkingdetails.html).
4. Confirma en ambas máquinas las reglas de red. Si UFW está activo, pide al
   responsable una regla temporal y acotada a la IP del teléfono para los dos
   puertos, o usa la política equivalente del anfitrión. Conserva el firewall y
   mantén PostgreSQL 55432 y Mailpit 1025/8025 en loopback. No reenvíes estos
   puertos ni hagas pruebas con datos personales por HTTP.
5. Comprueba servicios existentes con
   `ss -ltnp '( sport = :3000 or sport = :8081 or sport = :55432 )'`.
   Coordina primero si API o Metro ya ocupan sus puertos.

## Ejecutar con una base aislada y configuración de proceso

En la raíz del monorepo, prepara una tercera base de prueba sintética. El ejemplo
parte de las URLs locales usuales y sólo selecciona la BD dedicada después de
validarlas. Si ya existe `ruteam_mobile_test`, úsala únicamente si pertenece a
este ensayo y está autorizada. Usa una contraseña nueva de fixture sin escribirla
en la línea de comando. En entornos con credenciales SMTP externas, usa el
[Taller Mailpit](MAILPIT.md) con configuración aislada y confirma el destinatario.

```bash
export RUTEAM_QA_ADDRESS=IPV4_LAN_ALCANZABLE
read -rsp 'Contraseña exclusiva de las cuentas de QA (mínimo 12 caracteres): ' AUTH_FIXTURE_PASSWORD
printf '\n'
export AUTH_FIXTURE_PASSWORD
TEST_DATABASE_URL="$(node --env-file=.env --input-type=module -e '
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (url.hostname !== "127.0.0.1" || !["5432", "55432"].includes(url.port) || !/^\/ruteam(?:_[a-z0-9]+)*_test$/.test(url.pathname))
    process.exit(1);
  url.pathname = "/ruteam_mobile_test";
  process.stdout.write(url.href);
')" || exit 1
export TEST_DATABASE_URL
npm run db:generate && DEMO_MODE=true VERIFICATION_PROVIDER=demo npm run db:test:setup &&
NODE_ENV=development DEMO_MODE=true VERIFICATION_PROVIDER=demo \
  CORS_ORIGINS="http://${RUTEAM_QA_ADDRESS}:8081" PORT=3000 \
  DATABASE_URL="$TEST_DATABASE_URL" npm run dev:api
```

Las identidades del seed acceden por el formulario normal de correo y contraseña.
El proveedor de elegibilidad sintético se usa sólo para este entorno separado.
NestJS atiende en `0.0.0.0:3000`. En otra terminal, ejecuta Metro con el mismo
valor de `RUTEAM_QA_ADDRESS`. Usa el mismo hostname para web LAN y API si también
ensayas cookies desde un navegador de la red.

```bash
export RUTEAM_QA_ADDRESS=IPV4_LAN_ALCANZABLE
EXPO_PUBLIC_API_URL="http://${RUTEAM_QA_ADDRESS}:3000/api/v1" \
  REACT_NATIVE_PACKAGER_HOSTNAME="$RUTEAM_QA_ADDRESS" npm run dev:client
```

Esta opción de Metro anuncia explícitamente la IPv4 alcanzable. El comando del
repositorio usa `--lan --port 8081`. Expo rechaza añadir `--offline` junto con
`--lan`; Offline ya selecciona LAN. El túnel de Metro por sí solo no hace
alcanzable la API. Las variables públicas configuran cada proceso sin editar
`.env`.

Confirma desde el **navegador del teléfono** que
`http://IPV4_LAN_ALCANZABLE:3000/api/v1/health` devuelve HTTP 200 y
`database: "up"`. Abre la app con el QR de **Metro** en Expo Go. Si el servidor
carga y la app apunta a otro host, reinicia Expo con la URL pública correcta
y revisa el manifiesto. Si iOS solicita permiso de Red Local o autenticación
en Expo Go, sigue las instrucciones para el cliente compatible y vuelve
a intentar. [Entorno físico de Expo Go en iOS](https://docs.expo.dev/get-started/set-up-your-environment/?device=physical&mode=expo-go&platform=ios).

## Recorrido y evidencia

| Verificación en el teléfono       | Resultado esperado                                                                                                                                                                                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sesión y SecureStore              | Inicia sesión con una cuenta sintética vigente, cierra y reabre Expo Go y conserva sesión. Cierra sesión, vuelve a abrir y verifica que ya pide autenticación. Repite el rechazo de producto para una cuenta no elegible.                                                                                |
| Movilidad, búsqueda y cartografía | Configura preferencias, busca un lugar de acceso público e intenta seleccionar una parada. Verifica atribución de teselas, estado de resultados y tratamiento de una caída del proveedor. Sin teselas, Photon u OSRM configurados, comprueba el estado de indisponibilidad correspondiente.              |
| Viaje y coordinación              | Con conductor y pasajero en sesiones separadas, publica, confirma, comprueba aviso y chat, registra abordaje manual, inicia, registra parada siguiente y finaliza.                                                                                                                                       |
| Cámara y ubicación                | Si el corte ofrece QR interno, ensaya permiso concedido, denegado y segundo escaneo. Conserva abordaje manual. Para seguimiento implementado, prueba permiso concedido/denegado, publicación en primer plano, antigüedad visible y fin de envío al cerrar. Registra cada función ausente como pendiente. |

Si verificas registro o recuperación, hazlo con Mailpit en la VM. Visualiza el
buzón sólo desde loopback y conserva en privado el enlace de verificación.
Repite los recorridos con las cuentas autorizadas del ensayo. La raíz de
configuración de mapas es [SETUP](SETUP.md#proveedores-para-continuidad-operativa).
No confíes en el viewport web para certificar acceso a SecureStore, cámara, GPS o
permisos de red local.

Registra fecha, rama y SHA, plataforma y versión de Expo Go, tipo de red,
flujos observados y resultado de cada fila. Los tokens, QR de acceso, enlaces
de correo, números de serie y datos de cuenta quedan fuera de las capturas.
Detén los procesos que iniciaste y solicita retirar las reglas temporales
cuando termine la prueba.

## Configuración de la VM del cierre

`systemd-detect-virt` informó `oracle`. Se confirmó interfaz `enp0s3` en
`10.0.2.15/24` con salida por `10.0.2.2`. PostgreSQL del contenedor de RuTeam
publica sólo en `127.0.0.1:5432`. Antes de ejecutar el ejemplo de la guía,
valida la URL local y usa su puerto real (5432 en esta VM o 55432 en el
laboratorio anterior). Ejecuta el seed con `DEMO_MODE=true VERIFICATION_PROVIDER=demo`
y credenciales únicas. La dirección del anfitrión alcanzable desde el teléfono
y el dispositivo físico están pendientes.

Añade al recorrido el perfil y su contacto privado, la confirmación del
marcador, resumen y última ubicación, registro privado de incidencia,
calificación posviaje y los métodos y estados de compensación. Captura los
estados sin incluir números telefónicos, coordenadas, enlaces ni credenciales.

El ensayo final preparó `ruteam_cierre_mobile_test` con credenciales sintéticas
exclusivas. Nest en el puerto 3196 y Metro en el 8186 devolvieron HTTP 200
desde `10.0.2.15` dentro de la VM. El manifiesto Android anunció esa IPv4
tanto en la API como en el bundle. Se cerraron ambos procesos del ensayo.
La IP del anfitrión y la conexión desde un teléfono quedan para la prueba
física. Para esa prueba, crea la ruta privada descrita arriba y genera
credenciales propias al sembrar la base de QA.

## Seguimiento y avisos en operación

En Expo Go compatible con SDK 54, comprueba en una red privada la API, inicio de
sesión con cuenta sintética, bandeja, detalle, cámara para QR y permiso de GPS
en primer plano. Con dos cuentas en un viaje activo, rechaza y después concede
GPS, comparte, consulta la precisión, bloquea la pantalla, vuelve y verifica
el estado. Registra el descenso y confirma que el pasajero conserva su historial
y pierde ubicación en vivo. Comprueba la pantalla sin red y al restablecerla.

Para push remoto usa un development build con proyecto, credenciales y
dispositivo autorizados. Comprueba permiso rechazado, registro aceptado,
rotación y revocación, aviso de prueba, enlace con sesión cerrada, reconsultar
tras ingresar y repetir con un recurso ajeno. Registra modelo, sistema, versión
de Expo Go o build, estado de permisos y resultado sin copiar tokens ni datos
privados. La prueba física queda pendiente de dispositivo.

Para este corte, crea dos cuentas de ensayo por dominio declarado. Verifica
registro sin correo, vehículo, ruta con maniobras, confirmación, QR, GPS
voluntario, pérdida de señal, pausa fuera del primer plano y descenso.
La recepción push se comprueba en un development build autorizado.

## Comprobación del 28/11

VirtualBox muestra la interfaz `enp0s3` con IPv4 `10.0.2.15/24`.
Nest en `:3000` devolvió salud de PostgreSQL y Metro web en `:8081` respondió
HTTP 200 dentro de la VM. PostgreSQL se comprobó en `127.0.0.1:5432`.
Metro para Expo Go devolvió un manifiesto Android de SDK 54 desde
`10.0.2.15:8081`. El manifiesto conserva la API habitual en
`http://localhost:3000/api/v1`. Para un teléfono, sustituye esa URL en el
proceso Metro por `http://IPV4_LAN_ALCANZABLE:3000/api/v1` como indica esta guía.
Sigue pendiente la prueba con un teléfono. Aplica la configuración de puente o
redirección LAN de esta guía y usa el QR de Metro con Expo Go compatible con SDK 54. Comprueba en el dispositivo sesión persistida, cámara, permiso GPS, zoom y
desplazamiento. Ensaya pausa y reanudación, y verifica desde la cuenta pasajera
la pérdida de acceso a la ubicación después del descenso.
