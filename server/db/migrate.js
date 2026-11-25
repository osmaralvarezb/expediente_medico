// npm run db:migrate · aplica en orden las migraciones pendientes de server/db/migrations (ver migraciones.js).
import 'dotenv/config';
import pg from 'pg';
import { aplicarMigraciones } from './migraciones.js';

const client = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL });
await client.connect();
try {
  const aplicadas = await aplicarMigraciones(client);
  for (const f of aplicadas) console.log(`✓ ${f}`);
  if (!aplicadas.length) console.log('✓ sin migraciones pendientes');
  // La contraseña del rol de la aplicación se toma del entorno, nunca del repositorio.
  const appPassword = process.env.APP_DB_PASSWORD;
  const { rowCount } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'ianamed_app'");
  if (appPassword && rowCount) {
    await client.query(`ALTER ROLE ianamed_app PASSWORD ${client.escapeLiteral(appPassword)}`);
    console.log('✓ contraseña de ianamed_app asignada desde APP_DB_PASSWORD');
  }
} finally {
  await client.end();
}
