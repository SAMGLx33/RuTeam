# Auditoría Fase 2 — revisión local, integración controlada y preparación de reservas

Fecha: 2026-11-13, America/Bogota. Agente: Codex. Responsables humanos: POR_ASIGNAR.
**Dictamen: APROBAR CON CONDICIONES**, limitado al corte académico DEMO y a preparar
su revisión para un commit local posteriormente autorizado. **No autoriza stage, commit,
PR, merge, push, producción ni implementación de Fase 3.** La promoción está retenida
hasta revisión humana y tratamiento explícito de los riesgos indicados abajo.

## 1. Identidad y alcance exacto

Repositorio: /home/darik/RuTeam/RuTeam. Rama/HEAD reales al iniciar y cerrar:
`task/trips-publicacion` / `e3841bc189ac1661210adf920cd3f8fb3db6a8ce`.
`main`, `dev` y `feature` conservan ese SHA; `task/docs-foundation-checkpoint` conserva
`f637499113a9094f588f73fc880d25ab7071b002`. No se cambió de rama ni se creó historia.
Origin local conservado; no fetch ni operaciones de red Git. Stage vacío.

Sujeto inicial: 44 rutas rastreadas modificadas/eliminadas +34 archivos nuevos=78.
Se reconstruyó el diff contra feature incluyendo TODOS los nuevos no ignorados; coincide
byte a byte con /tmp/ruteam-phase2-review.patch:276283bytes,
SHA256 `7dba8677e6e867153e3c198160dbe46c0fad0da65261e81301e6502d320aa73e`.
[Manifest completo de entrada](evidence/2026-11-13-fase2-audit/input-manifest.json)
conserva paths y hashes individuales. La identidad auditada no incluye los documentos
nuevos de esta propia revisión. No se evaluó sólo git diff --stat, que omite untracked.

No hubo cambios de código productivo, tests o esquema en esta auditoría. Única corrección
al material previo: aclaración de API.md sobre Trip.version interno, registrada como D-01.
Los restantes cambios de esta sesión son revisión, plan, coordinación y evidencia duradera.

## 2. Matriz de hallazgos y condiciones

| ID   | Tipo / severidad                                     | Evidencia y efecto                                                                                                                                                                                                                                 | Resolución / condición                                                                                                                                                  |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Documentación / baja                                 | API.md atribuía una «versión para futuro» a TripSummary. El tipo en packages/contracts y present() en trips.repository no serializan version; sólo Trip en Prisma lo tiene. Un consumidor podría esperar un campo inexistente.                     | Corregido sólo API.md: version es interno. Sin alterar contrato ni runtime.                                                                                             |
| R-01 | Dependencias / riesgo abierto alto                   | npm audit real exit1:40 avisos,5altos. Son heredados del stack; no se añadió dependencia. No se demostró explotación ni irrelevancia de todos los caminos.                                                                                         | Antes de promoción, integrador registra análisis de alcance, parche compatible o aceptación de riesgo limitada por escrito; no usar --force ni declarar audit aprobado. |
| G-01 | Plataforma / evidencia pendiente                     | Doctor/export y viewport móvil no prueban cámara, SecureStore, red LAN o Expo Go físico.                                                                                                                                                           | BLOQUEADO POR ENTORNO. QA ejecuta checklist física antes de declarar hito web+móvil completo y promocionar entrega estable.                                             |
| G-02 | Cobertura / parcial                                  | Suite cubre las invariantes principales; no cubre exhaustivamente categorías de licencia por tipo, reglas inactivas/duplicadas, documentos cuyo vencimiento coincide exactamente con fin y adyacencia de intervalos. Fuente sí contiene controles. | Revisores de backend/datos deciden pruebas dirigidas antes de promoción; no se afirma cobertura exhaustiva ni un fallo de producto por ausencia de test.                |
| R-02 | Recuperación / impacto alto, recuperación gestionada | Dos migraciones nuevas crean estado persistente y FKs; no se ensayó rollback con datos ni restauración.                                                                                                                                            | Revisar migraciones y recuperación; revertir aplicación no implica borrar tablas. Sin down/reset/destrucción de datos.                                                  |
| C-01 | Proceso / pendiente                                  | Fase 2 y checkpoint documental sin integrar; no hay evidencia de protección remota o CI ejecutada.                                                                                                                                                 | Integrador humano POR_ASIGNAR controla revisión y autorizaciones separadas por operación.                                                                               |

