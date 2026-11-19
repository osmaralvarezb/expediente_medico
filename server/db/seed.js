// npm run db:seed · crea los usuarios de prueba del MVP con contraseña hasheada en Argon2id.
// La contraseña de prueba se toma de SEED_PASSWORD (.env); nunca se guarda en texto plano.
import 'dotenv/config';
import pg from 'pg';
import { hashPassword } from '../src/security/password-hasher.js';

const password = process.env.SEED_PASSWORD;
if (!password) throw new Error('Defina SEED_PASSWORD en .env');

const usuarios = [
  ['dra.mendoza', '10234567', 'Dra. Laura Mendoza', 'adscrito'],
  ['dr.ruiz', '11345678', 'Dr. Andrés Ruiz', 'residente'],
  ['mip.torres', null, 'Sofía Torres', 'mip'],
  ['recepcion', null, 'Carmen López', 'recepcion'],
  ['admin', null, 'Jorge Salas', 'admin'],
];

const client = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL });
await client.connect();
try {
  for (const [username, cedula, nombre, role] of usuarios) {
    await client.query(
      `INSERT INTO usuarios (username, cedula, nombre, role, hash) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO UPDATE SET hash = EXCLUDED.hash`,
      [username, cedula, nombre, role, await hashPassword(password)],
    );
    console.log(`✓ ${username}`);
  }
} finally {
  await client.end();
}
