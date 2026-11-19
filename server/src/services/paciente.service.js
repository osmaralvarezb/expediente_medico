import { HttpError } from '../errors.js';
import { validateCurp } from '../../../js/validators.js';

/** PacienteService: reglas de negocio del alta y búsqueda de pacientes (HU-01). Sin SQL. */
export function createPacienteService({ repo }) {
  return {
    async crear(datos) {
      const curp = String(datos.curp ?? '').trim().toUpperCase();
      const v = validateCurp(curp);
      if (!v.ok) throw new HttpError(400, v.error);
      if (await repo.existeCurp(curp)) throw new HttpError(409, 'La CURP ya está registrada.');
      return repo.crear({ ...datos, curp });
    },

    async buscar(q) {
      return repo.buscar(String(q ?? '').trim());
    },
  };
}
