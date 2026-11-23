// Incremento 1 desplegable: sesión actual, bitácora para Admin TI y la interfaz servida por la API.
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const tokensDe = role => ({ verificar: () => ({ sub: 'u1', username: 'prueba', role }) });
const COOKIE = 'ianamed_session=jwt.falso';

describe('Sesión, bitácora e interfaz (HU-02, HU-03)', () => {
  it('T-18 GET /api/auth/me sin sesión responde 401 y con sesión devuelve usuario y rol', async () => {
    expect((await request(createApp({ tokens: tokensDe('admin') })).get('/api/auth/me')).status).toBe(401);
    const res = await request(createApp({ tokens: tokensDe('admin') })).get('/api/auth/me').set('Cookie', COOKIE);
    expect(res.body.usuario).toEqual({ id: 'u1', username: 'prueba', role: 'admin' });
  });

  it('T-19 Admin TI consulta la bitácora y Recepción recibe 403 que queda registrado', async () => {
    const auditoria = { listar: vi.fn().mockResolvedValue([{ accion: 'LOGIN_OK' }]), registrar: vi.fn() };
    const ok = await request(createApp({ tokens: tokensDe('admin'), auditoria })).get('/api/auditoria').set('Cookie', COOKIE);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual([{ accion: 'LOGIN_OK' }]);
    const no = await request(createApp({ tokens: tokensDe('recepcion'), auditoria })).get('/api/auditoria').set('Cookie', COOKIE);
    expect(no.status).toBe(403);
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.anything(), 'ACCESO_DENEGADO', expect.objectContaining({ permiso: 'audit:read' }));
  });

  it('T-20 la raíz sirve la interfaz con cabeceras de seguridad', async () => {
    const res = await request(createApp({})).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('IanaMed');
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
  });
});
