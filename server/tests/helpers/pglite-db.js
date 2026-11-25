// Adaptador de PGlite (PostgreSQL en WebAssembly) con la misma forma que server/src/db/pool.js ({ rows, rowCount }).
// Lo comparten las pruebas de integración del Sprint 2.
import { PGlite } from '@electric-sql/pglite';

// Con todas las suites en paralelo, arrancar PGlite y aplicar 001_init.sql tarda más de 5 s:
// las pruebas de integración lo hacen en beforeAll con este límite (igual que db.integration.test.js).
export const TIEMPO_ARRANQUE_MS = 30_000;

export function crearDbDePrueba() {
  const pg = new PGlite();
  return {
    async query(text, params) {
      const r = await pg.query(text, params);
      return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
    },
    exec: text => pg.exec(text),
  };
}
