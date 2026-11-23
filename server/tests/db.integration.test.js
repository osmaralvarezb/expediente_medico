// Integración con PostgreSQL real (PGlite: PostgreSQL compilado a WebAssembly, sin Docker).
// Ejecuta 001_init.sql y prueba los Repositories y la inmutabilidad de la bitácora (HU-01, HU-02, HU-03 · B-4).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createPacienteRepository } from '../src/repositories/paciente.repository.js';
import { createUsuarioRepository } from '../src/repositories/usuario.repository.js';
import { createAuditoriaRepository } from '../src/repositories/auditoria.repository.js';

let pg;
// Adaptador con la misma forma que server/src/db/pool.js ({ rows, rowCount }).
const db = {
  async query(text, params) {
    const r = await pg.query(text, params);
    return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
  },
};

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(await readFile(new URL('../db/migrations/001_init.sql', import.meta.url), 'utf8'));
});

describe('Migración y Repositories contra PostgreSQL (HU-01, HU-02)', () => {
  it('I-01 la migración crea usuarios, pacientes y auditoria_nom024', async () => {
    const { rows } = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    expect(rows.map(r => r.table_name)).toEqual(['auditoria_nom024', 'pacientes', 'usuarios']);
  });

  it('I-02 el expediente es consecutivo y la búsqueda encuentra por nombre, CURP o expediente', async () => {
    const repo = createPacienteRepository({ db });
    const a = await repo.crear({ nombre: 'María Hernández', curp: 'HESM680314MDFRTR09' });
    const b = await repo.crear({ nombre: 'Juan Gómez', curp: 'GOPA050812HASNRLA3' });
    expect(a.expediente).toMatch(/^EXP-\d{4}-0001$/);
    expect(b.expediente).toMatch(/^EXP-\d{4}-0002$/);
    expect(await repo.existeCurp('HESM680314MDFRTR09')).toBe(true);
    expect((await repo.buscar('hernández')).map(p => p.id)).toEqual([a.id]);
    expect((await repo.buscar('gopa050812hasnrla3')).map(p => p.id)).toEqual([b.id]);
    expect((await repo.buscar(a.expediente.toLowerCase())).map(p => p.id)).toEqual([a.id]);
  });

  it('I-03 la base rechaza una CURP repetida aunque se salte el Service', async () => {
    const repo = createPacienteRepository({ db });
    await expect(repo.crear({ nombre: 'Otra', curp: 'HESM680314MDFRTR09' })).rejects.toThrow(/duplicate key|llave duplicada/);
  });

  it('I-04 el usuario se encuentra por cédula o por nombre de usuario', async () => {
    await db.query("INSERT INTO usuarios (username, cedula, nombre, role, hash) VALUES ('dra.mendoza', '10234567', 'Dra. Laura Mendoza', 'adscrito', '$argon2id$v=19$prueba')");
    const repo = createUsuarioRepository({ db });
    expect((await repo.buscarPorLogin('10234567')).username).toBe('dra.mendoza');
    expect((await repo.buscarPorLogin('dra.mendoza')).cedula).toBe('10234567');
    expect(await repo.buscarPorLogin('nadie')).toBeNull();
  });

  it('I-05 la tabla usuarios no acepta contraseñas que no sean Argon2id', async () => {
    await expect(db.query("INSERT INTO usuarios (username, nombre, role, hash) VALUES ('x', 'X', 'admin', 'texto-plano')"))
      .rejects.toThrow(/check/i);
  });
});

describe('Bitácora NOM-024 inmutable (HU-03 · B-4)', () => {
  it('I-06 permite insertar un registro', async () => {
    await createAuditoriaRepository({ db }).insertar({ usuarioId: 1, rol: 'adscrito', ip: '10.0.0.5', accion: 'LOGIN_OK', detalle: { login: 'dra.mendoza' } });
    const { rows } = await db.query('SELECT ip, accion, detalle FROM auditoria_nom024');
    expect(rows).toEqual([{ ip: '10.0.0.5', accion: 'LOGIN_OK', detalle: { login: 'dra.mendoza' } }]);
  });

  it.each([
    ['UPDATE', "UPDATE auditoria_nom024 SET accion = 'BORRADO'"],
    ['DELETE', 'DELETE FROM auditoria_nom024'],
    ['TRUNCATE', 'TRUNCATE auditoria_nom024'],
  ])('I-07 %s falla en la bitácora', async (_op, sql) => {
    await expect(db.query(sql)).rejects.toThrow(/solo inserción/);
    expect((await db.query('SELECT count(*)::int AS n FROM auditoria_nom024')).rows[0].n).toBe(1);
  });
});
