import assert from 'node:assert/strict';
import { createStudyRequest, advanceStudy, STUDY_CATALOG, STUDY_STATUS, readyNotices, worklist, sampleCode, createStudyOrder, findBySampleCode, ordersOf, statusLabel } from '../js/studies.js';

let n = 0;
const test = async (id, name, fn) => { try { await fn(); n++; console.log(`  ✔ ${id} ${name}`); } catch (e) { console.error(`  ✘ ${id} ${name}\n    ${e.message}`); process.exitCode = 1; } };

const u1 = { id: 'u1', name: 'Dra. Laura Mendoza', role: 'adscrito' };
const u6 = { id: 'u6', name: 'QFB Mariana Pérez', role: 'laboratorio' };
const u7 = { id: 'u7', name: 'Dr. Hugo Lara', role: 'imagenologia' };
const u4 = { id: 'u4', name: 'Carmen López', role: 'recepcion' };
const u3 = { id: 'u3', name: 'Sofía Torres', role: 'mip' };

await test('ST-01', 'Catálogo tiene 19 estudios (10 laboratorio, 9 imagenologia)', () => {
  assert.equal(STUDY_CATALOG.length, 19);
  const labCount = STUDY_CATALOG.filter(s => s.area === 'laboratorio').length;
  const imgCount = STUDY_CATALOG.filter(s => s.area === 'imagenologia').length;
  assert.equal(labCount, 10);
  assert.equal(imgCount, 9);
});

await test('ST-02', 'Creación por adscrito funciona', () => {
  const req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);
  assert.equal(req.status, 'solicitado');
  assert.equal(req.requestedBy.name, u1.name);
});

await test('ST-03', 'MIP no puede solicitar estudios', () => {
  assert.throws(() => createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u3), new Error('Tu rol no puede solicitar estudios.'));
});

await test('ST-04', 'Código de estudio inválido lanza error', () => {
  assert.throws(() => createStudyRequest({
    patientId: 'p1',
    studyCode: 'INVALID-CODE',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1), new Error('Estudio no válido.'));
});

await test('ST-05', 'Indicación vacía o excesiva lanza error', () => {
  assert.throws(() => createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: '',
    prioridad: 'rutina'
  }, u1), new Error('La indicación clínica es obligatoria (máx. 500 caracteres).'));
  assert.throws(() => createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'A'.repeat(501),
    prioridad: 'rutina'
  }, u1), new Error('La indicación clínica es obligatoria (máx. 500 caracteres).'));
});

await test('ST-06', 'Prioridad inválida lanza error', () => {
  assert.throws(() => createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'invalid'
  }, u1), new Error('Prioridad no válida.'));
});

await test('ST-07', 'Flujo completo laboratorio solicitado→en_proceso→listo→entregado', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);

  req = advanceStudy(req, 'iniciar', u6);
  assert.equal(req.status, 'en_proceso');
  assert.equal(req.processedBy.name, u6.name);

  req = advanceStudy(req, 'completar', u6, { 
    results: [{ key: 'hba1c', name: 'Hemoglobina glucosilada (HbA1c)', value: 5.8, unit: '%', ref: '4.00 - 5.60', flag: 'alto' }] 
  });
  assert.equal(req.status, 'listo');
  assert.equal(req.completedBy.name, u6.name);
  assert.equal(req.pickup, null);

  req = advanceStudy(req, 'entregar', u4);
  assert.equal(req.status, 'entregado');
  assert.equal(req.deliveredBy, u4.name);

  assert.equal(req.history.length, 4);
});

await test('ST-08', 'Estudio imagenología completa con pickup correcto', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'RX-TX',
    indicacion: 'Dolor torácico',
    prioridad: 'urgente'
  }, u1);

  req = advanceStudy(req, 'iniciar', u7);
  req = advanceStudy(req, 'completar', u7, { resultado: 'Sin patología' });
  assert.equal(req.pickup, 'Imagenología · sala de interpretación y entrega de estudios');
});

await test('ST-09', 'Usuario laboratorio no puede iniciar estudio imagenologia', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'RX-TX',
    indicacion: 'Dolor torácico',
    prioridad: 'urgente'
  }, u1);

  assert.throws(() => advanceStudy(req, 'iniciar', u6), new Error('Tu rol no puede realizar esta acción.'));
});

await test('ST-10', 'No se puede completar desde solicitado', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);

  assert.throws(() => advanceStudy(req, 'completar', u6, { resultado: 'Normal' }), new Error('Acción no permitida en el estado actual.'));
});

await test('ST-11', 'Completar requiere resultado para imagenología', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);
  req = advanceStudy(req, 'iniciar', u6);

  assert.throws(() => advanceStudy(req, 'completar', u6), new Error('Captura los valores del estudio.'));
});

await test('ST-12', 'Recepción no puede iniciar estudios', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);

  assert.throws(() => advanceStudy(req, 'iniciar', u4), new Error('Tu rol no puede realizar esta acción.'));
});

