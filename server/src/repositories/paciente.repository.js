/** PacienteRepository: único lugar con SQL de pacientes (HU-01). Siempre SQL parametrizado. */
export function createPacienteRepository({ db }) {
  return {
    async existeCurp(curp) {
      const { rows } = await db.query('SELECT 1 FROM pacientes WHERE curp = $1 LIMIT 1', [curp]);
      return rows.length > 0;
    },

    async crear({ nombre, curp, sexo = null, telefono = null }) {
      const { rows } = await db.query(
        `INSERT INTO pacientes (nombre, curp, sexo, telefono) VALUES ($1, $2, $3, $4)
         RETURNING id, expediente, curp, nombre, sexo, telefono, creado_en`,
        [nombre, curp, sexo, telefono],
      );
      return rows[0];
    },

    async buscar(q) {
      const { rows } = await db.query(
        `SELECT id, expediente, curp, nombre, sexo, telefono FROM pacientes
         WHERE $1 = '' OR lower(nombre) LIKE '%' || lower($1) || '%' OR curp = upper($1) OR expediente = upper($1)
         ORDER BY nombre LIMIT 50`,
        [q],
      );
      return rows;
    },
  };
}

/**
 * Datos clínicos cifrados en reposo (HU-04 · SCRUM-7). El Repository cifra al guardar y descifra al leer
 * con CryptoService; en PostgreSQL solo queda el texto cifrado. Sprint 2 · fase roja.
 */
export function createDatosClinicosRepository({ db, crypto }) {
  return {
    async guardar(pacienteId, { antecedentes, diagnostico }) {
      throw new Error('No implementado');
    },
    async leer(pacienteId) {
      throw new Error('No implementado');
    },
  };
}
