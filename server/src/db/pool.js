import pg from 'pg';

/** Database: pool de conexiones a PostgreSQL desde variables de entorno. */
export function createDb({ connectionString }) {
  const pool = new pg.Pool({ connectionString, max: 10 });
  return {
    query: (text, params) => pool.query(text, params),
    ping: () => pool.query('SELECT 1'),
    close: () => pool.end(),
  };
}
