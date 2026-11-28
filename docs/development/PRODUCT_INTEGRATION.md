# Integración de producto en task/trip-operations

27/11/2026, America/Bogota. Integrador Codex. Revisión humana POR_ASIGNAR.

## Integración existente

El HEAD inicial y actual es `79bc69319bfb54c7fd16a7c1259665c81a0304e2`. Git
mostraba el merge completado, árbol e índice limpios y cero entradas
sin resolver. Padres `5657171bdfe90574c199eeaf0430daee18ee61c5`
(operación) y `15cfa5beca23741c866c0d54742e24adf282d010` (rediseño ya
combinado). El rediseño original es `4b15f22` y la base común `2b69336`.
El árbol del merge coincide con `15cfa5b`. Backend, Prisma, contratos y
lockfile del merge coinciden con el primer padre. El trabajo quedó en
`task/trip-operations`.

La comprobación de tipos reprodujo JSX mal combinado en `ProtectedPage`,
Inicio, Publicación, Reservas y Operación. Existían importaciones duplicadas
en agenda, chat, avisos, detalle y GPS. Se recompusieron esas pantallas
con navegación y tema del rediseño y las lecturas y acciones de operación.
`frontend/app/_layout.tsx` monta un solo Stack y StatusBar temático bajo
SafeArea, QueryClient, Session y Appearance, con navegación de avisos activa.
La lectura pública de configuración de acceso se conserva si la sesión
termina de inicializar mientras llega la respuesta.

## Cuenta y operaciones

El dominio exacto `@usc.edu.co` se normaliza y valida en Nest. La
unicidad concurrente se resuelve en PostgreSQL. El acceso académico ordinario
tiene su modo `DECLARED_DOMAIN`, y `OFFICIAL` exige acreditación sin
degradación automática. La cuenta declara dominio, licencia y SOAT.
La capacidad de conducción exige documentos vigentes, titularidad y categoría.
El modo académico funciona sin SMTP y muestra una elegibilidad declarada
sin acreditar buzón ni matrícula. Se conservan sesión, revocación, condiciones
de participación y permisos por recurso. Los estados restringidos siguen
protegidos. Las lecturas y trabajadores escolares usan la nueva política.

Cambio de contratos en `AccessConfiguration`, `Account`, `RegistrationReceipt`,
`CurrentUser` y proyecciones de agenda/demora. El registro convencional,
onboarding retomable, perfil, avisos, guardados, edición, manifiesto y
descenso mantienen acceso desde la interfaz. `User.declaredDomainAccessAt`
impide que enlaces anteriores tomen una cuenta admitida por dominio.
La recuperación académica por correo requiere titularidad comprobada.

## Mapas y persistencia

Photon, OSRM y teselas XYZ permanecen configurables. Nest normaliza los pasos
OSRM y firma su asociación con actor, paradas y geometría. La publicación,
edición y reutilización conservan el conjunto correspondiente.
`Trip.routeManeuvers` es opcional y el histórico conserva su mapa. El
conductor autorizado ve la maniobra siguiente, vía, distancia, ETA y
progreso cuando la muestra consentida lo permite. Se informa precisión
insuficiente, desviación o ambigüedad y se mantienen las acciones manuales.

Migraciones aditivas `20261128000000_declared_domain_access` y
`20261128010000_route_maneuvers`. Las 31 anteriores se conservaron.
Se mantienen NestJS 11, Prisma 7, PostgreSQL y Expo SDK 54 con una sola app,
sin cambios de dependencias en el lockfile.

## Evidencia

- [Mapa y consultas públicas de Cali](MAP_EXPERIENCE.md)
- [Pruebas y relevo de integración](../handoffs/2026-11-27_trip-operations_integracion-producto.md)
