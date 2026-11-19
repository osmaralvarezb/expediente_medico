// HU-01 · Pareja 2 (Ernesto Morquecho / Erik Alba) · TDD: estas pruebas se escribieron antes del código.
import { describe, it, expect, vi } from 'vitest';
import { createPacienteService } from '../src/services/paciente.service.js';

const CURP_OK = 'HESM680314MDFRTR09';
const repoFalso = (over = {}) => ({
  existeCurp: vi.fn().mockResolvedValue(false),
  crear: vi.fn(async d => ({ id: 1, expediente: 'EXP-2026-0001', ...d })),
  buscar: vi.fn().mockResolvedValue([]),
  ...over,
});

describe('PacienteService (HU-01)', () => {
  // T-01 · Conductor: Ernesto · Copiloto: Erik
  it('T-01 rechaza una CURP inválida con 400 y no guarda nada', async () => {
    const repo = repoFalso();
    const svc = createPacienteService({ repo });
    await expect(svc.crear({ nombre: 'Ana', curp: 'HESM680314' })).rejects.toMatchObject({ status: 400 });
    expect(repo.crear).not.toHaveBeenCalled();
  });

  // T-02 · Conductor: Erik · Copiloto: Ernesto
  it('T-02 rechaza una CURP repetida con 409 y no guarda nada', async () => {
    const repo = repoFalso({ existeCurp: vi.fn().mockResolvedValue(true) });
    const svc = createPacienteService({ repo });
    await expect(svc.crear({ nombre: 'Ana', curp: CURP_OK })).rejects.toMatchObject({ status: 409 });
    expect(repo.crear).not.toHaveBeenCalled();
  });

  // T-03 · Conductor: Ernesto · Copiloto: Erik
  it('T-03 guarda un paciente con CURP válida y devuelve su expediente', async () => {
    const repo = repoFalso();
    const svc = createPacienteService({ repo });
    const p = await svc.crear({ nombre: 'Ana', curp: CURP_OK.toLowerCase() });
    expect(repo.crear).toHaveBeenCalledWith(expect.objectContaining({ curp: CURP_OK }));
    expect(p.expediente).toBe('EXP-2026-0001');
  });

  // T-04 · Conductor: Erik · Copiloto: Ernesto
  it('T-04 busca por nombre, CURP o expediente delegando en el Repository', async () => {
    const repo = repoFalso({ buscar: vi.fn().mockResolvedValue([{ expediente: 'EXP-2026-0001' }]) });
    const svc = createPacienteService({ repo });
    const r = await svc.buscar('  EXP-2026-0001 ');
    expect(repo.buscar).toHaveBeenCalledWith('EXP-2026-0001');
    expect(r).toHaveLength(1);
  });
});
