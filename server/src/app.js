import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { HttpError } from './errors.js';
import { createHealthController } from './controllers/health.controller.js';
import { createPacienteController } from './controllers/paciente.controller.js';
import { createAuthController } from './controllers/auth.controller.js';
import { requireAuth, requirePermission } from './middleware/auth.js';
import { loginRateLimiter } from './middleware/login-rate-limiter.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));

/**
 * Fábrica de la aplicación Express. Recibe sus dependencias (db, services) para poder
 * probarla con dobles de prueba sin PostgreSQL.
 * trustProxy: número de proxies de confianza (1 en Render) para que req.ip sea la IP del cliente
 * que ve el proxy del servidor, no un encabezado que el cliente pueda falsificar a su gusto.
 */
export function createApp({ db, pacienteService, authService, auditoria, tokens, trustProxy = false } = {}) {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(PUBLIC_DIR));

  const health = createHealthController({ db });
  const pacientes = createPacienteController({ pacienteService, auditoria });
  const auth = createAuthController({ authService, auditoria });
  const sesion = requireAuth({ tokens });
  const permiso = perm => requirePermission(perm, { auditoria });

  app.get('/api/health', health.check);
  app.post('/api/auth/login', loginRateLimiter(), auth.login);
  app.post('/api/auth/logout', auth.logout);
  app.get('/api/auth/me', sesion, (req, res) => res.json({ usuario: { id: req.user.sub, username: req.user.username, role: req.user.role } }));
  app.get('/api/pacientes', sesion, permiso('patients:read'), pacientes.buscar);
  app.post('/api/pacientes', sesion, permiso('patients:create'), pacientes.crear);
  app.get('/api/auditoria', sesion, permiso('audit:read'), async (req, res) => res.json(await auditoria.listar(100)));

  app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));
  // Express 5 pasa aquí los errores de handlers async.
  app.use((err, req, res, next) => {
    if (err instanceof HttpError || Number.isInteger(err.status)) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  });
  return app;
}
