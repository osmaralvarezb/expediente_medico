/**
 * Ejecutor de migraciones reutilizable (HU-01 · SCRUM-3).
 * Aplica en orden los .sql de server/db/migrations y registra cada uno en schema_migraciones,
 * para que docker compose + npm run db:migrate funcione igual en local, en CI y en Render.
 * db: { query(text, params) } (pool pg o adaptador de PGlite) y, opcionalmente, exec(text) para varios comandos.
 */
import { readdir, readFile } from 'node:fs/promises';

const DIR = new URL('./migrations/', import.meta.url);

async function listarArchivos() {
  return (await readdir(DIR)).filter(n => n.endsWith('.sql')).sort();
}

export async function aplicarMigraciones(db) {
  const ejecutar = sql => (db.exec ? db.exec(sql) : db.query(sql));
  await ejecutar(`CREATE TABLE IF NOT EXISTS schema_migraciones (
    nombre VARCHAR(120) PRIMARY KEY,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const { rows } = await db.query('SELECT nombre FROM schema_migraciones');
  const yaAplicadas = new Set(rows.map(r => r.nombre));
  const aplicadas = [];
  for (const archivo of await listarArchivos()) {
    if (yaAplicadas.has(archivo)) continue;
    await ejecutar(await readFile(new URL(archivo, DIR), 'utf8'));
    await db.query('INSERT INTO schema_migraciones (nombre) VALUES ($1)', [archivo]);
    aplicadas.push(archivo);
  }
  return aplicadas;
}
