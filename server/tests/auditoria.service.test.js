// HU-03 · Pareja 2 (Ernesto Morquecho / Erik Alba) · TDD: estas pruebas se escribieron antes del código.
import { describe, it, expect, vi } from 'vitest';
import { createAuditoriaService } from '../src/services/auditoria.service.js';

const reqFalso = { ip: '10.20.4.17', headers: { 'x-forwarded-for': '6.6.6.6' }, user: { id: 'u4', role: 'recepcion' } };

describe('AuditoriaService (HU-03)', () => {
  // T-16 · Conductor: Ernesto · Copiloto: Erik
  it('T-16 registra la IP tomada de req.ip, no de un encabezado del cliente', async () => {
    const repo = { insertar: vi.fn().mockResolvedValue(undefined) };
    await createAuditoriaService({ repo }).registrar(reqFalso, 'ALTA_PACIENTE', { expediente: 'EXP-2026-0001' });
    expect(repo.insertar).toHaveBeenCalledWith(expect.objectContaining({ ip: '10.20.4.17', accion: 'ALTA_PACIENTE' }));
  });

  // T-17 · Conductor: Erik · Copiloto: Ernesto
  it('T-17 no guarda contraseñas ni datos clínicos en la bitácora', async () => {
    const repo = { insertar: vi.fn().mockResolvedValue(undefined) };
    await createAuditoriaService({ repo })
      .registrar(reqFalso, 'LOGIN_FALLIDO', { login: 'recepcion', password: 'Iana2026!', diagnostico: 'Diabetes' });
    const guardado = JSON.stringify(repo.insertar.mock.calls[0]?.[0] ?? null);
    expect(guardado).not.toBe('null');
    expect(guardado).not.toContain('Iana2026!');
    expect(guardado).not.toContain('Diabetes');
  });
});
