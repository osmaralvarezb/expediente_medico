import { z } from 'zod';
import { HttpError } from '../errors.js';

// Antecedentes y diagnóstico: texto libre acotado; se guardan cifrados con AES-256-GCM (HU-04).
const DatosClinicosSchema = z.object({
  antecedentes: z.string().trim().max(4000).nullable().optional(),
  diagnostico: z.string().trim().max(4000).nullable().optional(),
});

function idDe(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Identificador de paciente inválido.');
  return id;
}

/**
 * DatosClinicosController: HTTP <-> DatosClinicosRepository (HU-04 · SCRUM-7).
 * Sin DATA_KEY no hay repositorio y responde 503: nunca guarda datos clínicos en claro.
 * La bitácora registra solo el id del paciente, nunca los datos clínicos.
 */
export function createDatosClinicosController({ datosClinicos, auditoria }) {
  const repo = () => {
    if (!datosClinicos) throw new HttpError(503, 'Cifrado de datos clínicos no configurado.');
    return datosClinicos;
  };
  return {
    async leer(req, res) {
      const pacienteId = idDe(req);
      const datos = await repo().leer(pacienteId);
      if (!datos) throw new HttpError(404, 'Paciente no encontrado.');
      await auditoria?.registrar(req, 'CONSULTA_DATOS_CLINICOS', { pacienteId });
      res.json(datos);
    },

    async guardar(req, res) {
      const pacienteId = idDe(req);
      const r = DatosClinicosSchema.safeParse(req.body);
      if (!r.success) throw new HttpError(400, 'Datos clínicos inválidos.');
      if (!(await repo().guardar(pacienteId, r.data))) throw new HttpError(404, 'Paciente no encontrado.');
      await auditoria?.registrar(req, 'ACTUALIZA_DATOS_CLINICOS', { pacienteId });
      res.status(204).end();
    },
  };
}
