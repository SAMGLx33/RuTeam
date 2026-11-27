# Traspaso: identidad estudiantil y autogestión

Fecha: 2026-11-25 America/Bogota. Rama actual task/driver-defined-routes, base72a31d7.
Responsables y revisión humana POR_ASIGNAR. Sin stage, commit, push, PR o merge.

Leer PRODUCT_DEFINITION, AGENTS raíz/backend/frontend y
[decisiones y endpoints del incremento](../reviews/STUDENT_IDENTITY_SELF_SERVICE.md).
El trabajo pertenece al incremento coordinado de redefinición, con viajes y
participaciones editados por otros frentes en el mismo checkout.

Se retiró administración del contrato, sesión, persistencia operativa, endpoints y
pantallas. Migración nueva conserva revisores y relaciones históricas, deshabilita
ADMIN/no-estudiantes y revoca sus sesiones; no reclasifica usuarios. Seed crea
estudiantes sintéticos nuevos donde antes había cuentas no estudiantiles; placa
habilitada de Diego STU123. Sara sustituye el uso de admin como segunda estudiante
en pruebas de participación. La BD nunca fue reinicializada por este frente.

isActiveMembership conserva firma y exige STUDENT; VehiculoPolicy conserva firma y
separa declaración sintética de fuente autorizada. Autogestión documental registra y
renueva sin aprobación interna; nuevo PATCH vehicles/:id/soat exige propietario bajo
lock conductor. La UI normal informa indisponibilidad institucional y sólo ofrece
fixtures mediante opt-in explícito cuando el servidor lo permite. El entorno real
falla cerrado. .env.example es seguro por defecto; .env real intacto.

Verificación propia: pruebas de política observadas RED antes del cambio (ocho
fallos); ESLint propio aprobado y formato aplicado. Pruebas nuevas de auth/documentos,
HTTP y web preparadas. La ejecución integrada de Jest/PostgreSQL/Playwright está
serializada por el ejecutor central; no inferir aprobación desde este handoff.

Próximos pasos: revisar resultados integrados, verificar migración sobre historias
ADMIN/docente y FKs con PostgreSQL real, mantener sin tocar SQL aplicado, revisar
contratos/UI junto con viajes y participaciones. Obtener autorización institucional
antes de implementar autenticación/vigencia real; documentos externos permanecen
sin conector autorizado. No declarar prueba de teléfono por ejecutar exports.

Modelo sugerido para continuidad: GPT-6, esfuerzo High. El equipo debe recibir
resultados reales y revisión humana antes de cualquier promoción Git.