No se confirmaron defectos nuevos críticos/altos de lógica o bypass de autorización en
el código Fase 2 acotado. Esto no acredita seguridad productiva ni ausencia total de
vulnerabilidades; R-01 sigue abierto. Se revisaron también los arreglos históricos de
origen array y revisión obsoleta: las pruebas de esta sesión vuelven a observarlos.

D-01 se verifica en [TripSummary](../../packages/contracts/src/index.ts),
[serializador del repositorio](../../backend/src/modules/trips/infrastructure/repositories/trips.repository.ts)
y la [aclaración de API](../development/API.md). La corrección no añade campos públicos.

## 3. Integridad y fronteras comprobadas

| Frontera                | Recorrido de código y contraejemplo                                                                                                                                     | Control / evidencia                                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identidad y propietario | VehiculoController extrae req.principal.userId; listarPropios filtra ownerId; DTO no acepta reviewStatus/owner arbitrarios. Publicar con vehículo ajeno sería escalada. | SessionGuard revalida afiliación y ViajeService compara ownerId dentro de la unidad. HTTP casos inactivo/ajeno pasan.                                                                |
| Revisión ADMIN          | Acceder a bandeja o aprobar como miembro; reusar una tarjeta vieja tras reemplazar CAR por BOTH.                                                                        | admin() consulta rol de BD; revision+PENDING+vigencia comprobadas después del lock User;409 obsoleto. Revisor/fecha persistidos, sin consulta oficial.                               |
| Capacidad / documentos  | Intentos de auto con 5 pasajeros, moto con 2 y cupos cero/negativos, pendiente/vencido o licencia que vence antes de salir.                                             | DTO/política y constraints BD; licencia/categoría/SOAT revalidados hasta expectedEndAt. Pruebas reales, no cálculos de UI.                                                           |
| Tiempo / simultaneidad  | Dos viajes superpuestos del mismo conductor leen inicialmente la misma disponibilidad.                                                                                  | withDriverLock toma User FOR UPDATE parametrizado; comprobación de intervalos y creación única transaccional. Test Promise.all observa [201,409] y conteo+1. No test de último cupo. |
| Destino / ruta          | UUID inexistente, USC deshabilitado, coordenada fuera de rango, orden no consecutivo, origin array o status inyectado.                                                  | Destino de catálogo activo y campusUSC; DTO IsObject/rangos y Viaje valida orden.400 sin viaje ficticio; origen/duración/recogidas explícitamente DEMO.                              |
| Atomicidad              | Fallo intermedio que dejara sólo parte del viaje.                                                                                                                       | Trip/TripStop/TripRuleSelection/TripEventPUBLISHED en misma transacción; source-trace. No se inyectó fallo de escritura en esta sesión: límite de la protección ejecutada.           |
| Cliente compartido      | Pantalla oculta como supuesto control o publicación optimista falsa.                                                                                                    | React/Expo consume API; servidor conserva autoridad. E2E registra, admin revisa en otro contexto, publica y recarga; controles de errores visibles.                                  |
| Estados / contratos     | Confundir LLENO con COMPLETADO o disponibilidad con reserva.                                                                                                            | TripStatus separado de Viaje.ocupacion; sólo publicación PROGRAMADO con0ocupados. No reservas, WS ni transiciones operativas. D-01 aclara la versión interna.                        |

## 4. Verificación repetida en esta sesión

Entorno observado: Linux VirtualBox; Node22.22.3, npm12.2.2, PostgreSQL18.6 en55432;
Nest11.2.10/Prisma7.10.1/Expo54.0.38/React19.1/RN0.81.5/TS5.9.3 según instalación.
Ejecución secuencial UTC02:24:42–02:25:34 del14/11, equivalente a21:24:42–21:25:34
del13/11 en Bogota. No se atribuyen a esta sesión las exportaciones históricas.

