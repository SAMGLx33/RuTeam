# Guion reproducible del corte actual (3–5 min)

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
