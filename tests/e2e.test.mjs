// Pruebas de sistema (E2E) derivadas de los casos de uso del incremento 1.
// Requisitos: `npm i -D playwright && npx playwright install chromium` y la app servida en BASE.
// Uso: BASE=http://localhost:5173/ node tests/e2e.test.mjs
// Opcional: LOCAL_CDN=<carpeta node_modules con jspdf y jspdf-autotable> para correr sin internet.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5173/';
const PASS = 'Iana2026!';
const results = [];
const browser = await chromium.launch();

async function newPage() {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1366, height: 900 } });
  // IP fija para que la prueba de bitácora sea determinista.
  await ctx.route(/api\.ipify\.org/, r => r.fulfill({ body: '{"ip":"203.0.113.10"}', contentType: 'application/json' }));
  if (process.env.LOCAL_CDN) {
    const lib = { jspdf: 'jspdf/dist/jspdf.umd.min.js', autotable: 'jspdf-autotable/dist/jspdf.plugin.autotable.min.js' };
    await ctx.route(/jspdf\.umd/, r => r.fulfill({ body: fs.readFileSync(`${process.env.LOCAL_CDN}/${lib.jspdf}`), contentType: 'text/javascript' }));
    await ctx.route(/autotable/, r => r.fulfill({ body: fs.readFileSync(`${process.env.LOCAL_CDN}/${lib.autotable}`), contentType: 'text/javascript' }));
    await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  }
  const page = await ctx.newPage();
  page.dialogs = [];
  page.answer = true;
  page.on('dialog', d => { page.dialogs.push(d.message()); return page.answer ? d.accept(d.type() === 'prompt' ? 'Motivo de prueba' : undefined) : d.dismiss(); });
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(BASE);
  await page.waitForSelector('#loginForm');
  return page;
}
async function login(page, who, pass = PASS) {
  await page.fill('[name=login]', who);
  await page.fill('[name=password]', pass);
  await page.click('#loginForm button[type=submit]');
}
const auditLog = page => page.evaluate(() => JSON.parse(localStorage.getItem('ianamed-db-v2')).audit);
async function fillNote(page, { dx = true } = {}) {
  await page.fill('[name=ta]', '130/85'); await page.fill('[name=fc]', '80'); await page.fill('[name=fr]', '18'); await page.fill('[name=temp]', '36.7');
  await page.fill('[name=subjetivo]', 'Cefalea frontal de 2 días.');
  await page.fill('[name=exploracion]', 'Neurológico sin focalización.');
  if (dx) { await page.fill('[name=dx]', 'I10 Hipertensión esencial (primaria)'); await page.fill('[name=plan]', 'Ajustar losartán a 100 mg.'); }
}
async function newPatient(page, curp, fecha) {
  await page.goto(BASE + '#/pacientes/nuevo');
  await page.waitForSelector('#patientForm');
  await page.fill('[name=nombre]', 'Alan'); await page.fill('[name=apellidoPaterno]', 'Gómez'); await page.fill('[name=apellidoMaterno]', 'Pérez');
  await page.fill('[name=curp]', curp);
  await page.fill('[name=fechaNacimiento]', fecha);
  await page.selectOption('[name=sexo]', 'Masculino'); await page.fill('[name=telefono]', '4491234567');
  await page.selectOption('[name=aseguradora]', 'IMSS-Bienestar'); await page.fill('[name=domicilio]', 'Av. Convención 100, Aguascalientes, Ags.');
  await page.fill('[name=contactoNombre]', 'Rosa Pérez (madre)'); await page.fill('[name=contactoTelefono]', '4497654321');
  await page.click('#patientForm button[type=submit]');
  await page.waitForTimeout(250);
}