await test('ST-13', 'Cancelación requiere motivo y solo desde solicitado', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);

  assert.throws(() => advanceStudy(req, 'cancelar', u1), new Error('Indica el motivo de cancelación.'));
  assert.throws(() => advanceStudy(req, 'cancelar', u1, { motivo: '' }), new Error('Indica el motivo de cancelación.'));

  req = advanceStudy(req, 'cancelar', u1, { motivo: 'Paciente no se presentó' });
  assert.equal(req.status, 'cancelado');
  assert.equal(req.cancelReason, 'Paciente no se presentó');

  // No se puede cancelar desde en_proceso
  let req2 = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);
  req2 = advanceStudy(req2, 'iniciar', u6);
  assert.throws(() => advanceStudy(req2, 'cancelar', u1, { motivo: 'Error' }), new Error('Acción no permitida en el estado actual.'));
});

await test('ST-14', 'advanceStudy no muta el input', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);

  const originalHistoryLength = req.history.length;
  const originalStatus = req.status;

  advanceStudy(req, 'iniciar', u6);
  assert.equal(req.history.length, originalHistoryLength); // No debe cambiar
  assert.equal(req.status, originalStatus); // No debe cambiar
});

await test('ST-15', 'readyNotices filtra por paciente y estado listo', () => {
  const requests = [
    { id: 'r1', patientId: 'p1', status: 'listo', area: 'imagenologia' },
    { id: 'r2', patientId: 'p2', status: 'listo', area: 'imagenologia' },
    { id: 'r3', patientId: 'p1', status: 'solicitado', area: 'imagenologia' },
    { id: 'r4', patientId: 'p1', status: 'listo', area: 'laboratorio' }
  ];
  const notices = readyNotices(requests, 'p1');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].id, 'r1');
});

await test('ST-16', 'worklist ordena por urgente y fecha', () => {
  const requests = [
    { id: 'r1', area: 'laboratorio', status: 'solicitado', prioridad: 'rutina', requestedAt: '2024-01-01T00:00:00Z' },
    { id: 'r2', area: 'laboratorio', status: 'solicitado', prioridad: 'urgente', requestedAt: '2024-01-02T00:00:00Z' },
    { id: 'r3', area: 'laboratorio', status: 'en_proceso', prioridad: 'rutina', requestedAt: '2024-01-03T00:00:00Z' }
  ];
  const list = worklist(requests, 'laboratorio');
  assert.equal(list[0].id, 'r2'); // urgente primero
  assert.equal(list[1].id, 'r1'); // luego rutina más antigua
});

await test('ST-17', 'sampleCode formato LAB-261111-0007 y GAB-...', () => {
  const labCode = sampleCode('laboratorio', 7, '2026-11-11T09:00:00');
  assert.equal(labCode, 'LAB-261111-0007');
  
  const gabCode = sampleCode('imagenologia', 7, '2026-11-11T09:00:00');
  assert.equal(gabCode, 'GAB-261111-0007');
});

await test('ST-18', 'createStudyOrder con 3 estudios laboratorio', () => {
  const result = createStudyOrder({
    patientId: 'p1',
    studyCodes: ['LAB-BH', 'LAB-QS', 'LAB-PL'],
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1, { now: '2026-11-11T09:00:00', firstSeq: 100 });
  
  assert.equal(result.orderId, result.requests[0].orderId);
  assert.equal(result.requests.length, 3);
  assert.equal(result.nextSeq, 103);
  
  const codes = result.requests.map(r => r.sampleCode);
  assert.equal(codes[0], 'LAB-261111-0100');
  assert.equal(codes[1], 'LAB-261111-0101');
  assert.equal(codes[2], 'LAB-261111-0102');
});

await test('ST-19', 'createStudyOrder rechaza duplicados', () => {
  assert.throws(() => createStudyOrder({
    patientId: 'p1',
    studyCodes: ['LAB-BH', 'LAB-BH'],
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1, { firstSeq: 100 }), new Error('Selecciona entre 1 y 10 estudios distintos.'));
});

await test('ST-20', 'createStudyOrder rechaza lista vacía', () => {
  assert.throws(() => createStudyOrder({
    patientId: 'p1',
    studyCodes: [],
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1, { firstSeq: 100 }), new Error('Selecciona entre 1 y 10 estudios distintos.'));
});

await test('ST-21', 'createStudyOrder rechaza más de 10 estudios', () => {
  assert.throws(() => createStudyOrder({
    patientId: 'p1',
    studyCodes: Array(11).fill('LAB-BH'),
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1, { firstSeq: 100 }), new Error('Selecciona entre 1 y 10 estudios distintos.'));
});

await test('ST-22', 'findBySampleCode es insensible a mayúsculas/espacios y respeta área', () => {
  const requests = [
    { sampleCode: 'LAB-261111-0007', area: 'laboratorio' },
    { sampleCode: 'GAB-261111-0007', area: 'imagenologia' }
  ];
  
  assert.ok(findBySampleCode(requests, 'lab-261111-0007', 'laboratorio'));
  assert.ok(!findBySampleCode(requests, 'LAB-261111-0007', 'imagenologia'));
  assert.ok(!findBySampleCode(requests, 'GAB-261111-0007', 'laboratorio'));
});

await test('ST-23', 'lab completar sin resultados lanza error', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);
  req = advanceStudy(req, 'iniciar', u6);
  
  assert.throws(() => advanceStudy(req, 'completar', u6), new Error('Captura los valores del estudio.'));
});

await test('ST-24', 'imagenología completar aún requiere resultado', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'RX-TX',
    indicacion: 'Dolor torácico',
    prioridad: 'urgente'
  }, u1);
  req = advanceStudy(req, 'iniciar', u7);
  
  assert.throws(() => advanceStudy(req, 'completar', u7), new Error('Captura el resultado o la interpretación del estudio.'));
});

