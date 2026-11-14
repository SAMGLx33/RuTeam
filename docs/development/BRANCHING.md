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
