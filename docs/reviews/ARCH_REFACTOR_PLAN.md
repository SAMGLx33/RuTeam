# Plan de migración estructural de RuTeam

Agente ejecutor: Codex, en la rama autorizada task/refactor-monorepo-structure.
Spec: prompt del usuario de 2026-11-14; baseline ARCH_REFACTOR_BASELINE.md. Ejecución en
este checkout solicitada por el usuario; no segundo proyecto o worktree de aplicación.
Revisión de este plan disponible mientras avanza la ejecución ya autorizada; sin gate
adicional de confirmación ni commits indicados por plantillas de skills.

## Restricciones globales

Sólo mover apps/api→backend y apps/client→frontend completos. Preservar sufijos, nombres,
MVC vertical, Expo Router/features, contratos, reglas, endpoints, esquema, SQL, seed salvo
ruta dotenv y versiones. packages/contracts/tests/docs/scripts quedan donde están.
No stage/commit/push/PR/merge, reset, stash, clean, cambios .env, DB ajenas o Fase 3.

## Pasos y verificación

- [x] 1. Preflight, base publicada, inventario/hash/permisos/.gitkeep y diagnóstico de entorno.
      Ejecutar baseline estático/web cuando disponible; BD inexistente se marca bloqueada.
- [x] 2. Mover ambos directorios con mv. Preservar todos los ficheros internos. Eliminar
      apps sólo mediante rmdir si vacío. Manifest verifica equivalencia, nunca stubs.
- [x] 3. Ajustar únicamente configuración: root package workspaces; backend package scripts,
      prisma.config, seed dotenv; frontend tsconfig/app.config; tests import Prisma;
      ESLint/gitignore y AGENTS. Cada excepción de hash se enumera en inventario final.
- [x] 4. Regenerar lockfile con --package-lock-only --ignore-scripts, verificar identidades
      @ruteam/api y @ruteam/client y versiones/integrity/resolved sin upgrades. Reconstruir
      enlaces locales sin borrar todo node_modules. Probar npm ci aislado si viable.
- [ ] 5. Verificar generate/migrate/seed/test:setup/estáticos/Jest/E2E/smoke/builds/Doctor/export,
      un escritor de BD a la vez. No declarar flujos HTTP aprobados sin PostgreSQL real.
      Navegador localhost8081: URL request real, error previo, escritorio/móvil y evidencia.
- [x] 6. Actualizar arquitectura, AGENTS, ownership, SETUP/API/TEST_PLAN/README/BRANCHING,
      referencias vigentes y docs coordinación, handoff nuevo y PROGRESS. Preservar históricos
      identificados y estados RF/RNF. Review independiente al cierre y diff sin stage.

## Foco de revisión

1. Profundidad root-env/Jest/contratos sin modificar imports internos de módulos/features.
2. Symlinks y lockfile npm sin cambiar versiones ni perder node_modules nested movido.
3. EXPO_PUBLIC_API_URL efectiva en browser y override Playwright3100, sin secretos en Expo.
4. Esquema/SQL idénticos, .gitkeep/permisos/módulos/rutas conservados con manifest antes/después.
5. Ausencia previa de BD55432 separada de regresión; exports/viewport no acreditan teléfono.

## Registro de ejecución y resoluciones

Pasos1–4 y6 completados; paso5 ejecutado hasta donde permite entorno y permanece PARCIAL:
HTTP/PostgreSQL falla/bloqueado por desaparición previa del clúster55432. No reconstruirlo
ni modificar .env sin decisión humana. Exports/Doctor/estáticos y conservación aprueban.
Revisor independiente sin defectos atribuibles al traslado; disposiciones explícitas de
sus asuntos apartados en ARCH_REFACTOR_REVIEW. No commits de plantilla ni otro gate de
confirmación introducidos; la autorización Git posterior sigue pendiente como pidió usuario.
