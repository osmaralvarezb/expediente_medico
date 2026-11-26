// HU-04 (SCRUM-7) · Datos clínicos por rol en la API (B-9) · Sprint 2 · sesión 8
// TDD: estas pruebas se escribieron antes de las rutas /api/pacientes/:id/clinicos.
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const COOKIE = 'ianamed_session=jwt.falso';
const tokensDe = role => ({ verificar: () => ({ sub: 'u1', role }) });
const DATOS = { antecedentes: 'Diabetes mellitus tipo 2', diagnostico: 'Hipertensión arterial' };

describe('Datos clínicos por rol en la API (HU-04)', () => {
  // T-34
  it('T-34 un médico adscrito guarda antecedentes y diagnóstico (204) y queda en la bitácora sin los datos', async () => {
    const auditoria = { registrar: vi.fn() };
    const datosClinicos = { guardar: vi.fn().mockResolvedValue(true), leer: vi.fn() };
    const res = await request(createApp({ datosClinicos, auditoria, tokens: tokensDe('adscrito') }))
      .put('/api/pacientes/7/clinicos').set('Cookie', COOKIE).send(DATOS);
    expect(res.status).toBe(204);
    expect(datosClinicos.guardar).toHaveBeenCalledWith(7, DATOS);
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.anything(), 'ACTUALIZA_DATOS_CLINICOS', { pacienteId: 7 });
  });

  // T-35
  it('T-35 un médico adscrito recibe los datos clínicos descifrados (200)', async () => {
    const auditoria = { registrar: vi.fn() };
    const datosClinicos = { guardar: vi.fn(), leer: vi.fn().mockResolvedValue(DATOS) };
    const res = await request(createApp({ datosClinicos, auditoria, tokens: tokensDe('adscrito') }))
      .get('/api/pacientes/7/clinicos').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(DATOS);
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.anything(), 'CONSULTA_DATOS_CLINICOS', { pacienteId: 7 });
  });

  // T-36
  it('T-36 Enfermería no ve datos clínicos: 403 y ACCESO_DENEGADO con clinical:read', async () => {
    const auditoria = { registrar: vi.fn() };
    const datosClinicos = { guardar: vi.fn(), leer: vi.fn() };
    const res = await request(createApp({ datosClinicos, auditoria, tokens: tokensDe('enfermeria') }))
      .get('/api/pacientes/7/clinicos').set('Cookie', COOKIE);
    expect(res.status).toBe(403);
    expect(datosClinicos.leer).not.toHaveBeenCalled();
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.anything(), 'ACCESO_DENEGADO', expect.objectContaining({ permiso: 'clinical:read' }));
  });

  // T-37
  it('T-37 sin DATA_KEY configurada la API responde 503 y no guarda nada en claro', async () => {
    const res = await request(createApp({ auditoria: { registrar: vi.fn() }, tokens: tokensDe('adscrito') }))
      .get('/api/pacientes/7/clinicos').set('Cookie', COOKIE);
    expect(res.status).toBe(503);
  });

  // T-38
  it('T-38 un paciente inexistente responde 404', async () => {
    const datosClinicos = { guardar: vi.fn().mockResolvedValue(false), leer: vi.fn().mockResolvedValue(null) };
    const app = createApp({ datosClinicos, auditoria: { registrar: vi.fn() }, tokens: tokensDe('adscrito') });
    expect((await request(app).get('/api/pacientes/999/clinicos').set('Cookie', COOKIE)).status).toBe(404);
    expect((await request(app).put('/api/pacientes/999/clinicos').set('Cookie', COOKIE).send(DATOS)).status).toBe(404);
  });
});
