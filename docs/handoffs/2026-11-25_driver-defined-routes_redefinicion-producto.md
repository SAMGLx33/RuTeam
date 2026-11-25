# Handoff de recorrido, propuestas y validación integrada

25 de noviembre de 2026, America/Bogota. Agente Codex. Responsable humano e
integrador POR_ASIGNAR. Rama `task/driver-defined-routes`, base y HEAD
`72a31d7`. Estado local revisable.

Se completó un incremento sobre el monorepo existente. `ViajeService` valida
desde/hacia USC usando el catálogo en los extremos. El conductor describe el
encuentro en texto y elige el marcador externo. El punto interno toma como
referencia un lugar conocido del catálogo. Desde USC, el origen es el punto de
abordaje. La búsqueda no crea viajes ni redibuja el recorrido. La prueba
Web corrigió la diferencia de coordenadas de clic entre los eventos nativos
y del navegador.

Se añadió `PickupProposal` con una sola propuesta pendiente por estudiante
y viaje. Se valida proximidad y orden junto a la geometría publicada. El
conductor decide y las filas de paradas se actualizan bajo el lock del viaje.
La propuesta no ocupa cupos y la decisión conserva la geometría. La operación
independiente de confirmar sí ocupa una plaza. Los handoffs de
[identidad](2026-11-25_identidad-autogestion-estudiantil.md) y
[participación](2026-11-25_direct-participation.md) detallan esos cambios.

`ruteam` y `ruteam_test` apuntan a PostgreSQL persistente local 55432.
Las nueve migraciones coinciden en checksums. Se respaldó desarrollo antes
de aplicar las tres nuevas. El registro histórico de administrador se
conserva deshabilitado. Los fixtures del 25/11 son estudiantes sintéticos
habilitados sólo para desarrollo y pruebas.

Pasaron Jest 117/117, Playwright 4/4 y smoke 6/6. El caso PostgreSQL de última
plaza observa 201/409 y consistencia de ocupación. Playwright conserva el
reporte de pantalla por caso y se usaron teselas/geometrías controladas.
[Informe de validación](../reviews/PRODUCT_REDEFINITION_DELIVERY.md).

En el siguiente tramo del 25–28 de noviembre, revisar las migraciones y
probar el proveedor cartográfico autorizado de principio a fin. Preparar
invitaciones de grupo con consentimiento y una prueba atómica de grupo
completo. Continuar sólo después con notificaciones y complementarios según
las prioridades acordadas. La consulta autorizada de matrícula y documentos
vehiculares es un bloqueo externo para uso real. El dispositivo sigue sin
validarse.

El integrador debe revisar el árbol local, comparar la base con `feature`
y decidir el PR y posteriores promociones. Índice vacío. Mensaje propuesto
`feat(product): enforce student eligibility and direct trip participation`.