await test('ST-25', 'ordersOf agrupa por orden y ordena por fecha descendente', () => {
  const requests = [
    { id: 'r1', patientId: 'p1', orderId: 'order1', requestedAt: '2024-01-01T00:00:00Z' },
    { id: 'r2', patientId: 'p1', orderId: 'order2', requestedAt: '2024-01-02T00:00:00Z' },
    { id: 'r3', patientId: 'p1', orderId: 'order1', requestedAt: '2024-01-03T00:00:00Z' }
  ];
  
  const orders = ordersOf(requests, 'p1');
  assert.equal(orders.length, 2);
  assert.equal(orders[0].orderId, 'order2'); // más reciente
  assert.equal(orders[1].orderId, 'order1');
});

await test('ST-26', 'sampleCode usa fecha local para evitar problemas de zona horaria', () => {
  const code = sampleCode('laboratorio', 7, '2026-11-11T23:59:59Z'); // UTC
  assert.equal(code, 'LAB-261111-0007'); // Debe usar la fecha local (no UTC)
});

await test('ST-27', 'createStudyOrder con fechas específicas', () => {
  const result = createStudyOrder({
    patientId: 'p1',
    studyCodes: ['LAB-BH', 'LAB-QS'],
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1, { 
    now: '2026-11-11T09:00:00',
    firstSeq: 50
  });
  
  assert.equal(result.requests[0].sampleCode, 'LAB-261111-0050');
  assert.equal(result.requests[1].sampleCode, 'LAB-261111-0051');
});

await test('ST-28', 'lab completar con resultados válidos funciona correctamente', () => {
  let req = createStudyRequest({
    patientId: 'p1',
    studyCode: 'LAB-BH',
    indicacion: 'Dolor abdominal',
    prioridad: 'rutina'
  }, u1);
  req = advanceStudy(req, 'iniciar', u6);
  
  const results = [{ key: 'hba1c', name: 'Hemoglobina glucosilada (HbA1c)', value: 5.8, unit: '%', ref: '4.00 - 5.60', flag: 'alto' }];
  req = advanceStudy(req, 'completar', u6, { results });
  
  assert.ok(req.results);
  assert.equal(req.results[0].flag, 'alto');
});

await test('ST-29', 'Orden mixta: cada código usa el prefijo de su área (LAB / GAB)', () => {
  const { requests } = createStudyOrder({ patientId: 'p1', studyCodes: ['LAB-BH', 'RX-TX'], indicacion: 'Fiebre y tos', prioridad: 'rutina' }, u1, { now: '2026-11-11T09:00:00', firstSeq: 7 });
  assert.deepEqual(requests.map(r => r.sampleCode), ['LAB-261111-0007', 'GAB-261111-0008']);
});

await test('ST-30', 'Las observaciones del laboratorio se guardan en resultado', () => {
  const [req] = createStudyOrder({ patientId: 'p1', studyCodes: ['LAB-HBA1C'], indicacion: 'Control', prioridad: 'rutina' }, u1, { now: '2026-11-11T09:00:00', firstSeq: 1 }).requests;
  const results = [{ key: 'hba1c', name: 'HbA1c', value: 5.8, unit: '%', ref: '4.00 - 5.60', flag: 'alto' }];
  const done = advanceStudy(advanceStudy(req, 'iniciar', u6), 'completar', u6, { results, resultado: '  Muestra lipémica.  ' });
  assert.equal(done.resultado, 'Muestra lipémica.');
});

await test('ST-31', 'statusLabel: laboratorio listo = Resultados disponibles; imagenología listo = Listo para recoger', () => {
  assert.equal(statusLabel({ status: 'listo', area: 'laboratorio' }), 'Resultados disponibles');
  assert.equal(statusLabel({ status: 'listo', area: 'imagenologia' }), 'Listo para recoger');
  assert.equal(statusLabel({ status: 'en_proceso', area: 'laboratorio' }), 'En proceso');
});

if (process.exitCode === 1) {
  console.log(`Estudios FALLARON (${n} aprobadas)`);
} else {
  console.log(`Estudios OK (${n} pruebas)`);
}
