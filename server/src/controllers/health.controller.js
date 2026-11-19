/** HealthController: 200 con la base de datos encendida, 503 apagada (HU-01). */
export function createHealthController({ db }) {
  return {
    async check(req, res) {
      try {
        await db.ping();
        res.json({ status: 'ok', db: 'up' });
      } catch {
        res.status(503).json({ status: 'error', db: 'down' });
      }
    },
  };
}