| Estado                | Comando exacto ejecutado                          | Resultado / límite                                                                      |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| APROBADO              | npm run db:generate                               | exit0,cliente generado; no cambia schema                                                |
| APROBADO              | npm run db:migrate                                | exit0,4migraciones existentes,sin pendientes; no migración nueva ni reset               |
| APROBADO              | npm run db:seed                                   | exit0; huellas de12tablas antes/después iguales, conserva existentes                    |
| APROBADO              | npm run db:test:setup                             | exit0,base ruteam_test distinta de ruteam, sin borrado                                  |
| APROBADO              | npm run typecheck                                 | exit0,API/cliente/contratos/tests; estático                                             |
| APROBADO              | npm run lint                                      | exit0,sin errores                                                                       |
| APROBADO              | npm run test (equivale a npm test)                | exit0,71/71 en5suites,Supertest y PostgreSQL real                                       |
| APROBADO              | npm run test:e2e                                  | exit0,4/4,Chromium desktop y móvilweb; servidores3100/8082 creados y cerrados por suite |
| APROBADO              | npm run smoke                                     | exit0,6/6 sobre API DEMO3000 existente                                                  |
| APROBADO              | npx expo-doctor apps/client                       | exit0,18/18; no teléfono                                                                |
| APROBADO              | git diff --check                                  | exit0; no modifica Git                                                                  |
| FALLIDO               | npm audit --json                                  | exit1,40avisos:1bajo/34moderados/5altos/0críticos; sin aplicar fixes                    |
| APROBADO              | Lectura de _prisma_migrations en dev/test         | 4/4 checksums coinciden en cada BD, terminadas/sin rollback                             |
| NO REPETIDO           | Export web/Android/iOS de Fase 2                  | Históricos del handoff, no resultados de esta sesión; no cambio runtime                 |
| NO EJECUTADO          | Carga/RNF/rollback/restauración/Windows/CI remoto | Sin atribuir resultados                                                                 |
| BLOQUEADO POR ENTORNO | Expo Go físico/WiFi real                          | Sin dispositivo/versión observados; checklist debajo                                    |

[Resultados y comandos](evidence/2026-11-13-fase2-audit/results.json),
[71tests](evidence/2026-11-13-fase2-audit/07-jest.txt),
[4flujos web](evidence/2026-11-13-fase2-audit/08-playwright.txt),
[seed](evidence/2026-11-13-fase2-audit/seed-idempotence.json),
[checksums](evidence/2026-11-13-fase2-audit/migration-checksums.json),
[audit completo](evidence/2026-11-13-fase2-audit/npm-audit.json).
Archivos .txt son salidas sin credenciales/PII, permitidas por ignore; no .log forzados.
Jest emite avisos VM Modules y pg8 por consulta ocupada; no se escondieron ni se elevó pg.

Puertos previos: Node65059 API3000, Node41077 Expo8081, PostgreSQL21355 puerto55432.
Se inspeccionaron ss y argumentos de procesos; no se reiniciaron ni duplicaron servicios.
3100/8082 estaban libres. .env permanece sin cambios (recibo booleano, sin exponer valores).
No se aplicaron --force, reseteos, rebase, stash o borrados de bases. Tests limpian sólo
los UUID que crean en la BD_test según los fixtures existentes.

### Alcance de las cinco altas de npm audit

La nueva salida identifica cinco paquetes afectados, no cinco exploits probados:

| Paquete              | Camino relevante / límite observado                                     | Acción pendiente compatible                                                                             |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| decode-uri-component | query-string/Expo Router; entradas URI/deep link del cliente            | Revisar entradas y parche compatible con Router/SDK54; no asumir que rutas actuales eliminan el riesgo. |
| query-string         | Alta propagada desde decode-uri-component                               | Tratar la misma cadena, sin contar un fix independiente probado.                                        |
| expo-router          | Dependencia directa del cliente; alta propagada por cadena de rutas     | npm propone Router58, fuera de matriz SDK54; no aplicado.                                               |
| image-size           | Procesamiento de assets vía Metro; sin upload de imágenes en este corte | fixAvailable=true; compatibilidad y lockfile requieren ensayo en tarea de dependencias.                 |
| postcss              | Herramientas Expo/Metro; sin CSS remoto proporcionado por usuarios      | npm propone cambiar Expo a52; no aplicado ni aceptado como solución compatible.                         |

