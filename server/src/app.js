import express from 'express';
import helmet from 'helmet';
import { HttpError } from './errors.js';
import { createHealthController } from './controllers/health.controller.js';
import { createPacienteController } from './controllers/paciente.controller.js';
import { createAuthController } from './controllers/auth.controller.js';
import { requireAuth, requirePermission } from './middleware/auth.js';
import { loginRateLimiter } from './middleware/login-rate-limiter.js';

/**
 * Fábrica de la aplicación Express. Recibe sus dependencias (db, services) para poder
 * probarla con dobles de prueba sin PostgreSQL.
 */
export function createApp({ db, pacienteService, authService, auditoria, tokens } = {}) {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  const health = createHealthController({ db });
  const pacientes = createPacienteController({ pacienteService, auditoria });
  const auth = createAuthController({ authService, auditoria });
  const sesion = requireAuth({ tokens });
  const permiso = perm => requirePermission(perm, { auditoria });

  app.get('/api/health', health.check);
  app.post('/api/auth/login', loginRateLimiter(), auth.login);
  app.post('/api/auth/logout', auth.logout);
  app.get('/api/pacientes', sesion, permiso('patients:read'), pacientes.buscar);
  app.post('/api/pacientes', sesion, permiso('patients:create'), pacientes.crear);

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
