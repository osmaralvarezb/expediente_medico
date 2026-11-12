import assert from 'node:assert/strict';
import { ANALYTES, formatValue, validateLabResults, refFor, formatRef, parseValue, flagFor, isLabStudy } from '../js/labs.js';
import { STUDY_CATALOG } from '../js/studies.js';

const QS_OK = { glucosa: '90', bun: '24.73', urea: '53', creatinina: '0.70', acidoUrico: '5.6' };
const EGO_OK = { color: 'Amarillo', aspecto: 'Claro', densidad: '1.020', ph: '6.0', glucosaOrina: 'Negativo', proteinas: 'Negativo', leucocitosOrina: '2', eritrocitosOrina: '1', bacterias: 'Escasas' };

let n = 0;
const test = async (id, name, fn) => { try { await fn(); n++; console.log(`  ✔ ${id} ${name}`); } catch (e) { console.error(`  ✘ ${id} ${name}\n    ${e.message}`); process.exitCode = 1; } };

await test('LB-01', 'Todos los estudios tienen analitos', () => {
  assert.equal(Object.keys(ANALYTES).length, 10);
  for (const code of ['LAB-BH', 'LAB-QS', 'LAB-PL', 'LAB-HBA1C', 'LAB-EGO', 'LAB-PFH', 'LAB-ES', 'LAB-TC', 'LAB-UC', 'LAB-HCG']) {
    assert.ok(ANALYTES[code], `Estudio ${code} no encontrado`);
    assert.ok(Array.isArray(ANALYTES[code].items), `Estudio ${code} no tiene items`);
  }
});

await test('LB-02', 'Glucosa 90 → null flag, 106 → null (boundary), 106.1 → alto, 73.9 → bajo', () => {
  const item = ANALYTES['LAB-QS'].items.find(i => i.key === 'glucosa');
  assert.equal(flagFor(item, 90, 'Femenino'), null);
  assert.equal(flagFor(item, 106, 'Femenino'), null);
  assert.equal(flagFor(item, 106.1, 'Femenino'), 'alto');
  assert.equal(flagFor(item, 73.9, 'Femenino'), 'bajo');
});

await test('LB-03', 'BUN 24.73 → alto y formatRef "7.94 - 20.10"', () => {
  const item = ANALYTES['LAB-QS'].items.find(i => i.key === 'bun');
  assert.equal(flagFor(item, 24.73, 'Femenino'), 'alto');
  assert.equal(formatRef(item, 'Femenino'), '7.94 - 20.10');
});

await test('LB-04', 'Creatinina 1.10 → alto para Femenino pero null para Masculino', () => {
  const item = ANALYTES['LAB-QS'].items.find(i => i.key === 'creatinina');
  assert.equal(flagFor(item, 1.10, 'Femenino'), 'alto');
  assert.equal(flagFor(item, 1.10, 'Masculino'), null);
});

await test('LB-05', 'Rango combinado para sexo "Otro" en creatinina', () => {
  const item = ANALYTES['LAB-QS'].items.find(i => i.key === 'creatinina');
  const ref = refFor(item, 'Otro');
  assert.equal(ref.min, 0.52);
  assert.equal(ref.max, 1.17);
});

await test('LB-06', 'HbA1c "5,80" (coma) parsea a 5.8 y marca alto', () => {
  const item = ANALYTES['LAB-HBA1C'].items.find(i => i.key === 'hba1c');
  assert.equal(parseValue(item, '5,80'), 5.8);
  assert.equal(flagFor(item, 5.8, 'Femenino'), 'alto');
});

await test('LB-07', 'validateLabResults para LAB-QS con varios valores', () => {
  const result = validateLabResults('LAB-QS', {
    glucosa: '90',
    bun: '24.73',
    urea: '53',
    creatinina: '0.70',
    acidoUrico: '5.6'
  }, 'Femenino');
  assert.ok(result.ok);
  assert.equal(result.results.length, 5);
  assert.equal(result.results[0].flag, null);
  assert.equal(result.results[1].flag, 'alto');
  assert.equal(result.results[2].flag, 'alto');
  assert.equal(result.results[3].flag, null);
  assert.equal(result.results[4].flag, null);
});

