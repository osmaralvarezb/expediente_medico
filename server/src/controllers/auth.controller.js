import { z } from 'zod';
import { HttpError } from '../errors.js';
import { COOKIE_SESION } from '../middleware/auth.js';
import { SESION_HORAS } from '../security/token.service.js';

const LoginSchema = z.object({ login: z.string().trim().min(1).max(60), password: z.string().min(1).max(200) });

/** AuthController: login con cédula o usuario; el JWT viaja en cookie HttpOnly (HU-02). */
export function createAuthController({ authService, auditoria }) {
  return {
    async login(req, res) {
      const r = LoginSchema.safeParse(req.body);
      if (!r.success) throw new HttpError(401, 'Credenciales inválidas');
      try {
        const { token, usuario } = await authService.login(r.data.login, r.data.password);
        res.cookie(COOKIE_SESION, token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: SESION_HORAS * 60 * 60 * 1000,
          path: '/',
        });
        req.user = { sub: usuario.id, role: usuario.role };
        await auditoria?.registrar(req, 'LOGIN_OK', { login: r.data.login });
        res.json({ usuario });
      } catch (e) {
        if (e.status === 401) await auditoria?.registrar(req, 'LOGIN_FALLIDO', { login: r.data.login });
        throw e;
      }
    },

    logout(req, res) {
      res.clearCookie(COOKIE_SESION, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
      res.status(204).end();
    },
  };
}
