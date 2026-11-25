// HU-01 (SCRUM-3) pendiente del Sprint 1 y HU-05 (SCRUM-10) · Pareja A (Osmar Álvarez / Erik Alba)
// Sprint 2 · TDD fase roja: las migraciones se aplican sobre una base PostgreSQL vacía (PGlite).
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { aplicarMigraciones } from '../db/migraciones.js';

let pg;
const db = {
  async query(text, params) {
    const r = await pg.query(text, params);
    return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
  },
  exec: text => pg.exec(text),
};

beforeAll(() => { pg = new PGlite(); });

describe('Migraciones sobre base vacía (HU-01 · pendiente del Sprint 1)', () => {
  // I-08 · Conductor: Osmar · Copiloto: Erik
  it('I-08 aplicarMigraciones crea las tablas en una base vacía y registra cada migración', async () => {
    const aplicadas = await aplicarMigraciones(db);
    expect(aplicadas[0]).toBe('001_init.sql');
    const { rows } = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    expect(rows.map(r => r.table_name)).toEqual(
      expect.arrayContaining(['auditoria_nom024', 'pacientes', 'schema_migraciones', 'usuarios']));
  });

  // I-09 · Conductor: Erik · Copiloto: Osmar
  it('I-09 aplicarMigraciones es idempotente: la segunda corrida no aplica nada', async () => {
    expect(await aplicarMigraciones(db)).toEqual([]);
  });
});

describe('Rol de Enfermería en la base de datos (HU-05)', () => {
  // I-13 · Conductor: Osmar · Copiloto: Erik
  it('I-13 la tabla usuarios acepta el rol enfermeria', async () => {
    await aplicarMigraciones(db);
    await db.query("INSERT INTO usuarios (username, nombre, role, hash) VALUES ('enf.prueba', 'Enf. Prueba', 'enfermeria', '$argon2id$v=19$prueba')");
    const { rows } = await db.query("SELECT role FROM usuarios WHERE username = 'enf.prueba'");
    expect(rows[0].role).toBe('enfermeria');
  });
});
