// Pruebas unitarias de validaciones de dominio, autenticación y sello de integridad.
import assert from 'node:assert/strict';
import { validateCurp, curpBirthDate, missingNoteFields } from '../js/validators.js';
import { seedDb, findUser, noteHash, verifyNote } from '../js/data.js';

let passed = 0;
const test = async (id, name, fn) => { await fn(); passed += 1; console.log(`  ✔ ${id} ${name}`); };

// ---- CURP (CU-02, alta de paciente) ----
await test('UT-01', 'CURP válida del siglo XX', () => assert.equal(validateCurp('HESM680314MDFRTR09').ok, true));
await test('UT-02', 'CURP válida del siglo XXI (carácter 17 letra)', () => assert.equal(validateCurp('GOPA050812HASNRLA3').ok, true));
await test('UT-03', 'CURP en minúsculas se normaliza', () => assert.equal(validateCurp('raoj851102hdfmrs04').ok, true));
await test('UT-04', 'CURP con longitud incorrecta', () => assert.match(validateCurp('HESM680314').error, /18 caracteres/));
await test('UT-05', 'CURP con mes 13 y día 99 se rechaza', () => assert.match(validateCurp('AAAA991399HDFXXX01').error, /fecha/));
await test('UT-06', 'CURP con 29 de febrero en año no bisiesto se rechaza', () => assert.equal(validateCurp('HESM670229MDFRTR09').ok, false));
await test('UT-07', 'CURP con clave de estado inexistente se rechaza', () => assert.match(validateCurp('HESM680314MXXRTR09').error, /entidad/));
await test('UT-08', 'CURP con sexo distinto de H/M se rechaza', () => assert.equal(validateCurp('HESM680314XDFRTR09').ok, false));
await test('UT-09', 'Fecha de nacimiento extraída de la CURP', () => {
  assert.equal(curpBirthDate('HESM680314MDFRTR09'), '1968-03-14');
  assert.equal(curpBirthDate('GOPA050812HASNRLA3'), '2005-08-12');
});

// ---- Autenticación por cédula (CU-01) ----
const db = await seedDb();
await test('UT-10', 'Login con cédula profesional', () => assert.equal(findUser(db.users, '10234567', 'Iana2026!')?.username, 'dra.mendoza'));
await test('UT-11', 'Login con nombre de usuario (personal sin cédula)', () => assert.equal(findUser(db.users, 'recepcion', 'Iana2026!')?.role, 'recepcion'));
await test('UT-12', 'Contraseña incorrecta no autentica', () => assert.equal(findUser(db.users, '10234567', 'otra'), null));
await test('UT-13', 'Cédula inexistente no autentica', () => assert.equal(findUser(db.users, '99999999', 'Iana2026!'), null));
await test('UT-14', 'Cédula vacía no coincide con usuarios sin cédula', () => assert.equal(findUser(db.users, '', 'Iana2026!'), null));
await test('UT-14b', 'Usuario dado de baja no autentica', () => {
  const baja = db.users.map(u => (u.username === 'dr.ruiz' ? { ...u, active: false } : u));
  assert.equal(findUser(baja, '11345678', 'Iana2026!'), null);
  assert.equal(findUser(baja, 'dr.ruiz', 'Iana2026!'), null);
});

// ---- Campos obligatorios de nota (CU-03, NOM-004) ----
const full = { vitals: { ta: '120/80', fc: '70', fr: '16', temp: '36.5' }, subjetivo: 'Dolor', exploracion: 'Normal', dx: 'I10 Hipertensión', plan: 'Control' };
await test('UT-15', 'Nota completa no tiene faltantes', () => assert.deepEqual(missingNoteFields(full, { requireDiagnosis: true }), []));
await test('UT-16', 'Nota de médico sin diagnóstico ni plan', () => assert.deepEqual(missingNoteFields({ ...full, dx: '', plan: ' ' }, { requireDiagnosis: true }), ['Diagnóstico', 'Plan terapéutico']));
await test('UT-17', 'Nota de MIP no exige diagnóstico', () => assert.deepEqual(missingNoteFields({ ...full, dx: '', plan: '' }, { requireDiagnosis: false }), []));
await test('UT-18', 'Nota sin signos vitales ni exploración', () => {
  const miss = missingNoteFields({ ...full, vitals: {}, exploracion: '' }, { requireDiagnosis: true });
  assert.equal(miss.length, 5);
  assert.ok(miss.includes('Exploración física'));
});

// ---- Sello de integridad (RNF-04) ----
const p = db.patients[0], n = p.notes[0];
await test('UT-19', 'Notas firmadas del seed tienen sello válido', async () => assert.equal(await verifyNote(p.id, n), true));
await test('UT-20', 'El sello es determinista', async () => assert.equal(await noteHash(p.id, n), n.hash));
await test('UT-21', 'Alterar el plan de una nota firmada se detecta', async () => assert.equal(await verifyNote(p.id, { ...n, plan: 'ALTERADO' }), false));
await test('UT-22', 'Mover la nota a otro paciente se detecta', async () => assert.equal(await verifyNote('p2', n), false));
await test('UT-23', 'Notas pendientes (sin sello) no marcan alerta', async () => assert.equal(await verifyNote(p.id, p.notes[1]), true));

console.log(`Dominio OK (${passed} pruebas)`);
