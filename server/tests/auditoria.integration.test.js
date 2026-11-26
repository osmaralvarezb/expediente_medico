// HU-03 (SCRUM-6) · T-03 (SCRUM-23) · Pareja B (Ernesto Morquecho / Andrés de Anda)
// Los 5 eventos de la bitácora de punta a punta: petición HTTP -> AuditoriaService -> AuditoriaRepository
// -> fila en auditoria_nom024 (PostgreSQL en PGlite). Complementa auditoria.eventos.test.js (T-21 a T-25),
// que usa una auditoría falsa: aquí se revisa lo que de verdad queda guardado.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { crearDbDePrueba, TIEMPO_ARRANQUE_MS } from './helpers/pglite-db.js';
import { aplicarMigraciones } from '../db/migraciones.js';
import { createApp } from '../src/app.js';
import { HttpError } from '../src/errors.js';
import { createAuditoriaRepository } from '../src/repositories/auditoria.repository.js';
import { createAuditoriaService } from '../src/services/auditoria.service.js';

const db = crearDbDePrueba();
beforeAll(() => aplicarMigraciones(db), TIEMPO_ARRANQUE_MS);

const auditoria = createAuditoriaService({ repo: createAuditoriaRepository({ db }) });
const COOKIE = 'ianamed_session=jwt.falso';
const IP_FALSA = '6.6.6.6'; // un cliente no debe poder elegir la IP que queda en la bitácora
const IP_LOCAL = /^(::ffff:)?127\.0\.0\.1$|^::1$/;
const tokensDe = (sub, role) => ({ verificar: () => ({ sub, role }) });

async function ultimoRegistro() {
  const { rows } = await db.query('SELECT usuario_id, rol, ip, accion, detalle FROM auditoria_nom024 ORDER BY id DESC LIMIT 1');
  return rows[0];
}

describe('Los 5 eventos quedan guardados en auditoria_nom024 (HU-03)', () => {
  // I-14 · Conductor: Ernesto · Copiloto: Andrés
  it('I-14 LOGIN_OK guarda usuario, rol, IP del servidor y el login, sin la contraseña', async () => {
    const authService = { login: async () => ({ token: 'jwt', usuario: { id: 7, role: 'adscrito' } }) };
    await request(createApp({ authService, auditoria }))
      .post('/api/auth/login').set('X-Forwarded-For', IP_FALSA)
      .send({ login: 'dra.mendoza', password: 'Iana2026!' })
      .expect(200);
    const r = await ultimoRegistro();
    expect(r).toMatchObject({ accion: 'LOGIN_OK', usuario_id: '7', rol: 'adscrito', detalle: { login: 'dra.mendoza' } });
    expect(r.ip).toMatch(IP_LOCAL);
    expect(JSON.stringify(r)).not.toContain('Iana2026!');
  });

  // I-15 · Conductor: Andrés · Copiloto: Ernesto
  it('I-15 LOGIN_FALLIDO guarda el login intentado sin usuario ni contraseña', async () => {
    const authService = { login: async () => { throw new HttpError(401, 'Credenciales inválidas'); } };
    await request(createApp({ authService, auditoria }))
      .post('/api/auth/login').set('X-Forwarded-For', IP_FALSA)
      .send({ login: 'nadie', password: 'adivinando123' })
      .expect(401);
    const r = await ultimoRegistro();
    expect(r).toMatchObject({ accion: 'LOGIN_FALLIDO', usuario_id: null, rol: null, detalle: { login: 'nadie' } });
    expect(r.ip).toMatch(IP_LOCAL);
    expect(JSON.stringify(r)).not.toContain('adivinando123');
  });

  // I-16 · Conductor: Ernesto · Copiloto: Andrés
  it('I-16 CONSULTA_PACIENTE guarda quién buscó y el texto de la búsqueda', async () => {
    const pacienteService = { buscar: async () => [] };
    await request(createApp({ pacienteService, auditoria, tokens: tokensDe('u3', 'adscrito') }))
      .get('/api/pacientes?q=ana').set('Cookie', COOKIE).set('X-Forwarded-For', IP_FALSA)
      .expect(200);
    const r = await ultimoRegistro();
    expect(r).toMatchObject({ accion: 'CONSULTA_PACIENTE', usuario_id: 'u3', rol: 'adscrito', detalle: { consulta: 'ana' } });
    expect(r.ip).toMatch(IP_LOCAL);
  });

  // I-17 · Conductor: Andrés · Copiloto: Ernesto
  it('I-17 ALTA_PACIENTE guarda el expediente creado y no los datos personales del paciente', async () => {
    const pacienteService = { crear: async () => ({ id: 1, expediente: 'EXP-2026-0001' }) };
    await request(createApp({ pacienteService, auditoria, tokens: tokensDe('u4', 'recepcion') }))
      .post('/api/pacientes').set('Cookie', COOKIE).set('X-Forwarded-For', IP_FALSA)
      .send({ nombre: 'Ana Pérez', curp: 'HESM680314MDFRTR09' })
      .expect(201);
    const r = await ultimoRegistro();
    expect(r).toMatchObject({ accion: 'ALTA_PACIENTE', usuario_id: 'u4', rol: 'recepcion', detalle: { expediente: 'EXP-2026-0001' } });
    expect(r.ip).toMatch(IP_LOCAL);
    expect(JSON.stringify(r)).not.toContain('HESM680314MDFRTR09');
  });

  // I-18 · Conductor: Ernesto · Copiloto: Andrés
  it('I-18 ACCESO_DENEGADO guarda el permiso que faltó y la ruta solicitada', async () => {
    await request(createApp({ auditoria, tokens: tokensDe('u5', 'mip') }))
      .post('/api/pacientes').set('Cookie', COOKIE).set('X-Forwarded-For', IP_FALSA)
      .send({})
      .expect(403);
    const r = await ultimoRegistro();
    expect(r).toMatchObject({
      accion: 'ACCESO_DENEGADO', usuario_id: 'u5', rol: 'mip',
      detalle: { permiso: 'patients:create', ruta: '/api/pacientes' },
    });
    expect(r.ip).toMatch(IP_LOCAL);
  });

  // I-19 · Conductor: Andrés · Copiloto: Ernesto
  it('I-19 los 5 registros siguen ahí y la tabla rechaza borrarlos o modificarlos', async () => {
    const { rows } = await db.query('SELECT accion FROM auditoria_nom024 ORDER BY id');
    expect(rows.map(x => x.accion)).toEqual(['LOGIN_OK', 'LOGIN_FALLIDO', 'CONSULTA_PACIENTE', 'ALTA_PACIENTE', 'ACCESO_DENEGADO']);
    await expect(db.query('DELETE FROM auditoria_nom024')).rejects.toThrow(/solo inserción/);
    await expect(db.query("UPDATE auditoria_nom024 SET ip = '1.1.1.1'")).rejects.toThrow(/solo inserción/);
  });
});
