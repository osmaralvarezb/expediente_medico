// HU-05 (SCRUM-10) · Rol de Enfermería · Pareja A (Osmar Álvarez / Erik Alba)
// Sprint 2 · TDD fase roja: estas pruebas se escribieron antes del código.
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { ROLES, can } from '../../js/rbac.js';
import { createApp } from '../src/app.js';
import { USUARIOS_SEMILLA } from '../db/usuarios-semilla.js';

const COOKIE = 'ianamed_session=jwt.falso';
const tokens = { verificar: () => ({ sub: 'u9', role: 'enfermeria' }) };

describe('Rol de Enfermería (HU-05)', () => {
  // T-31 · Conductor: Osmar · Copiloto: Erik
  it('T-31 rbac.js tiene el rol enfermeria: consulta pacientes, no los da de alta ni ve la bitácora', () => {
    expect(ROLES.enfermeria).toBe('Enfermería');
    expect(can('enfermeria', 'patients:read')).toBe(true);
    expect(can('enfermeria', 'patients:create')).toBe(false);
    expect(can('enfermeria', 'audit:read')).toBe(false);
  });

  // T-32 · Conductor: Erik · Copiloto: Osmar
  it('T-32 Enfermería consulta pacientes (200); el alta responde 403 y queda en la bitácora', async () => {
    const auditoria = { registrar: vi.fn() };
    const pacienteService = { buscar: vi.fn().mockResolvedValue([]), crear: vi.fn() };
    const app = createApp({ pacienteService, auditoria, tokens });
    expect((await request(app).get('/api/pacientes?q=ana').set('Cookie', COOKIE)).status).toBe(200);
    expect((await request(app).post('/api/pacientes').set('Cookie', COOKIE).send({ nombre: 'X', curp: 'Y' })).status).toBe(403);
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.anything(), 'ACCESO_DENEGADO', expect.objectContaining({ permiso: 'patients:create' }));
  });

  // T-33 · Conductor: Osmar · Copiloto: Erik
  it('T-33 db:seed crea la cuenta de revisión revision.enfermeria con rol enfermeria', () => {
    expect(USUARIOS_SEMILLA.find(u => u[0] === 'revision.enfermeria')?.[3]).toBe('enfermeria');
  });
});
