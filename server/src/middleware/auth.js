import { can } from '../../../js/rbac.js';

export const COOKIE_SESION = 'ianamed_session';

function leerCookie(req, nombre) {
  for (const parte of String(req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** requireAuth: exige un JWT válido en la cookie de sesión; si no, 401 (HU-02). */
export function requireAuth({ tokens }) {
  return (req, res, next) => {
    const token = leerCookie(req, COOKIE_SESION);
    if (!token) return res.status(401).json({ error: 'Sesión requerida' });
    try {
      req.user = tokens.verificar(token);
      next();
    } catch {
      res.status(401).json({ error: 'Sesión inválida o vencida' });
    }
  };
}

/** requirePermission: exige que el rol tenga el permiso (RBAC con can()); si no, 403 y registro en bitácora. */
export function requirePermission(perm, { auditoria } = {}) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Sesión requerida' });
    if (can(req.user.role, perm)) return next();
    await auditoria?.registrar(req, 'ACCESO_DENEGADO', { permiso: perm, ruta: req.originalUrl });
    res.status(403).json({ error: 'Sin permiso' });
  };
}
