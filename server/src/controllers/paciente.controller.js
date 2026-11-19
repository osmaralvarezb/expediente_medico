import { z } from 'zod';
import { HttpError } from '../errors.js';

// Forma del cuerpo; las reglas de negocio (CURP válida y no repetida) viven en PacienteService.
const PacienteSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  curp: z.string().trim().min(1).max(18),
  sexo: z.enum(['H', 'M']).optional(),
  telefono: z.string().trim().max(20).optional(),
});

/** PacienteController: HTTP <-> PacienteService (HU-01). */
export function createPacienteController({ pacienteService, auditoria }) {
  return {
    async crear(req, res) {
      const r = PacienteSchema.safeParse(req.body);
      if (!r.success) throw new HttpError(400, 'Datos del paciente incompletos o inválidos.');
      const paciente = await pacienteService.crear(r.data);
      await auditoria?.registrar(req, 'ALTA_PACIENTE', { expediente: paciente.expediente });
      res.status(201).json(paciente);
    },

    async buscar(req, res) {
      const q = String(req.query.q ?? '');
      const pacientes = await pacienteService.buscar(q);
      await auditoria?.registrar(req, 'CONSULTA_PACIENTE', { consulta: q.slice(0, 40) });
      res.json(pacientes);
    },
  };
}
