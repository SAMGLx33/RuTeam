# ADR0003 — Estudiantes, modalidades y participación directa

25/11/2026. Decisión funcional explícita del encargo; implementación por incrementos,
pendiente de evidencia y revisión de integración. Fuente: PRODUCT_DEFINITION.

## Decisión

Una identidad de estudiante vigente con capacidades compatibles; retirar administración
de producto y dependencia de revisión interna. Elegibilidad real separa autenticación,
control de correo, estamento/matrícula y conductor. Sin fuente autorizada, real falla
cerrado; fixtures son exclusivos de desarrollo/tests. Preservar auditoría histórica.

Conductor define desplazamiento DESDE_USC o HACIA_USC, un extremo de campus institucional
y el otro externo. Encuentro interior libre por texto, campus aproximado rotulado.
No coordenadas/GeoJSON/UUID manuales en UI. Pasos y paradas autorizadas distintos;
geometría seleccionada y condiciones persistidas e inmutables salvo flujo explícito seguro.

Participación ordinaria confirma directamente bajo transacción conductor→viaje:
actor elegible, reloj/estado/documentos/paradas/capacidad/duplicados. Reintento no consume
dos veces; retiro futuro permitido libera cupos sin borrar historia. No aprobación ordinaria.
Grupo sólo con identidad/consentimiento explícito de cada miembro y lote atómico;
priorizar individual seguro hasta contar con invitaciones completas.

Propuesta de recogida separada, sólo HACIA_USC. Propietario decide punto compatible;
aceptar no cambia geometría, no ocupa plaza y no confirma participación. Confirmación posterior
es una operación independiente. Disponibilidad, viaje y presencia/abordaje son distintos.

## Consecuencias

Migraciones incrementales conservan FKs/geometrías/confirmaciones/auditoría. No promover
PENDING antiguos ni convertir roles/estamentos anteriores en estudiantes. Retirar endpoints
incompatibles, contratos/pantallas/seeds administrativos y aprobación ordinaria; actualizar
UML/ERS mediante derivados y versiones revisables sin publicar originales privados.

Reutilizar stack MVC y locks existentes; no tablas o servicios externos por cada concepto.
Pruebas PostgreSQL de último cupo, carreras con cancelación/inicio y migración histórica,
HTTP y Expo por incremento. Mapas/proveedores no acreditan exactitud ni vigencia.
Complementarios compatibles permanecen en producto según cobertura real.

Sustituye las decisiones incompatibles de ADR0001 (producto definido como demo) y
ADR0002 (USC intermedia suficiente, coordenadas manuales y aceptación ordinaria).
Conserva sesiones seguras, providers, invariantes compatibles, geometría y arquitectura.
No declara integración, aceptación PO, despliegue ni resultados de pruebas.
