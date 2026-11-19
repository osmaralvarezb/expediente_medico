// HU-01 · Pareja 2 (Ernesto Morquecho / Erik Alba) · Pruebas de la API con supertest y dobles de prueba.
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/errors.js';

// Sesión falsa de Recepción (tiene patients:create): las rutas de pacientes exigen JWT válido.
const tokens = { verificar: () => ({ sub: 'u4', role: 'recepcion' }) };
const COOKIE = 'ianamed_session=jwt.falso';

describe('API de salud y pacientes (HU-01)', () => {
  // T-05 · Conductor: Erik · Copiloto: Ernesto
  it('T-05 GET /api/health responde 200 con la base de datos encendida', async () => {
    const app = createApp({ db: { ping: vi.fn().mockResolvedValue(true) } });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  // T-06 · Conductor: Ernesto · Copiloto: Erik
  it('T-06 GET /api/health responde 503 con la base de datos apagada', async () => {
    const app = createApp({ db: { ping: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) } });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
  });

  // T-07 · Conductor: Erik · Copiloto: Ernesto
  it('T-07 POST /api/pacientes responde 201 con el expediente', async () => {
    const pacienteService = { crear: vi.fn().mockResolvedValue({ id: 1, expediente: 'EXP-2026-0001' }) };
    const res = await request(createApp({ pacienteService, tokens }))
      .post('/api/pacientes')
      .set('Cookie', COOKIE)
      .send({ nombre: 'Ana', curp: 'HESM680314MDFRTR09' });
    expect(res.status).toBe(201);
    expect(res.body.expediente).toBe('EXP-2026-0001');
  });

  // T-08 · Conductor: Ernesto · Copiloto: Erik
  it('T-08 POST /api/pacientes traduce el error 409 del Service', async () => {
    const pacienteService = { crear: vi.fn().mockRejectedValue(new HttpError(409, 'La CURP ya está registrada.')) };
    const res = await request(createApp({ pacienteService, tokens }))
      .post('/api/pacientes')
      .set('Cookie', COOKIE)
      .send({ nombre: 'Ana', curp: 'HESM680314MDFRTR09' });
    expect(res.status).toBe(409);
  });
});
