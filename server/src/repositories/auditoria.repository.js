/** AuditoriaRepository: solo INSERT en auditoria_nom024 (HU-03). */
export function createAuditoriaRepository({ db }) {
  return {
    async insertar({ usuarioId, rol, ip, accion, detalle }) {
      await db.query(
        'INSERT INTO auditoria_nom024 (usuario_id, rol, ip, accion, detalle) VALUES ($1, $2, $3, $4, $5)',
        [usuarioId == null ? null : String(usuarioId), rol, ip, accion, JSON.stringify(detalle)],
      );
    },
  };
}
