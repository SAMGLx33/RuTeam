# Ramas e historia

Inspección inicial: checkout en RuTeam/RuTeam, main, origin
`https://github.com/SAMGLx33/RuTeam.git`, historia `7967674 Initial commit`.
El remoto NO estaba vacío según refs locales: incluía README. Se preserva esa historia;
no ejecutar git init, reset ni sustituir origin. No se realizó fetch ni push en esta sesión.

La fundación solicitada se prepara como segundo commit local en main (excepción
explícita de setup). SHA de fundación: consultar el handoff inicial y
`git log --format='%H %s'`; el handoff del commit no puede contener su propio SHA.
Tras verificar, se crean dev y feature apuntando al mismo commit de fundación.
No crear/reescribir referencias ya existentes sin inspeccionar divergencia.

Flujo: `task/* → feature → dev → main`. feature es rama literal; `feature/algo`
colisionaría en refs/heads. task/* sólo se crea desde feature. Reusar la misma rama
al retomar una tarea. Fuente de verdad: main entrega estable, dev integración
verificada (CURRENT_STATUS), feature trabajo revisado, task/* trabajo individual.
Crear referencias iniciales no equivale a aprobación/revisión funcional en dev.

Próxima tarea, tras status limpio:

```bash
git switch feature
git switch -c task/trips-publicacion
```

Si ya existe esa task, retomarla. Con remoto publicado y autorización, fetch/pull
--ff-only de feature antes de crear tarea. Cada PR incluye código+tests+docs+handoff.
Integrador humano controla promociones y sincronización dev→feature mediante merge
revisado. No rebases/reset/force push en ramas compartidas. Conflictos: resolver y
probar sin descartar trabajo de otro integrante.

Publicación pendiente: confirmar URL/permisos y autorización explícita del equipo.
Sólo después: git push -u origin main, dev y feature (por separado). No se ha publicado.
Protecciones GitHub pendientes de configurar por responsable humano: PR/revisor/CI,
sin force push ni borrado. Ningún PR/merge remoto creado en esta intervención.

## Inspección de continuidad Fase 2

2026-11-13: main/dev/feature=e3841bc189ac1661210adf920cd3f8fb3db6a8ce;
task/docs-foundation-checkpoint=f637499113a9094f588f73fc880d25ab7071b002, sin integrar
a feature. Nueva task/trips-publicacion creada desde feature sin fusionar ese checkpoint.
Se excluyó primero el paquete privado untracked del usuario en .git/info/exclude y luego
se agregó exclusión permanente en .gitignore de esta task. No se borró/movió/stasheó
ningún original ni se cambió .env. No commits nuevos en esta intervención: cambios
runtime+tests+documentación+handoff sin stage a espera de autorización explícita.
Origin preservado, no fetch/push/PR/merge. Revisar task completa antes de decidir commit.

## Excepción controlada de base para refactor — 2026-11-14

Preflight limpio en task/trips-publicacion, HEAD bab4e630784714f8fa58bcbf964ea5a48e37259a;
fetch origin confirmó origin/task/trips-publicacion. Feature/main/dev=e3841bc; no
origin/feature observado. merge-base --is-ancestor task/trips-publicacion feature exit1.
Por instrucción expresa del equipo se creó task/refactor-monorepo-structure desde ese
commit Fase 2, sin cambiar las otras ramas. Esta excepción no modifica el flujo general.

Integrar primero Fase 2 revisada a feature; después revisar el diff de refactor contra
esa feature. No presentar PR de refactor que arrastre Fase 2 inadvertidamente. Sin stage,
commit, push, PR, merge o rebase en esta intervención. Mensaje propuesto no ejecutado:
refactor(architecture): reorganize RuTeam into backend and frontend workspaces.
Checkpoint f637499 sigue aislado; su reconciliación documental requiere revisión propia.
