// Solo estos campos del detalle llegan a la bitácora: nunca contraseñas ni datos clínicos.
const CAMPOS_PERMITIDOS = ['login', 'expediente', 'pacienteId', 'permiso', 'ruta', 'consulta'];

/** AuditoriaService: registra cada acceso en Auditoria_NOM024 con la IP del servidor (HU-03). */
export function createAuditoriaService({ repo }) {
  return {
    async registrar(req, accion, detalle = {}) {
      const limpio = Object.fromEntries(Object.entries(detalle).filter(([k]) => CAMPOS_PERMITIDOS.includes(k)));
      await repo.insertar({
        usuarioId: req.user?.sub ?? req.user?.id ?? null,
        rol: req.user?.role ?? null,
        ip: req.ip, // IP que ve el servidor; se ignoran encabezados como X-Forwarded-For
        accion,
        detalle: limpio,
      });
    },
  };
}
