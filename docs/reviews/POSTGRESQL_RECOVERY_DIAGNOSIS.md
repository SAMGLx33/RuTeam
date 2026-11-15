# Diagnóstico y propuesta controlada de PostgreSQL — 2026-11-14

Estado: PARCIAL, sin creación autorizada de bases nuevas. Agente Codex; responsable
humano POR_ASIGNAR. Rama task/refactor-monorepo-structure, HEAD/base bab4e63 completo en
el recibo JSON. Árbol de refactor existente sin stage preservado; no operaciones Git.

## Hechos comprobados

- No existe /tmp/ruteam-pg-20261113 ni su PG_VERSION; no es sólo un servicio detenido
  sobre ese directorio. No hay listener55432. No se inició ni recreó el clúster.
- DATABASE_URL y TEST_DATABASE_URL apuntan a127.0.0.1:55432, respectivamente ruteam y
  ruteam_test: bases distintas y destino coherente con el antiguo entorno documentado.
  No se imprimen credenciales ni se modifica .env.
- PostgreSQL18/main del sistema está online5432, propietario postgres, datos en
  /var/lib/postgresql/18/main. Sólo se consultaron procesos/metadatos, sin conexión SQL;
  no hay autorización para usarlo y no se utilizará.
- API3000 PID15635 y Expo8081 PID20483 siguen activos desde backend/frontend. No iniciar
  duplicados ni reiniciar procesos ajenos por este diagnóstico.
- Búsqueda acotada de PG_VERSION/pg_control/backup_label y dumps/archives relacionados:
  /home/darik/RuTeam (profundidad8), /tmp(4), /var/backups(3), carpetas conocidas de backups
  y estado local RuTeam. No candidatos recuperables accesibles.13 directorios /tmp no
  legibles; no se inspeccionan discos externos/cloud ni se hace recuperación forense.
  Las cuatro migraciones SQL no son dumps de datos. Fuentes privadas excluidas.

[Recibo diagnóstico y alcance](evidence/2026-11-14-postgresql-recovery/diagnosis.json).
No se afirma pérdida universal o inexistencia de un respaldo externo. Con el material
local accesible, las bases originales NO se pueden recuperar. Si el equipo tiene backup,
se entrega por canal privado y se valida antes de restaurar, sin escribir sobre5432.

## Procedimiento si apareciera un clúster recuperable

No ejecutar initdb sobre él. Confirmar PG_VERSION18 y owner, pg_controldata/pg_ctl status,
proceso/puerto/socket y tablespaces; conservar copia offline coherente antes de intervenir.
Iniciar únicamente la copia autorizada con binarios de la misma versión, en puerto/socket
libres y loopback. Leer logs y comprobar DB/migraciones/checksums antes de seed. Un dump
se restaura sólo a base nueva autorizada, nunca encima de datos ajenos. Este procedimiento
NO se ha ejecutado y no supone autorización para crear/restaurar bases.

## Propuesta concreta pendiente de autorización expresa

Crear un entorno DEMO NUEVO, sin afirmar recuperación de datos originales:

- PostgreSQL18 separado, propietario del proceso darik, rol sintético ruteam.
- Persistencia fuera del checkout Git: /home/darik/RuTeam/.local-data/postgresql-18-demo/data.
- Socket privado en el mismo directorio padre y log fuera de Git. No reutilizar /tmp para
  los datos ni tocar el clúster del sistema. No autoinicio del sistema configurado aquí.
- TCP únicamente127.0.0.1:55432; comprobación de puerto y directorio inexistente antes de
  initdb. Autenticación trust para esta demo local sintética, como el entorno original,
  con directorio/socket privados; ninguna exposición LAN de PostgreSQL ni datos reales.
- Crear sólo ruteam y ruteam_test, distintas. Mantener .env y URLs actuales intactas.
- Aplicar las cuatro migraciones existentes sin editar SQL ni schema; seed DEMO dos veces
  y comparar contenido/cantidades antes/después sin exponer filas, tokens o contraseñas.
- Verificar _prisma_migrations y checksums en ambas bases; después ejecutar suites HTTP/
  PostgreSQL y Playwright SECUENCIALMENTE, smoke sobre API3000 existente y pruebas estáticas.
- No stage/commit/push/merge, no migrate reset/db push, no cambios funcionales/dependencias.

Comandos propuestos tras aprobación (no ejecutados): crear directorios privados; initdb
sobre DATA INEXISTENTE con --username=ruteam --auth=trust; pg_ctl start -w con loopback,
55432 y socket privado; createdb por TCP para ruteam y ruteam_test. Antes y después,
inspeccionar puertos y registrar ownership/estado sin credenciales. Si ya existe cualquier
ruta de datos o listener, detener ese paso y reevaluar; nunca sobrescribirlos.

La Fase2 del prompt del usuario dice: «La creación de un entorno DEMO/test nuevo debe
ser expresamente autorizada». Este documento prepara la decisión; no la concede.
Mientras no llegue esa autorización, sólo avanzan comprobaciones que no crean BD y
la documentación. No ejecutar db:test:setup porque puede crear una base automáticamente.

## Resolución posterior autorizada

El usuario autorizó expresamente crear desde cero el entorno de desarrollo/pruebas y
conservar las variables locales. Se sustituyó la propuesta inicial con nombre demo por
un único clúster normal de desarrollo en /home/darik/RuTeam/.local-data/postgresql-18/data,
55432, bases ruteam/ruteam_test. No se creó otra versión de aplicación ni se cambió .env.
Bootstrap, migraciones y seed aprobados; validación funcional posterior completa71/4/6.
[Informe de cierre](POSTGRESQL_RECOVERY_VALIDATION.md). Las secciones iniciales conservan
el diagnóstico previo y la solicitud de autorización, no el estado actual del servicio.
