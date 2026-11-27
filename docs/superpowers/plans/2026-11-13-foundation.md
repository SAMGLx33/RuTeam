# Plan de fundación RuTeam

> Plan histórico del corte indicado, no instrucciones actuales de producto.
> La [definición vigente](../../requirements/PRODUCT_DEFINITION.md) del 25/11
> sustituye ADMIN, estamentos no estudiantiles y solicitud/aceptación ordinaria.
> Conservar antecedentes y consultar PROGRESS para evidencia de cada corte.

> Ejecución inline con superpowers:executing-plans; el prompt maestro solicita implementación inmediata sin ronda de aprobación.

Objetivo: Fase 0 y flujo vertical Fase 1 con PostgreSQL real, dos roles y Expo SDK 54.
Arquitectura: monolito Nest MVC modular, Prisma 7 con adapter-pg, app única Expo Router.
Especificación: prompt maestro aportado el 2026-11-13. Referencias ERS/UML ausentes.

## Restricciones globales

TypeScript strict, npm workspaces, Node 22.22.3, Expo SDK 54, Prisma ORM 7,
PostgreSQL local; sin Vite/Vue/Firebase/Supabase ni despliegue. No publicar ni fusionar.
Conservar historial existente 7967674 y origin. Fundación local autorizada en main.

## Decisiones mínimas

Sesión opaca aleatoria con hash en BD y expiración/revocación; sin contraseñas en el
login demo. Web cookie HttpOnly SameSite=Strict; móvil SecureStore. Verificación de
membresía consultada en cada acceso. Official provider deshabilitado. UI blanca,
texto azul oscuro, verde teal y aviso ámbar; formularios accesibles.

## Enfoque de revisión

- Sesión que sobrevive a desactivación institucional: denegar siguiente acceso.
- Origen web ajeno y petición mutante sin cabecera cliente: denegar.
- Sesión expirada, revocada o hash manipulado: denegar.
- Inyección de rol o campos de afiliación mediante perfil: rechazar DTO.
- Red API caída: mensaje visible, sin fabricar sesión o datos.

## Tareas y verificación

- [x] 1. Configuraciones, contratos y pruebas HTTP primero; comprobar fallo sin implementación.
- [x] 2. Schema/migración/seed + provider demo/oficial + health Prisma. Migrar dos BD aisladas.
- [x] 3. Auth MVC, guard, perfil, sesión, catálogo campus. Ejecutar Jest HTTP + PostgreSQL.
- [x] 4. Cliente Expo con login, error inactivo, perfil persistido. Exportar web y bundles nativos.
- [x] 5. Typecheck/lint/Expo Doctor/Playwright real. Revisar branch completa.
- [x] 6. Gobernanza, trazabilidad honesta, handoff y commit fundación; crear dev y feature sin push.

## Registro de ejecución

2026-11-13: checkout real anidado RuTeam/RuTeam, main con README y remoto existente.
PostgreSQL 18.6 instalado; sandbox impide sockets, arranque autorizado fuera del sandbox
sólo para cluster temporal /tmp/ruteam-pg-20261113 en 127.0.0.1:55432.
Prisma 7.9.1 fijado: mantiene contrato prisma.config.ts solicitado; verificar instalación.
Fase 2 empezará con catálogo campus de lectura; vehículos/publicación quedan posteriores.

Ajuste por evidencia: auditoría npm encontró vulnerabilidades transitivas de CLI Prisma7.9.1.
Actualizar a estable7.10.1 (sin cambiar major) y usar --config prisma.config.ts explícito
para conservar nombre de configuración requerido. No usar audit fix --force ni actualizar SDK 54.
RED HTTP observado:12 fallos404 y8pases antes de conectar módulos; GREEN20/20 al conectarlos.

Navegador RED: login/perfil/recarga correctos; logout conservaba UI por client.clear()
que retiraba el query observado. Corregir cancelando consultas, publicando me=null y
retirando sólo otros caches. La prueba existente exige retorno visible al login en ambos
contextos y viewports. Evitar side effects al devolver401 de una consulta cancelada.

Revisión independiente final (sólo lectura): sin hallazgos importantes remanentes del corte.
Expo Go físico y documentos originales siguen pendientes; no se declara Fase 1 completa.

Documentación y corte verificados preparados para commit de fundación y referencias.
