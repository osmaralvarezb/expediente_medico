import 'dotenv/config';
import { createApp } from './app.js';
import { createDb } from './db/pool.js';
import { createPacienteRepository } from './repositories/paciente.repository.js';
import { createUsuarioRepository } from './repositories/usuario.repository.js';
import { createAuditoriaRepository } from './repositories/auditoria.repository.js';
import { createPacienteService } from './services/paciente.service.js';
import { createAuthService } from './services/auth.service.js';
import { createAuditoriaService } from './services/auditoria.service.js';
import { createTokenService } from './security/token.service.js';
import { passwordHasher } from './security/password-hasher.js';

// Composición: aquí se conectan las capas reales (PostgreSQL, Argon2id, JWT).
const db = createDb({ connectionString: process.env.DATABASE_URL });
const tokens = createTokenService({ secret: process.env.JWT_SECRET });
const auditoria = createAuditoriaService({ repo: createAuditoriaRepository({ db }) });
const app = createApp({
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  db,
  tokens,
  auditoria,
  pacienteService: createPacienteService({ repo: createPacienteRepository({ db }) }),
  authService: createAuthService({ usuarios: createUsuarioRepository({ db }), hasher: passwordHasher, tokens }),
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`IanaMed API en http://localhost:${port}`));
