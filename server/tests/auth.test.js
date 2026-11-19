// HU-02 · Pareja 1 (Andrés de Anda / Osmar Álvarez) · TDD: estas pruebas se escribieron antes del código.
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthService } from '../src/services/auth.service.js';
import { hashPassword } from '../src/security/password-hasher.js';
import { requireAuth, requirePermission } from '../src/middleware/auth.js';
import { loginRateLimiter } from '../src/middleware/login-rate-limiter.js';
import { createApp } from '../src/app.js';

const usuario = { id: 'u1', username: 'dra.mendoza', cedula: '10234567', role: 'adscrito', activo: true, hash: '$argon2id$falso' };
const deps = (over = {}) => ({
  usuarios: { buscarPorLogin: vi.fn().mockResolvedValue(usuario) },
  hasher: { verify: vi.fn().mockResolvedValue(true) },
  tokens: { firmar: vi.fn().mockReturnValue('jwt.falso') },
  ...over,
});

describe('PasswordHasher (HU-02)', () => {
  // T-09 · Conductor: Andrés · Copiloto: Osmar
  it('T-09 el hash de la contraseña es Argon2id', async () => {
    const hash = await hashPassword('Iana2026!');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });
});

describe('AuthService (HU-02)', () => {
  // T-10 · Conductor: Osmar · Copiloto: Andrés
  it('T-10 login correcto con cédula devuelve un token', async () => {
    const r = await createAuthService(deps()).login('10234567', 'Iana2026!');
    expect(r.token).toBe('jwt.falso');
  });

  // T-11 · Conductor: Andrés · Copiloto: Osmar
  it.each([
    ['usuario inexistente', { usuarios: { buscarPorLogin: vi.fn().mockResolvedValue(null) } }],
    ['contraseña incorrecta', { hasher: { verify: vi.fn().mockResolvedValue(false) } }],
    ['usuario dado de baja', { usuarios: { buscarPorLogin: vi.fn().mockResolvedValue({ ...usuario, activo: false }) } }],
  ])('T-11 %s recibe 401 "Credenciales inválidas"', async (_caso, over) => {
    await expect(createAuthService(deps(over)).login('10234567', 'x'))
      .rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' });
  });
});

describe('Endpoint de login (HU-02)', () => {
  // T-12 · Conductor: Osmar · Copiloto: Andrés
  it('T-12 login correcto pone el JWT en cookie HttpOnly, Secure, SameSite=Strict de 8 h', async () => {
    const authService = { login: vi.fn().mockResolvedValue({ token: 'jwt.falso', usuario }) };
    const res = await request(createApp({ authService }))
      .post('/api/auth/login')
      .send({ login: 'dra.mendoza', password: 'Iana2026!' });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Max-Age=28800/);
  });

  // T-13 · Conductor: Andrés · Copiloto: Osmar
  it('T-13 el sexto intento de login en un minuto desde la misma IP responde 429', async () => {
    const app = express();
    app.post('/login', loginRateLimiter(), (req, res) => res.status(401).end());
    for (let i = 0; i < 5; i++) await request(app).post('/login');
    const sexto = await request(app).post('/login');
    expect(sexto.status).toBe(429);
  });
});

describe('Middleware de sesión y permisos (HU-02)', () => {
  const tokensInvalidos = { verificar: () => { throw new Error('token inválido'); } };
  const appProtegida = user => {
    const app = express();
    app.use((req, res, next) => { req.user = user; next(); });
    app.get('/pacientes', requireAuth({ tokens: tokensInvalidos }), (req, res) => res.sendStatus(200));
    app.get('/clinico', requirePermission('clinical:read'), (req, res) => res.sendStatus(200));
    return app;
  };

  // T-14 · Conductor: Osmar · Copiloto: Andrés
  it('T-14 una petición sin token válido recibe 401', async () => {
    const res = await request(appProtegida(undefined)).get('/pacientes');
    expect(res.status).toBe(401);
  });

  // T-15 · Conductor: Andrés · Copiloto: Osmar
  it('T-15 un rol sin permiso recibe 403 (Recepción no ve datos clínicos)', async () => {
    const res = await request(appProtegida({ id: 'u4', role: 'recepcion' })).get('/clinico');
    expect(res.status).toBe(403);
  });
});