async function tc(id, cu, name, fn) {
  const page = await newPage();
  const t0 = Date.now();
  try {
    await fn(page);
    assert.deepEqual(page.errors, [], 'errores de JavaScript en la página');
    results.push({ id, cu, name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✔ ${id} [${cu}] ${name}`);
  } catch (e) {
    results.push({ id, cu, name, ok: false, error: e.message.split('\n')[0] });
    console.log(`  ✘ ${id} [${cu}] ${name}\n      ${e.message.split('\n')[0]}`);
  } finally { await page.context().close(); }
}

// ---------- CU-01 Autenticación ----------
await tc('CP-01', 'CU-01', 'Login con cédula profesional válida abre Pacientes y se audita con cédula e IP', async page => {
  await login(page, '10234567');
  await page.waitForSelector('h1:text("Pacientes")');
  const [e] = await auditLog(page);
  assert.equal(e.action, 'Inicio de sesión'); assert.equal(e.cedula, '10234567'); assert.equal(e.ip, '203.0.113.10');
});
await tc('CP-02', 'CU-01', 'Contraseña incorrecta muestra error y registra intento fallido', async page => {
  await login(page, '10234567', 'incorrecta');
  assert.match(await page.textContent('#loginError'), /incorrectos/);
  assert.equal((await auditLog(page))[0].action, 'Inicio de sesión fallido');
});
await tc('CP-03', 'CU-01', 'Recepción entra por usuario y no ve información clínica', async page => {
  await login(page, 'recepcion');
  await page.click('text=María Guadalupe Hernández Soto');
  await page.waitForSelector('text=Información clínica protegida');
  assert.equal(await page.locator('article.note').count(), 0);
  assert.equal(await page.locator('a:text("Bitácora de auditoría")').count(), 0);
});
await tc('CP-04', 'CU-01', 'Admin TI no accede a pacientes; el intento queda auditado', async page => {
  await login(page, 'admin');
  await page.waitForSelector('h1:text("Bitácora de auditoría")');
  await page.goto(BASE + '#/pacientes');
  await page.waitForSelector('text=Acceso restringido');
  assert.equal((await auditLog(page))[0].action, 'Acceso denegado');
});

// ---------- CU-02 Consulta por CURP ----------
await tc('CP-05', 'CU-02', 'Búsqueda por CURP en minúsculas encuentra 1 expediente; se abre en ≤ 3 clics y se audita', async page => {
  await login(page, '11345678');
  await page.fill('#q', 'raoj851102hdfmrs04');
  assert.equal(await page.locator('#rows tr[data-id]').count(), 1);
  await page.click('#rows tr[data-id]'); // clic 1 desde la pantalla principal
  await page.waitForSelector('h1:text("José Luis Ramírez Ortega")');
  await page.click('summary:text("Nueva nota clínica")'); // clic 2: formulario de nota abierto
  assert.ok(await page.isVisible('#noteForm'));
  const e = (await auditLog(page)).find(x => x.action === 'Consulta de expediente');
  assert.equal(e.detail, 'EXP-2026-0002'); assert.equal(e.cedula, '11345678');
});
await tc('CP-06', 'CU-02', 'CURP inexistente muestra "No se encontraron pacientes"', async page => {
  await login(page, '10234567');
  await page.fill('#q', 'XAXX010101HASXXX09');
  assert.match(await page.textContent('#rows'), /No se encontraron/);
});
await tc('CP-07', 'CU-02', 'Ficha e historial se despliegan en ≤ 1.5 s (medido en entorno local)', async page => {
  await login(page, '10234567');
  await page.waitForSelector('#rows tr[data-id]');
  const t0 = Date.now();
  await page.click('text=María Guadalupe Hernández Soto');
  await page.waitForSelector('article.note');
  const ms = Date.now() - t0;
  console.log(`      tiempo de despliegue: ${ms} ms`);
  assert.ok(ms <= 1500, `${ms} ms`);
});
await tc('CP-08', 'CU-02', 'Alta de paciente con CURP válida genera expediente consecutivo y se audita', async page => {
  await login(page, 'recepcion');
  await newPatient(page, 'GOPA050812HASMRLA3', '2005-08-12');
  await page.waitForSelector('h1:text("Alan Gómez Pérez")');
  assert.match(await page.textContent('.record-head'), /EXP-2026-0004/);
  assert.equal((await auditLog(page)).find(x => x.action === 'Alta de paciente').detail, 'EXP-2026-0004');
});
await tc('CP-09', 'CU-02', 'Alta con CURP de fecha inexistente se rechaza', async page => {
  await login(page, 'recepcion');
  await newPatient(page, 'GOPA051332HASMRLA3', '2005-08-12');
  assert.match(await page.textContent('#formError'), /no existe/);
});
await tc('CP-10', 'CU-02', 'Alta con CURP ya registrada se rechaza', async page => {
  await login(page, 'recepcion');
  await newPatient(page, 'HESM680314MDFRTR09', '1968-03-14');
  assert.match(await page.textContent('#formError'), /Ya existe/);
});
await tc('CP-11', 'CU-02', 'Fecha de nacimiento distinta a la de la CURP se rechaza', async page => {
  await login(page, 'recepcion');
  await newPatient(page, 'GOPA050812HASMRLA3', '2005-08-13');
  assert.match(await page.textContent('#formError'), /no coincide/);
});

// ---------- CU-03 Registro de nota ----------
await tc('CP-12', 'CU-03', 'Nota de médico sin diagnóstico ni plan no se guarda', async page => {
  await login(page, '10234567');
  await page.click('text=Ana Sofía Castillo Vega');
  await fillNote(page, { dx: false });
  await page.click('#noteForm button[type=submit]');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('article.note').count(), 0);
  assert.equal(await page.$eval('[name=dx]', el => el.validity.valueMissing), true);
});
await tc('CP-13', 'CU-03', 'Nota completa: advierte inmutabilidad, se firma con SHA-256 y no ofrece editar/eliminar', async page => {
  await login(page, '10234567');
  await page.click('text=Ana Sofía Castillo Vega');
  await fillNote(page);
  await page.click('#noteForm button[type=submit]');
  await page.waitForSelector('article.note.firmada');
  assert.match(page.dialogs[0], /no podrá modificarse ni eliminarse/);
  assert.match(await page.textContent('article.note'), /SHA-256/);
  assert.match(await page.textContent('article.note'), /Céd\. 10234567/);
  assert.equal(await page.locator('article.note button').count(), 0);
});
await tc('CP-14', 'CU-03', 'Si el médico cancela la advertencia, la nota no se guarda', async page => {
  await login(page, '10234567');
  await page.click('text=Ana Sofía Castillo Vega');
  await fillNote(page);
  page.answer = false;
  await page.click('#noteForm button[type=submit]');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('article.note').count(), 0);
});
await tc('CP-15', 'CU-03', 'Nota de MIP queda pendiente y no pide diagnóstico ni plan', async page => {
  await login(page, 'mip.torres');
  await page.click('text=Ana Sofía Castillo Vega');
  assert.equal(await page.locator('[name=dx]').count(), 0);
  await fillNote(page, { dx: false });
  await page.click('#noteForm button[type=submit]');
  await page.waitForSelector('article.note.pendiente');
  assert.match(await page.textContent('article.note'), /Sin validez legal/);
});
await tc('CP-16', 'CU-03', 'Adscrita co-firma la nota pendiente; queda sellada con su cédula', async page => {
  await login(page, '10234567');
  await page.click('text=María Guadalupe Hernández Soto');
  await page.click('button[data-act=approve]');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('article.note.pendiente').count(), 0);
  assert.match(await page.textContent('.notes'), /Co-firmada por Dra\. Laura Mendoza \(Céd\. 10234567\)/);
});
await tc('CP-17', 'CU-03', 'Residente puede co-firmar pero no rechazar', async page => {
  await login(page, '11345678');
  await page.click('text=María Guadalupe Hernández Soto');
  assert.equal(await page.locator('button[data-act=approve]').count(), 1);
  assert.equal(await page.locator('button[data-act=reject]').count(), 0);
});
await tc('CP-18', 'CU-03', 'Alterar una nota firmada fuera del sistema se detecta y se audita', async page => {
  await login(page, '10234567');
  await page.waitForSelector('#rows');
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ianamed-db-v2'));
    db.patients[0].notes[0].plan = 'ALTERADO';
    localStorage.setItem('ianamed-db-v2', JSON.stringify(db));
  });
  await page.reload();
  await page.click('text=María Guadalupe Hernández Soto');
  await page.waitForSelector('text=Integridad comprometida');
  await page.waitForTimeout(200);
  assert.ok((await auditLog(page)).some(x => x.action === 'Alerta de integridad'));
});

// ---------- CU-05 Bitácora ----------
await tc('CP-19', 'CU-05', 'Bitácora muestra cédula e IP; restablecer datos conserva la bitácora', async page => {
  await login(page, '10234567');
  await page.click('#logout');
  await page.click('#reset');
  await page.waitForSelector('#loginForm');
  await login(page, 'admin');
  await page.waitForSelector('table');
  const head = await page.textContent('thead');
  assert.ok(head.includes('Cédula') && head.includes('IP'));
  const body = await page.textContent('tbody');
  for (const s of ['Restablecimiento de datos demo', 'Cierre de sesión', '10234567', '203.0.113.10']) assert.ok(body.includes(s), s);
});

// ---------- Apoyo: exportación PDF ----------
await tc('CP-20', 'CU-04*', 'Exportar expediente a PDF descarga un PDF válido', async page => {
  await login(page, '10234567');
  await page.click('text=María Guadalupe Hernández Soto');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#pdfBtn')]);
  const file = await dl.path();
  assert.equal(fs.readFileSync(file).subarray(0, 5).toString(), '%PDF-');
  assert.ok((await auditLog(page)).some(x => x.action === 'Exportación PDF'));
});
await tc('CP-21', 'RNF-02', 'Vista móvil (390 px) sin desplazamiento horizontal', async page => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, '10234567');
  await page.click('text=María Guadalupe Hernández Soto');
  await page.waitForSelector('article.note');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390);
});

await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\nE2E: ${results.length - failed}/${results.length} casos aprobados`);
if (process.env.E2E_JSON) fs.writeFileSync(process.env.E2E_JSON, JSON.stringify(results, null, 2));
process.exit(failed ? 1 : 0);
