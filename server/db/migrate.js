// npm run db:migrate · ejecuta en orden los .sql de server/db/migrations.
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';

const dir = new URL('./migrations/', import.meta.url);
const client = new pg.Client({ connectionString: process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL });
await client.connect();
try {
  for (const f of (await readdir(dir)).filter(n => n.endsWith('.sql')).sort()) {
    await client.query(await readFile(new URL(f, dir), 'utf8'));
    console.log(`✓ ${f}`);
  }
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