[DEPENDENCY_REVIEW](../development/DEPENDENCY_REVIEW.md) conserva el análisis previo por
los40paquetes. Se confirmó el mismo total y estos caminos en la salida actual; no se
ensayaron fixes ni se comprobó explotación. Responsable de dependencias POR_ASIGNAR debe
registrar alcance, versión candidata, Doctor/E2E/export y teléfono tras cualquier parche.

Cierre documental: `npm run format:check` exit0 y nueva ejecución de `git diff --check`
exit0 tras preparar los entregables; salidas en [formato](evidence/2026-11-13-fase2-audit/13-format-check.txt)
y [diff final](evidence/2026-11-13-fase2-audit/14-final-diff-check.txt).
El [control de privacidad y alcance](evidence/2026-11-13-fase2-audit/privacy-and-scope.json)
leyó los87archivos existentes propuestos (103paths con16eliminados), sin patrones comunes
de secretos o correos ajenos a dominios DEMO/ejemplo. Ningún path privado/generado propuesto,
0originales privados rastreados,0cambios en hashes de código/tests/schema y stage vacío.
Las entradas históricas de EVIDENCE/PROGRESS/coordinación/trazabilidad se conservaron como
prefijos exactos frente al snapshot inicial. Es una revisión acotada, no detección universal de PII.

## 5. Esquema, migraciones, seed y recuperación

El sujeto agrega Vehicle/VehicleDocument/DriverEligibility, TripRuleDefinition/Selection,
Trip/TripStop/TripEvent, índices/FKs/constraints. Mantiene UUID/timestamptz/Decimal y
columna legacy driverDemoApproved; permisos no se deducen de esa columna al publicar.
Nuevas respecto a feature:20261114014345_phase2_vehicle_publication y
20261114015557_phase2_document_revisions. Son aditivas; sin DROP/ALTER destructivo de
las tablas fundacionales. Comprobados checksums de las cuatro migraciones en ambas bases.
Esta sesión no acredita aplicación desde una BD completamente vacía, ni recuperación.
Seed crea cuatro identidades sintéticas y catálogos/vehículo/licencia si faltan; update{}
conserva cambios. Idempotencia comprobada, no sólo inferida de upsert.

No revertir quitando migraciones aplicadas. Para retroceder aplicación, el integrador
analiza consumidores y conserva nuevas tablas/datos; cualquier reconciliación de esquema
se haría con una migración posterior revisada. Backup local fuera de Git y restauración
son condiciones a diseñar/ensayar, no operaciones realizadas aquí.

## 6. Privacidad y fuentes

Originales en paquete privado ignorado, no se copian a artefactos/commit. No se incorporan
.env, tokens, fotos, teléfonos/cédulas, documentos ni correos personales. Derivados ERS/UML
se cotejan por hashes, IDs y criterios sin ficha de autores. No auditoría automática de
explotación completa; revisiones de secretos son controles acotados, no garantía absoluta.
El alcance es DEMO: no identidad USC real, no RUNT/SOAT oficial ni pagos. RF-001 prioridad
sin aclarar, género/moto, penalidad>30/<30, costos y iOS14 permanecen abiertos/excepciones.

## 7. Checkpoint y promoción propuesta (no ejecutada)

f637499 cambia cuatro archivos: BRANCHING, PROGRESS, WORKSTREAMS y un handoff nuevo.
Tres se superponen con Fase 2; el handoff sólo existe en su rama. No modifica runtime.
`git merge-base --is-ancestor f637499 feature` es falso. No requisito técnico para auditar
este árbol, pero sí hay que reconciliar el historial documental antes de integración final.

Propuesta: primero autorizar/revisar el commit local de Fase 2 con el manifest completo.
Revisar PR del checkpoint hacia feature y PR de la tarea hacia feature por separado,
con orden acordado por integrador; preservar ambas entradas históricas y resolver los
conflictos documentales, sin sustituir archivos completos. Alternativa autorizada: cherry-pick
f637499 en rama de reconciliación limpia, marcando procedencia y preservando su rama.
No cherry-pick/merge ni simulación sobre el árbol sucio. Nunca forzar refs compartidas.

