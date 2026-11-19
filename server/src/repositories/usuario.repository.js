/** UsuarioRepository: busca por cédula profesional o por nombre de usuario (HU-02). */
export function createUsuarioRepository({ db }) {
  return {
    async buscarPorLogin(login) {
      const { rows } = await db.query(
        'SELECT id, username, cedula, nombre, role, hash, activo FROM usuarios WHERE username = $1 OR cedula = $1',
        [login],
      );
      return rows[0] ?? null;
    },
  };
}
