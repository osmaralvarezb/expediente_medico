// HU-04 (SCRUM-7) · Cifrado AES-256 en reposo · Pareja B (Ernesto Morquecho / Andrés de Anda)
// Sprint 2 · TDD: integración contra PostgreSQL (PGlite) con la migración 002.
import { describe, it, expect, beforeAll } from 'vitest';
import { crearDbDePrueba, TIEMPO_ARRANQUE_MS } from './helpers/pglite-db.js';
import { aplicarMigraciones } from '../db/migraciones.js';
import { createCryptoService } from '../src/security/crypto.service.js';
import { createPacienteRepository, createDatosClinicosRepository } from '../src/repositories/paciente.repository.js';

const db = crearDbDePrueba();
beforeAll(() => aplicarMigraciones(db), TIEMPO_ARRANQUE_MS);
const CLAVE = 'a'.repeat(64); // 32 bytes en hexadecimal, solo para pruebas
const ANTECEDENTES = 'Diabetes mellitus tipo 2 desde 2019';

describe('Datos clínicos cifrados en PostgreSQL (HU-04)', () => {
  // I-10 · Conductor: Ernesto · Copiloto: Andrés
  it('I-10 la migración 002 agrega las columnas cifradas de antecedentes y diagnóstico', async () => {
    const { rows } = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'pacientes' ORDER BY column_name");
    expect(rows.map(r => r.column_name)).toEqual(
      expect.arrayContaining(['antecedentes_cifrado', 'diagnostico_cifrado']));
  });

  // I-11 · Conductor: Andrés · Copiloto: Ernesto
  it('I-11 un SELECT directo muestra texto cifrado, no el dato original', async () => {
    const p = await createPacienteRepository({ db }).crear({ nombre: 'Ana Pérez', curp: 'HESM680314MDFRTR09' });
    const repo = createDatosClinicosRepository({ db, crypto: createCryptoService({ key: CLAVE }) });
    await repo.guardar(p.id, { antecedentes: ANTECEDENTES, diagnostico: 'Hipertensión arterial' });
    const { rows } = await db.query('SELECT antecedentes_cifrado FROM pacientes WHERE id = $1', [p.id]);
    expect(rows[0].antecedentes_cifrado).not.toContain('Diabetes');
  });

  // I-12 · Conductor: Ernesto · Copiloto: Andrés
  it('I-12 el Repository devuelve los datos descifrados', async () => {
    const repo = createDatosClinicosRepository({ db, crypto: createCryptoService({ key: CLAVE }) });
    expect(await repo.leer(1)).toEqual({ antecedentes: ANTECEDENTES, diagnostico: 'Hipertensión arterial' });
  });
});
