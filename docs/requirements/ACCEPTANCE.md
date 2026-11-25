# Criterios vigentes de aceptación

Definición25/11/2026. Los escenarios son criterios a verificar, no resultados ejecutados
ni aceptación del PO. Consultar TEST_PLAN y evidencia del incremento. Los criterios
anteriores están [archivados](../history/2026-11-24-guides.md).

- Dado un estudiante vigente acreditado, al acceder a operación protegida, Nest permite
  sólo su recurso/capacidad. Inactivo/no estudiante/correo no verificado o controlado sin
  vigencia no obtiene autorización real. Fuente ausente falla cerrada. Fixture no habilita
  producción; no existe acceso ADMIN. Perfil no concede permisos ni cambia membresía.
- Dadas sesiones distintas en web/móvil, al revocar/expirar una no se abre acceso con ella.
  La baja posterior deniega datos y permite revocar la propia sesión. Origin/cabecera y
  cookie/almacenamiento cumplen su política; API caída informa error sin fabricar usuario.
- Dado conductor elegible con vehículo propio y documentación admisible, al publicar
  DESDE_USC o HACIA_USC se valida campus institucional, fecha/capacidad/choques y snapshot.
  Externo→externo se rechaza aunque USC sea parada intermedia. Documentos declarados no
  se presentan como verificación oficial ni necesitan aprobación ADMIN interna.
- Dado un encuentro interior textual ligado al campus, al publicar sin GPS propio,
  persiste texto/nivel/instrucciones; mapa general aproximado lo indica. El usuario no
  introduce latitud/longitud/UUID/GeoJSON. Dirección/resultados/marcador obtienen ubicación.
- Dado un viaje publicado, al buscar por sentido/lugar/horario/capacidad se devuelven
  viajes existentes compatibles sin alterar geometría. Paso/proximidad a línea no autorizan
  recogida; coincidencia textual no acredita cercanía exacta. Error de proveedor es visible.
- Dado estudiante y viaje futuro abierto compatibles, al confirmar participa directamente
  sin aprobación ordinaria y ocupa una plaza. Propio/duplicado/no elegible/lleno/cancelado/
  finalizado/cerrado se rechaza; reintento no duplica. El conductor consulta confirmados.
- Dada una última plaza, al confirmar dos estudiantes simultáneamente, sólo uno la ocupa;
  ocupación e historial conservan invariantes en PostgreSQL real. Retiro válido libera una
  sola vez; carrera con inicio/cancelación no sobrevende ni crea estados contradictorios.
- Dada propuesta compatible HACIA_USC, sólo propietario acepta/rechaza; aceptación no
  cambia geometría ni ocupa plaza/confirma. En DESDE_USC se rechaza. Confirmar después
  exige disponibilidad nueva. Duplicados, actor ajeno y viaje cerrado se controlan.
- Dado grupo, cada estudiante debe consentir; sin mecanismo completo, individual seguro
  y limitación explícita. UUID no es invitación. Un lote habilitado falla completo si no
  cabe; invitaciones pendientes no bloquean plazas indefinidamente.
- Dada participación confirmada, abordar sólo registra presencia sin segunda plaza;
  viaje/participación/abordaje separados. Inicio/final/cancelación verifican actor/estado.
  Cancelar conserva historial y condiciones esenciales no cambian silenciosamente.
- Dados datos históricos, migración conserva FKs/geometrías y confirmaciones, sin elevar
  pendientes ni convertir usuarios antiguos en estudiantes. Complementarios mantienen
  privacidad/acceso autorizado y sólo se acreditan según pruebas reales.

La entrega local, la integración Git, la aceptación PO, las fuentes institucionales y
Expo Go físico son hitos distintos. No afirmar ninguno por completar documentación,
exportar un bundle o ejecutar un viewport móvil.
