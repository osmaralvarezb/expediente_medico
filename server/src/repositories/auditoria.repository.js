/** AuditoriaRepository: solo INSERT en auditoria_nom024 (HU-03). */
export function createAuditoriaRepository({ db }) {
  return {
    async insertar({ usuarioId, rol, ip, accion, detalle }) {
      await db.query(
        'INSERT INTO auditoria_nom024 (usuario_id, rol, ip, accion, detalle) VALUES ($1, $2, $3, $4, $5)',
        [usuarioId == null ? null : String(usuarioId), rol, ip, accion, JSON.stringify(detalle)],
      );
    },

    async listar(limite = 100) {
      const { rows } = await db.query(
        'SELECT id, fecha, usuario_id, rol, ip, accion, detalle FROM auditoria_nom024 ORDER BY id DESC LIMIT $1',
        [limite],
      );
      return rows;
    },
  };
}
