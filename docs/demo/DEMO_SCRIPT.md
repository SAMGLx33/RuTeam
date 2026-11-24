# Guiones de demostración de RuTeam

Para preparar la presentación del 28 de noviembre, usa el [guion de la redefinición](#redefinición-del-24-de-noviembre). Los dos cortes siguientes conservan la secuencia histórica.

## Fundación DEMO (3–5 min)

1. Preparar BD con SETUP y arrancar API/web. Mostrar aviso de vinculación simulada.
2. Elegir Laura: observar rechazo403. No crear cuenta ni registrar QR real.
3. Ana inicia: mostrar datos de auth/me; cambiar nombre, guardar y recargar.
4. En navegador privado/segundo perfil iniciar Diego: verificar Docente/Conductor demo
   sin cambiar identidad de Ana. No afirma licencia/SOAT real ni permite publicar aún.
5. Mostrar catálogo DEMO y Swagger. Cerrar sesión y comprobar401.
6. Ejecutar smoke y tests PostgreSQL aislados; declarar Expo Go físico pendiente.

Guion final8–12min (futuro, no probado): publicación3paradas→grupo2→último cupo
concurrente→inicio→QR interno→avance→cierre/costos→chat/ratings→admin. No sustituir
esas funciones por botones que fabrican éxito ni evidencias inventadas.

## Flujo real adicional de Fase 2

1. Migrar/seed y reiniciar API con código de task/trips-publicacion; iniciar Expo web.
2. Diego: entrar a Vehículos/licencia, comprobar DEM123 y licencia sintéticos aprobados.
3. Registrar otra placa sintética válida: quedaPENDING, no puede publicar con ella.
4. Administración en navegador privado: revisar documento DEMO de la versión mostrada.
5. Diego: publicar hacia entrada/parqueadero del catálogo USC con salida>30min,
   duración DEMO45min y dos recogidas. Intentar primero una hora pasada y ver400.
6. Mostrar Mis viajes, PROGRAMADO/DISPONIBLE, cupos sin ocupar y paradas ordenadas;
   recargar y comprobar persistencia. Otra cuenta no ve ese viaje en su listado propio.
7. Ejecutar Jest para carrera real[201,409] de horarios; no confundir con reservas.
   No mapa/ETA real ni costos o recorridos simulados como si estuvieran implementados.

## Redefinición del 24 de noviembre

Usa dos ventanas separadas y sólo identidades DEMO. Se puede demostrar con puntos y vías descritas sin motor configurado. Las geometrías de las pruebas son sintéticas. Para demostrar geometría vial real, el equipo debe importar una ruta que haya cotejado o conectar su motor OSRM de Cali.

1. **A y B.** Con Diego y el vehículo DEM123, abrir «Publicar viaje». Elegir «Origen · Plazoleta de los Sabios» y un destino personalizado público de ejemplo en Floralia. Indicar salida futura, cupos, vías y resumen. Repetir con «sótano 2» como punto de partida y consultar el nivel e indicaciones. Los nombres y coordenadas de seed son DEMO.
2. **C.** Publicar Floralia como origen, USC como destino y un negocio DEMO en la Calle Quinta como abordaje. Añadir un punto «Sólo paso» y comprobar que aparece en el recorrido consultable.
3. **D.** Abrir otra sesión como Ana. En «Buscar viajes», filtrar por USC o por coordenadas y radio explícito. Comparar sentido válido y opuesto. Filtrar por un punto próximo sólo al paso sin otra parada en el radio y mostrar la falta de coincidencias.
4. **E.** Consultar el trayecto. Elegir abordaje antes del descenso y solicitar cupo. En la sesión de Diego, abrir «Mis viajes publicados», ver solicitudes y aceptar. Volver a «Mis reservas» como Ana, comprobar la confirmación y el par elegido. Para un grupo, usar los códigos DEMO compartidos por los acompañantes. Mostrar la prueba automatizada de dos aceptaciones por el último cupo.
5. Demostrar inicio y fin en el viaje confirmado. Con otro viaje programado, cancelar y consultar el estado conservado de las reservas. Registrar evidencias y decisiones del PO según [SPRINTS](../development/SPRINTS.md).
