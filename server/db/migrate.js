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
} finally {
  await client.end();
}
