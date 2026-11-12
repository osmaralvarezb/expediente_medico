import assert from 'node:assert/strict';
import { sanitizeNoteHtml, noteHtmlToText, isBlankNoteHtml } from '../js/rich-text.js';

let n = 0;
const test = async (id, name, fn) => { try { await fn(); n++; console.log(`  ✔ ${id} ${name}`); } catch (e) { console.error(`  ✘ ${id} ${name}\n    ${e.message}`); process.exitCode = 1; } };

await test('RT-01', 'HTML básico se mantiene intacto', () => {
  const input = '<b>Dx:</b> HTA<br><ul><li>Uno</li><li>Dos</li></ul>';
  assert.equal(sanitizeNoteHtml(input), input);
});

await test('RT-02', 'Etiquetas fuertes se normalizan a negritas', () => {
  const input = '<strong class="x" style="color:red">A</strong>';
  assert.equal(sanitizeNoteHtml(input), '<b>A</b>');
});

await test('RT-03', 'Imágenes con eventos son eliminadas', () => {
  const input = '<img src=x onerror=alert(1)>Hola';
  assert.equal(sanitizeNoteHtml(input), 'Hola');
});

await test('RT-04', 'Scripts y etiquetas prohibidas son eliminadas', () => {
  const input = '<script>alert(1)</script>Texto';
  assert.equal(sanitizeNoteHtml(input), 'Texto');
});

await test('RT-05', 'Atributos en etiquetas permitidas son eliminados', () => {
  const input = '<b onclick="x()">Hi</b>';
  assert.equal(sanitizeNoteHtml(input), '<b>Hi</b>');
});

await test('RT-06', 'Enlaces javascript son eliminados', () => {
  const input = '<a href="javascript:alert(1)">link</a>';
  assert.equal(sanitizeNoteHtml(input), 'link');
});

await test('RT-07', 'Divs se mantienen intactos', () => {
  const input = '<div>Línea 1</div><div>Línea 2</div>';
  assert.equal(sanitizeNoteHtml(input), input);
});

await test('RT-08', 'Self-closing br se normaliza', () => {
  const input = '<br/>';
  assert.equal(sanitizeNoteHtml(input), '<br>');
});

await test('RT-09', 'Caracteres especiales son escapados', () => {
  const input = '5 < 7 & 8 > 2';
  assert.equal(sanitizeNoteHtml(input), '5 &lt; 7 &amp; 8 &gt; 2');
});

await test('RT-10', 'Entidades existentes se mantienen', () => {
  const input = '&amp;';
  assert.equal(sanitizeNoteHtml(input), '&amp;');
});

await test('RT-11', 'Etiquetas sin cerrar son eliminadas', () => {
  const input = '<b onmouseover=alert(1) ';
  const out = sanitizeNoteHtml(input);
  assert.ok(!/<b[\s>]/i.test(out));
  assert.ok(out.includes('&lt;b'));
});

await test('RT-12', 'Comentarios se eliminan', () => {
  const input = '<!-- c --><b>x</b>';
  assert.equal(sanitizeNoteHtml(input), '<b>x</b>');
});

await test('RT-13', 'Estilos y scripts son eliminados', () => {
  const input = '<style>b{}</style>ok';
  assert.equal(sanitizeNoteHtml(input), 'ok');
});

await test('RT-14', 'Conversión a texto plano funciona correctamente', () => {
  const input = '<b>Plan:</b><ul><li>Reposo</li><li>Paracetamol &amp; agua</li></ul>';
  assert.equal(noteHtmlToText(input), 'Plan:\n• Reposo\n• Paracetamol & agua');
});

await test('RT-15', 'Líneas vacías se manejan correctamente', () => {
  const input = '<div>A</div><div><br></div><div>B</div>';
  assert.equal(noteHtmlToText(input), 'A\n\nB');
});

await test('RT-16', 'Notas en blanco son detectadas', () => {
  assert.ok(isBlankNoteHtml(''));
  assert.ok(isBlankNoteHtml('<br>'));
  assert.ok(isBlankNoteHtml('<div><br></div>'));
  assert.ok(isBlankNoteHtml('<ul><li></li></ul>'));
  assert.ok(!isBlankNoteHtml('<b>x</b>'));
});

await test('RT-17', 'Contenido dentro de etiquetas prohibidas se elimina completamente', () => {
  const input = '<script><b>x</b></script>ok';
  assert.equal(sanitizeNoteHtml(input), 'ok');
});

console.log(process.exitCode ? `Texto enriquecido FALLARON (${n} aprobadas)` : `Texto enriquecido OK (${n} pruebas)`);