| Promoción propuesta            | Revisión humana requerida (personas POR_ASIGNAR)               | Gate                                                                                                              |
| ------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| task/trips-publicacion→feature | Datos, backend/identidad, frontend, documentación e integrador | Migraciones/contratos revisados, resultados nuevos, deuda audit tratada, commit/PR autorizados                    |
| feature→dev                    | Integrador + revisores cruzados de módulos                     | Reconciliar checkpoint, flujo integrado y migraciones, CI real; sólo entonces actualizar estado integrado         |
| dev→main                       | PO + QA + integrador                                           | Guion demo, prueba física o excepción expresamente acordada, decisiones/riesgos aceptados y aprobación de entrega |

## 8. Checklist física Expo Go — BLOQUEADO POR ENTORNO

No hay modelo, SO o versión Expo Go observados en teléfono. QA POR_ASIGNAR registra
fecha/zona, dispositivo/SO/Expo Go/SDK, red, pasos y resultado, sin seriales/PII.

- [ ] Confirmar Expo Go real compatible con SDK54; iOS15.1+ y excepción iOS14 documentada.
- [ ] Identificar IP alcanzable del host/VM y modo NAT/puente. Probar health de la API
      desde teléfono en la misma WiFi; no asumir que localhost o10.0.2.15 son alcanzables.
- [ ] Responsable humano confirma URL LAN y CORS exactos de desarrollo; esta auditoría no
      cambia .env. Reiniciar únicamente procesos propios tras inspeccionar puertos si hace falta.
- [ ] Abrir la app desde Metro/Expo Go; distinguir QR de Metro de QR institucional/abordaje.
- [ ] Login activo Ana/Diego y rechazo Laura; perfil actual leído desde auth/me y guardado.
- [ ] Verificar sesión SecureStore/restauración/logout reales, sin capturar token en evidencia.
- [ ] Registrar placa/vehículo/licencia sintéticos; comprobar PENDING y bloqueo de publicación.
- [ ] ADMIN en sesión independiente revisa documento correcto; tarjeta obsoleta debe409.
- [ ] Publicar hacia entrada/parqueadero USC DEMO, salida>30min, cupos válidos y2recogidas.
- [ ] Ver listado propio y persistencia tras recarga; cuenta ajena no ve viajes propios.
- [ ] Cortar/conectar red y observar error/reintento sin fabricar éxito; no afirmar background GPS.
- [ ] Guardar checklist textual y sólo capturas sintéticas consentidas. Aprobar por plataforma
      realmente probada, sin extrapolar un teléfono a todos los sistemas.

## 9. Riesgo de parche y recomendación final

Impacto si falla:alto por ADMIN, estado persistente, contrato y migraciones. Probabilidad:
moderada. Protección:parcial (tests útiles exactos, plataforma/rollback incompletos).
Recuperación:gestionada; confianza:moderada. No candidato a merge automático.

La revisión estática independiente no encontró fallos nuevos reportables y conservó
`hold_for_evidence` por el alcance no resuelto de las alertas heredadas. Su helper de
validación semántica rechazó tanto merge con audit fallido como hold con ese mismo fallo.
**No se presenta ese JSON como validado ni como aprobación.** La discrepancia de herramienta
no convierte audit en aprobado; se preserva en esta revisión el resultado funcional y el
riesgo pendiente. El informe humano anterior es la recomendación para este corte, no un merge.

Condiciones precisas: revisión humana asignada y autorización de commit; análisis/mitigación
compatible de las cinco altas o decisión de riesgo local explícita; reconciliar documentos
antes de promoción; prueba física antes de declarar hito completo. Sin resolver estas
condiciones no se aprueba promoción ni comienza producción de Fase 3.

Propuesta de mensaje e inventario exhaustivo: [FASE2_COMMIT_PROPOSAL](FASE2_COMMIT_PROPOSAL.md).
Diseño de reservas únicamente: [FASE3_RESERVAS_PLAN](../development/FASE3_RESERVAS_PLAN.md).

Nota de navegación 2026-11-14: el enlace al repositorio de viajes usa ahora backend/src.
Las rutas narradas, hashes, comandos y hechos del corte anterior siguen siendo históricos;
no son resultados nuevos de la migración. Ver ARCH_REFACTOR_REVIEW para el corte actual.
