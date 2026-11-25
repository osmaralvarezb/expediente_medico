// HU-03 (SCRUM-6) · Pendiente del Sprint 1: prueba automatizada de los 5 eventos de la bitácora
// Pareja B (Ernesto Morquecho / Andrés de Anda) · supertest con dobles de prueba.
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/errors.js';

const COOKIE = 'ianamed_session=jwt.falso';
const tokensDe = role => ({ verificar: () => ({ sub: 'u1', role }) });
const auditoriaFalsa = () => ({ registrar: vi.fn() });
const acciones = a => a.registrar.mock.calls.map(c => c[1]);

describe('Cada acceso genera su registro en Auditoria_NOM024 (HU-03)', () => {
  // T-21 · Conductor: Ernesto · Copiloto: Andrés
  it('T-21 login correcto registra LOGIN_OK', async () => {
    const auditoria = auditoriaFalsa();
    const authService = { login: vi.fn().mockResolvedValue({ token: 'jwt', usuario: { id: 'u1', role: 'adscrito' } }) };
    await request(createApp({ authService, auditoria })).post('/api/auth/login').send({ login: 'dra.mendoza', password: 'x' });
    expect(acciones(auditoria)).toEqual(['LOGIN_OK']);
  });

  // T-22 · Conductor: Andrés · Copiloto: Ernesto
  it('T-22 login fallido registra LOGIN_FALLIDO', async () => {
    const auditoria = auditoriaFalsa();
    const authService = { login: vi.fn().mockRejectedValue(new HttpError(401, 'Credenciales inválidas')) };
    await request(createApp({ authService, auditoria })).post('/api/auth/login').send({ login: 'nadie', password: 'x' });
    expect(acciones(auditoria)).toEqual(['LOGIN_FALLIDO']);
  });

  // T-23 · Conductor: Ernesto · Copiloto: Andrés
  it('T-23 la consulta de pacientes registra CONSULTA_PACIENTE', async () => {
    const auditoria = auditoriaFalsa();
    const pacienteService = { buscar: vi.fn().mockResolvedValue([]) };
    await request(createApp({ pacienteService, auditoria, tokens: tokensDe('adscrito') })).get('/api/pacientes?q=ana').set('Cookie', COOKIE);
    expect(acciones(auditoria)).toEqual(['CONSULTA_PACIENTE']);
  });

  // T-24 · Conductor: Andrés · Copiloto: Ernesto
  it('T-24 el alta de paciente registra ALTA_PACIENTE', async () => {
    const auditoria = auditoriaFalsa();
    const pacienteService = { crear: vi.fn().mockResolvedValue({ id: 1, expediente: 'EXP-2026-0001' }) };
    await request(createApp({ pacienteService, auditoria, tokens: tokensDe('recepcion') }))
      .post('/api/pacientes').set('Cookie', COOKIE).send({ nombre: 'Ana', curp: 'HESM680314MDFRTR09' });
    expect(acciones(auditoria)).toEqual(['ALTA_PACIENTE']);
  });

  // T-25 · Conductor: Ernesto · Copiloto: Andrés
  it('T-25 un acceso sin permiso registra ACCESO_DENEGADO', async () => {
    const auditoria = auditoriaFalsa();
    await request(createApp({ auditoria, tokens: tokensDe('mip') })).post('/api/pacientes').set('Cookie', COOKIE).send({});
    expect(acciones(auditoria)).toEqual(['ACCESO_DENEGADO']);
  });
});