await test('LB-08', 'Error por valor faltante', () => {
  const r = validateLabResults('LAB-QS', { ...QS_OK, glucosa: '' }, 'Femenino');
  assert.ok(!r.ok);
  assert.deepEqual(r.errors, ['Falta el valor de Glucosa.']);
});

await test('LB-09', 'Error por valor no numérico', () => {
  const r = validateLabResults('LAB-QS', { ...QS_OK, glucosa: 'abc' }, 'Femenino');
  assert.ok(!r.ok);
  assert.deepEqual(r.errors, ['Glucosa: valor numérico no válido.']);
});

await test('LB-10', 'Error por valor negativo', () => {
  const r = validateLabResults('LAB-QS', { ...QS_OK, glucosa: '-5' }, 'Femenino');
  assert.ok(!r.ok);
  assert.deepEqual(r.errors, ['Glucosa: no puede ser negativo.']);
});

await test('LB-11', 'EGO glucosaOrina "Positivo" → anormal', () => {
  const r = validateLabResults('LAB-EGO', { ...EGO_OK, glucosaOrina: 'Positivo' }, 'Femenino');
  assert.ok(r.ok);
  assert.equal(r.results.find(i => i.key === 'glucosaOrina').flag, 'anormal');
});

await test('LB-12', 'EGO aspecto "Verde" → valor no permitido', () => {
  const r = validateLabResults('LAB-EGO', { ...EGO_OK, aspecto: 'Verde' }, 'Femenino');
  assert.ok(!r.ok);
  assert.deepEqual(r.errors, ['Aspecto: valor no permitido.']);
});

await test('LB-13', 'Urocultivo campos opcionales pueden estar vacíos y se omiten', () => {
  const result = validateLabResults('LAB-UC', { desarrollo: 'Sin desarrollo', microorganismo: '', ufc: '' }, 'Femenino');
  assert.ok(result.ok);
  assert.equal(result.results.length, 1); // Solo el campo obligatorio
});

await test('LB-14', 'Estudio no existente lanza error', () => {
  const result = validateLabResults('INVALID-CODE', {}, 'Femenino');
  assert.ok(!result.ok);
  assert.equal(result.errors[0], 'El estudio no tiene analitos configurados.');
});

await test('LB-15', 'isLabStudy funciona correctamente', () => {
  assert.ok(isLabStudy('LAB-BH'));
  assert.ok(isLabStudy('LAB-QS'));
  assert.ok(!isLabStudy('RX-TX'));
});

await test('LB-16', 'Texto con solo espacios es considerado vacío', () => {
  const r = validateLabResults('LAB-EGO', { ...EGO_OK, aspecto: '   ' }, 'Femenino');
  assert.ok(!r.ok);
  assert.deepEqual(r.errors, ['Falta el valor de Aspecto.']);
});

await test('LB-17', 'Texto con solo espacios es considerado vacío para campos requeridos', () => {
  const r = validateLabResults('LAB-QS', { ...QS_OK, glucosa: '   ' }, 'Femenino');
  assert.ok(!r.ok);
  assert.deepEqual(r.errors, ['Falta el valor de Glucosa.']);
});

await test('LB-18', 'Texto con opción en minúsculas se normaliza a la opción original', () => {
  const r = validateLabResults('LAB-EGO', { ...EGO_OK, aspecto: 'claro' }, 'Femenino');
  assert.ok(r.ok);
  assert.equal(r.results.find(x => x.key === 'aspecto').value, 'Claro');
});

await test('LB-19', 'formatValue conserva los decimales del analito y deja los textos igual', () => {
  assert.equal(formatValue('LAB-QS', { key: 'creatinina', value: 0.4 }), '0.40');
  assert.equal(formatValue('LAB-HBA1C', { key: 'hba1c', value: 5.8 }), '5.80');
  assert.equal(formatValue('LAB-BH', { key: 'plaquetas', value: 250 }), '250');
  assert.equal(formatValue('LAB-EGO', { key: 'aspecto', value: 'Claro' }), 'Claro');
});

if (process.exitCode === 1) {
  console.log(`Laboratorio FALLARON (${n} aprobadas)`);
} else {
  console.log(`Laboratorio OK (${n} pruebas)`);
}
