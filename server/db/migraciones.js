/**
 * Ejecutor de migraciones reutilizable (HU-01 · SCRUM-3, pendiente del Sprint 1).
 * Aplica en orden los .sql de server/db/migrations y registra cada uno en schema_migraciones,
 * para que docker compose + npm run db:migrate funcione igual en local, en CI y en Render.
 * Sprint 2 · fase roja.
 */
export async function aplicarMigraciones(db) {
  throw new Error('No implementado');
}
