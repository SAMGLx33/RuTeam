# Guion académico sujeto a evidencia

Preparación para28/11/2026. El producto lo define PRODUCT_DEFINITION; este guion
sólo presenta funcionalidades efectivamente verificadas del incremento. Revisar antes
EVIDENCE/PROGRESS/review: si un paso no está implementado y probado, identificarlo
como pendiente o bloqueo. No crear datos/resultados falsos para completar la presentación.
Guiones anteriores y sus roles/flujos están [archivados](../history/2026-11-24-guides.md).

## Preparación

Usar bases autorizadas separadas, datos sintéticos, migraciones revisadas y sesiones
independientes. Etiquetar identidad estudiantil simulada y fuentes externas no disponibles.
No mostrar .env, tokens, documentos reales, UUID ni herramientas técnicas como UX normal.
No seleccionar cuenta ADMIN, ni tratar docente/trabajador como estudiante vigente.
Producción no tiene acceso alternativo sintético; sin fuente autorizada permanece cerrada.

## Secuencia demostrable cuando su evidencia esté disponible

1. Identidad: estudiante permitido e inactivo/no estudiante rechazado; mostrar claramente
   qué es fixture y qué está bloqueado por fuente institucional. Perfil propio persiste
   tras recarga. Sesiones separadas y logout; un correo controlado no acredita matrícula.
2. Vehículo: autogestión del propietario y vigencia/capacidad. Distinguir dato declarado
   de verificación autorizada; ninguna revisión ADMIN ni documento oficial inventado.
3. DESDE_USC: campus seleccionado, encuentro interior libre por texto (por ejemplo un
   espacio o nivel de prueba), destino externo genérico, fecha/vehículo/plazas, recorrido,
   condiciones y vista previa. Sin coordenadas/GeoJSON/UUID manuales. Persistir y recargar.
4. HACIA_USC: origen externo elegido por búsqueda/mapa y campus de llegada. Mostrar
   paradas autorizadas y puntos de paso distintos. Intentar externo→externo con USC
   intermedia y mostrar rechazo del backend si ese escenario está acreditado.
5. Descubrimiento: segunda sesión filtra por modalidad/lugar/hora/capacidad y consulta
   el mismo recorrido. Explicar la posición aproximada del campus y la calidad de ruta;
   sin motor no llamar carretera a una línea recta ni recalcular ruta al buscar.
6. Participación: estudiante pulsa «Confirmar participación», se confirma directamente
   y disminuye la disponibilidad persistida. Propietario consulta participantes sin
   aprobarlos. Reintento/duplicado y viaje lleno muestran la respuesta real.
7. Último cupo: mostrar resultado de la prueba concurrente real del corte, con conteo
   final e historial; no confundir con prueba histórica de aceptación o de solapamiento.
   Retiro futuro permitido libera plaza. No UUID de acompañantes como códigos de grupo.
8. Propuesta: sólo HACIA_USC, pasajero propone punto compatible y dueño decide. Al aceptar
   no cambian geometría ni plazas. Confirmación posterior sólo con disponibilidad.
9. Estados: inicio/final/cancelación e historial conforme a implementación verificada.
   Abordaje/QR no se presenta funcional si está pendiente; no confundir QR Metro, interno
   y carné institucional. No prometer penalidades, pagos o SOS con despacho.
10. Complementarios: demostrar chat/ratings/compensaciones/seguridad sólo si existe evidencia
    actual. En caso contrario, mostrar estado pendiente/bloqueado y dependencia legítima.

## Cierre académico

Presentar resultados nuevos, primeros fallos y correcciones, migración histórica,
contratos/documentación, limitaciones y próximos pasos dentro del plazo. Expo web en
viewport móvil no acredita Expo Go físico. Proveedor vial/catálogo no certificado,
fuente USC y aceptación humana se declaran por separado. Integración Git sólo si está
aprobada y comprobada; un flujo local no cambia CURRENT_STATUS automáticamente.
