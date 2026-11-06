import { seedDb, noteHash, verifyNote, findUser, CIE10 } from './data.js';
import { validateCurp, curpBirthDate, missingNoteFields } from './validators.js';
import { ROLES, can, noteStatusFor } from './rbac.js';
import { exportPdf } from './pdf.js';

// v2: usuarios con cédula y bitácora con cédula e IP (los datos v1 se vuelven a sembrar).
const DB_KEY = 'ianamed-db-v2', SESSION_KEY = 'ianamed-user';
const app = document.getElementById('app');

// ---------- Estado (mock persistido en localStorage) ----------
let db = null;
try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch { /* datos corruptos: se re-siembran */ }
if (!db?.patients) { db = await seedDb(); save(); }
function save() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

// IP pública del equipo cliente para la bitácora (RF-04). shortcut: sin backend se consulta un servicio externo;
// en producción la IP la toma el servidor de la petición HTTP y no puede falsearse desde el navegador.
let clientIp = 'N/D';
fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) })
  .then(r => r.json()).then(j => { clientIp = j.ip; }).catch(() => { /* sin red: queda N/D */ });

const currentUser = () => db.users.find(u => u.id === sessionStorage.getItem(SESSION_KEY));
/** Agrega un evento a la bitácora (solo inserción): quién, cédula, rol, IP, qué y cuándo. */
function audit(action, detail, user = currentUser()) {
  db.audit.unshift({ ts: new Date().toISOString(), user: user?.username ?? 'desconocido', cedula: user?.cedula ?? null, role: user?.role ?? '-', ip: clientIp, action, detail });
  save();
}

// ---------- Utilidades ----------
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fullName = p => `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno ?? ''}`.trim();
const initials = s => s.replace(/^(Dra?\.)\s*/, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const fmtDate = iso => new Date(iso.length === 10 ? iso + 'T00:00' : iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = iso => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
function age(dob) {
  const d = new Date(dob + 'T00:00'), n = new Date();
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
}
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${type === 'ok' ? I.check : I.alert}<span>${esc(msg)}</span>`;
  document.getElementById('toast').append(el);
  setTimeout(() => el.remove(), 3500);
}

const svg = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  userPlus: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
  log: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>'),
  shield: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  lock: svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  alert: svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
};

const STATUS_BADGE = {
  firmada: `<span class="badge ok">${I.check} Firmada</span>`,
  pendiente: `<span class="badge warn">${I.clock} Pendiente de validación</span>`,
  rechazada: `<span class="badge danger">${I.x} Rechazada</span>`,
};
const IMMUTABLE_MSG = 'Al firmar, la nota queda sellada con SHA-256 y no podrá modificarse ni eliminarse (NOM-004-SSA3-2012).';

// ---------- Router ----------
const routes = [
  [/^#\/pacientes$/, 'patients:read', viewPatients],
  [/^#\/pacientes\/nuevo$/, 'patients:create', viewPatientForm],
  [/^#\/expediente\/([\w-]+)$/, 'patients:read', viewRecord],
  [/^#\/expediente\/([\w-]+)\/editar$/, 'patients:update', viewPatientForm],
  [/^#\/bitacora$/, 'audit:read', viewAudit],
  [/^#\/usuarios$/, 'users:read', viewUsers],
];

function render({ quiet = false } = {}) {
  const user = currentUser();
  if (!user) return viewLogin();
  const home = can(user.role, 'patients:read') ? '#/pacientes' : '#/bitacora';
  const route = routes.find(([re]) => re.test(location.hash));
  if (!route) { location.hash = home; return; }
  const [re, perm, view] = route;
  if (!can(user.role, perm)) {
    audit('Acceso denegado', location.hash);
    return shell(user, `<div class="card locked"><div class="ico">${I.lock}</div><h2>Acceso restringido</h2><p class="muted">Tu rol (${esc(ROLES[user.role])}) no tiene permiso para esta sección.</p><a class="btn btn-primary" href="${home}">Volver al inicio</a></div>`);
  }
  view(user, location.hash.match(re)[1], quiet);
}
window.addEventListener('hashchange', () => render());

function shell(user, content) {
  const items = [
    ['#/pacientes', 'Pacientes', 'patients:read', I.users],
    ['#/pacientes/nuevo', 'Alta de paciente', 'patients:create', I.userPlus],
    ['#/bitacora', 'Bitácora de auditoría', 'audit:read', I.log],
    ['#/usuarios', 'Usuarios y roles', 'users:read', I.shield],
  ].filter(([, , perm]) => can(user.role, perm));
  const h = location.hash;
  const active = href => h === href || (href === '#/pacientes' && h.startsWith('#/expediente'));
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><img src="assets/logo.png" alt=""><div><b>IanaMed</b><small>Expediente clínico electrónico</small></div></div>
        <nav class="nav" aria-label="Principal">
          ${items.map(([href, label, , ico]) => `<a href="${href}" class="${active(href) ? 'active' : ''}" ${active(href) ? 'aria-current="page"' : ''}>${ico}${label}</a>`).join('')}
        </nav>
        <div class="me">
          <div class="avatar">${initials(user.name)}</div>
          <div class="who"><b>${esc(user.name)}</b><span class="badge lav">${esc(ROLES[user.role])}</span></div>
          <button class="icon-btn" id="logout" title="Cerrar sesión" aria-label="Cerrar sesión">${I.logout}</button>
        </div>
      </aside>
      <main class="main">${content}</main>
    </div>`;
  document.getElementById('logout').onclick = () => {
    audit('Cierre de sesión', '');
    sessionStorage.removeItem(SESSION_KEY);
    location.hash = '';
    render();
  };
  window.scrollTo(0, 0);
}

// ---------- Login ----------
function viewLogin() {
  app.innerHTML = `
    <div class="login">
      <section class="login-hero">
        <div class="brand-badge"><img src="assets/logo.png" alt="Logotipo IanaMed"></div>
        <div><h1>IanaMed</h1><p class="tag">Tu historial clínico, siempre disponible</p></div>
        <ul>
          <li>${I.shield}<span>Acceso por roles hospitalarios con principio de mínimo privilegio.</span></li>
          <li>${I.check}<span>Notas firmadas y selladas con SHA-256; las de internos requieren co-firma.</span></li>
          <li>${I.log}<span>Bitácora de auditoría de cada consulta, alta y validación.</span></li>
        </ul>
      </section>
      <section class="login-panel">
        <form class="login-card" id="loginForm" novalidate>
          <h2>Iniciar sesión</h2>
          <p class="sub">Acceso exclusivo para personal autorizado.</p>
          <div id="loginError"></div>
          <div class="form-grid" style="grid-template-columns:1fr">
            <label>Cédula profesional o usuario<input name="login" autocomplete="username" inputmode="text" placeholder="Ej. 10234567" required></label>
            <label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
            <button class="btn btn-primary btn-block" type="submit">Entrar</button>
          </div>
          <div class="demo-users">
            <h3>Usuarios de prueba · contraseña Iana2026!</h3>
            <div class="demo-grid">
              ${db.users.map(u => `<button type="button" class="demo-chip" data-user="${esc(u.username)}"><div class="avatar">${initials(u.name)}</div><div><b>${esc(u.name)}</b><small>${esc(ROLES[u.role])} · ${u.cedula ? `cédula ${esc(u.cedula)}` : esc(u.username)}</small></div></button>`).join('')}
            </div>
          </div>
          <button type="button" class="reset-link" id="reset">Restablecer datos de demostración</button>
        </form>
      </section>
    </div>`;
  const form = document.getElementById('loginForm');
  form.querySelectorAll('[data-user]').forEach(b => b.onclick = () => {
    const u = db.users.find(x => x.username === b.dataset.user);
    form.login.value = u.cedula ?? u.username;
    form.password.value = 'Iana2026!';
    form.requestSubmit();
  });
  document.getElementById('reset').onclick = () => {
    if (!confirm('¿Borrar pacientes y notas capturados y volver a los datos de demostración? La bitácora se conserva.')) return;
    // La bitácora es de solo inserción: sobrevive al restablecimiento y registra el evento.
    const keep = db.audit;
    seedDb().then(fresh => {
      db = fresh;
      db.audit = keep;
      audit('Restablecimiento de datos demo', 'Pacientes y notas', { username: 'anónimo', role: '-' });
      location.reload();
    });
  };
  form.onsubmit = e => {
    e.preventDefault();
    const login = form.login.value.trim();
    const user = findUser(db.users, login, form.password.value);
    if (!user) {
      audit('Inicio de sesión fallido', login, { username: login, role: '-' });
      document.getElementById('loginError').innerHTML = `<div class="error" role="alert">Usuario o contraseña incorrectos.</div>`;
      return;
    }
    sessionStorage.setItem(SESSION_KEY, user.id);
    audit('Inicio de sesión', '', user);
    location.hash = can(user.role, 'patients:read') ? '#/pacientes' : '#/bitacora';
    render();
  };
}

// ---------- Pacientes ----------
function viewPatients(user) {
  const clinical = can(user.role, 'clinical:read');
  const pending = db.patients.reduce((s, p) => s + p.notes.filter(n => n.status === 'pendiente').length, 0);
  const today = new Date().toDateString();
  const newToday = db.patients.filter(p => new Date(p.createdAt).toDateString() === today).length;
  shell(user, `
    <div class="page-head">
      <div><h1>Pacientes</h1><p>Hola, ${esc(user.name.split(' ').slice(0, 2).join(' '))}. Estos son los expedientes activos.</p></div>
      ${can(user.role, 'patients:create') ? `<a class="btn btn-primary" href="#/pacientes/nuevo">${I.userPlus} Alta de paciente</a>` : ''}
    </div>
    <div class="stats">
      <div class="card stat"><div class="ico">${I.users}</div><div><b>${db.patients.length}</b><span>Expedientes</span></div></div>
      <div class="card stat"><div class="ico blue">${I.plus}</div><div><b>${newToday}</b><span>Altas de hoy</span></div></div>
      ${clinical ? `<div class="card stat"><div class="ico warn">${I.clock}</div><div><b>${pending}</b><span>Notas por validar</span></div></div>` : ''}
    </div>
    <div class="card">
      <div class="page-head" style="margin-bottom:12px">
        <h2 style="margin:0">Expedientes <span class="count">${db.patients.length}</span></h2>
        <div class="search">${I.search}<input id="q" type="search" placeholder="Buscar por nombre, CURP o expediente" aria-label="Buscar paciente"></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Paciente</th><th>Expediente</th><th>Edad / Sexo</th><th>Derechohabiencia</th>${clinical ? '<th>Notas</th>' : ''}<th>Alta</th></tr></thead>
        <tbody id="rows"></tbody>
      </table></div>
    </div>`);
  const rows = document.getElementById('rows');
  const draw = q => {
    const list = db.patients
      .filter(p => `${fullName(p)} ${p.curp} ${p.expediente}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    rows.innerHTML = list.map(p => {
      const pend = p.notes.filter(n => n.status === 'pendiente').length;
      return `<tr class="clickable" data-id="${esc(p.id)}">
        <td><div class="person"><div class="avatar">${initials(fullName(p))}</div><div><a href="#/expediente/${esc(p.id)}">${esc(fullName(p))}</a><small class="mono">${esc(p.curp)}</small></div></div></td>
        <td><span class="badge blue">${esc(p.expediente)}</span></td>
        <td>${age(p.fechaNacimiento)} años · ${esc(p.sexo)}</td>
        <td>${esc(p.aseguradora)}</td>
        ${clinical ? `<td>${p.notes.length} ${pend ? `<span class="badge warn">${pend} por validar</span>` : ''}</td>` : ''}
        <td class="muted">${fmtDate(p.createdAt)}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" class="empty">No se encontraron pacientes.</td></tr>`;
  };
  draw('');
  document.getElementById('q').oninput = e => draw(e.target.value);
  rows.onclick = e => { const tr = e.target.closest('tr[data-id]'); if (tr) location.hash = `#/expediente/${tr.dataset.id}`; };
}

// Sin id: alta. Con id: edición de datos demográficos del expediente existente.
function viewPatientForm(user, id) {
  const p = id && db.patients.find(x => x.id === id);
  if (id && !p) return shell(user, `<div class="card empty">Expediente no encontrado. <a href="#/pacientes">Volver</a></div>`);
  const back = p ? `#/expediente/${p.id}` : '#/pacientes';
  shell(user, `
    <div class="page-head">
      <div>${p
        ? `<h1>Editar datos del paciente</h1><p>${esc(fullName(p))} · ${esc(p.expediente)}. Solo datos demográficos y de contacto.</p>`
        : '<h1>Alta de paciente</h1><p>Se abrirá un nuevo expediente administrativo con número consecutivo.</p>'}</div>
      <a class="btn btn-ghost" href="${back}">${I.back} Volver</a>
    </div>
    <form class="card" id="patientForm">
      <div id="formError"></div>
      <fieldset>
        <legend><span class="step">1</span> Datos personales</legend>
        <div class="form-grid">
          <label>Nombre(s)<input name="nombre" required maxlength="60"></label>
          <label>Apellido paterno<input name="apellidoPaterno" required maxlength="40"></label>
          <label>Apellido materno <span class="opt">(opcional)</span><input name="apellidoMaterno" maxlength="40"></label>
          <label>Fecha de nacimiento<input name="fechaNacimiento" type="date" required min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}"></label>
          <label>Sexo<select name="sexo" required><option value="">Selecciona…</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>
          <label>CURP<input name="curp" required pattern="[A-Za-z]{4}[0-9]{6}[HMhm][A-Za-z]{5}[A-Za-z0-9][0-9]" maxlength="18" placeholder="18 caracteres" style="text-transform:uppercase" autocomplete="off"></label>
        </div>
      </fieldset>
      <fieldset>
        <legend><span class="step">2</span> Contacto</legend>
        <div class="form-grid">
          <label>Teléfono<input name="telefono" type="tel" required pattern="[0-9]{10}" maxlength="10" placeholder="10 dígitos"></label>
          <label>Correo electrónico <span class="opt">(opcional)</span><input name="email" type="email" maxlength="80"></label>
          <label>Derechohabiencia<select name="aseguradora" required><option value="">Selecciona…</option><option>IMSS</option><option>ISSSTE</option><option>IMSS-Bienestar</option><option>Seguro privado</option><option>Particular</option></select></label>
          <label class="full">Domicilio<input name="domicilio" required maxlength="160" placeholder="Calle, número, colonia, municipio, estado"></label>
        </div>
      </fieldset>
      <fieldset>
        <legend><span class="step">3</span> Contacto de emergencia</legend>
        <div class="form-grid">
          <label>Nombre y parentesco<input name="contactoNombre" required maxlength="80" placeholder="Ej. Elena Vega (madre)"></label>
          <label>Teléfono<input name="contactoTelefono" type="tel" required pattern="[0-9]{10}" maxlength="10" placeholder="10 dígitos"></label>
        </div>
      </fieldset>
      <div class="form-actions">
        <a class="btn btn-ghost" href="${back}">Cancelar</a>
        <button class="btn btn-primary" type="submit">${I.check} ${p ? 'Guardar cambios' : 'Registrar y abrir expediente'}</button>
      </div>
    </form>`);
  const form = document.getElementById('patientForm');
  if (p) for (const el of form.elements) if (el.name && p[el.name] != null) el.value = p[el.name];
  // Sugerir la fecha de nacimiento a partir de una CURP válida.
  form.curp.addEventListener('change', () => {
    if (validateCurp(form.curp.value).ok && !form.fechaNacimiento.value) form.fechaNacimiento.value = curpBirthDate(form.curp.value);
  });
  form.onsubmit = e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const f = Object.fromEntries(new FormData(form));
    for (const k in f) f[k] = f[k].trim();
    f.curp = f.curp.toUpperCase();
    const curpCheck = validateCurp(f.curp);
    const formError = msg => { document.getElementById('formError').innerHTML = `<div class="error" role="alert">${esc(msg)}</div>`; };
    if (!curpCheck.ok) { formError(curpCheck.error); form.curp.focus(); return; }
    if (curpBirthDate(f.curp) !== f.fechaNacimiento) {
      formError(`La fecha de nacimiento no coincide con la CURP (${fmtDate(curpBirthDate(f.curp))}).`);
      form.fechaNacimiento.focus();
      return;
    }
    if (db.patients.some(x => x.curp === f.curp && x !== p)) {
      document.getElementById('formError').innerHTML = `<div class="error" role="alert">Ya existe un expediente con la CURP ${esc(f.curp)}.</div>`;
      form.curp.focus();
      return;
    }
    if (p) {
      Object.assign(p, f, { updatedAt: new Date().toISOString(), updatedBy: user.name });
      audit('Actualización de datos demográficos', p.expediente);
      toast('Datos del paciente actualizados');
      location.hash = back;
      return;
    }
    db.seq += 1;
    const created = {
      id: crypto.randomUUID(), expediente: `EXP-${new Date().getFullYear()}-${String(db.seq).padStart(4, '0')}`,
      ...f, createdAt: new Date().toISOString(), createdBy: user.name, antecedentes: {}, notes: [],
    };
    db.patients.push(created);
    audit('Alta de paciente', created.expediente);
    toast(`Expediente ${created.expediente} creado`);
    location.hash = `#/expediente/${created.id}`;
  };
}

// ---------- Expediente ----------
function viewRecord(user, id, quiet) {
  const p = db.patients.find(x => x.id === id);
  if (!p) return shell(user, `<div class="card empty">Expediente no encontrado. <a href="#/pacientes">Volver</a></div>`);
  if (!quiet) audit('Consulta de expediente', p.expediente);
  const r = user.role;
  const clinical = can(r, 'clinical:read');
  const pdfPerm = can(r, 'pdf:clinical') || can(r, 'pdf:demographic');
  const a = p.antecedentes ?? {};
  const notes = [...p.notes].sort((x, y) => y.fecha.localeCompare(x.fecha));

  const ficha = `
    <div class="card"><h2>Ficha de identificación</h2>
      <dl class="kv">
        <div><dt>CURP</dt><dd class="mono">${esc(p.curp)}</dd></div>
        <div><dt>Fecha de nacimiento</dt><dd>${fmtDate(p.fechaNacimiento)} · ${age(p.fechaNacimiento)} años</dd></div>
        <div><dt>Teléfono</dt><dd>${esc(p.telefono)}</dd></div>
        <div><dt>Correo</dt><dd>${esc(p.email) || '<span class="muted">-</span>'}</dd></div>
        <div><dt>Domicilio</dt><dd>${esc(p.domicilio)}</dd></div>
        <div><dt>Derechohabiencia</dt><dd>${esc(p.aseguradora)}</dd></div>
        <div><dt>Contacto de emergencia</dt><dd>${esc(p.contactoNombre)}<br><span class="muted">${esc(p.contactoTelefono)}</span></dd></div>
        <div><dt>Alta administrativa</dt><dd>${fmtDateTime(p.createdAt)}<br><span class="muted">por ${esc(p.createdBy)}</span></dd></div>
        ${p.updatedAt ? `<div><dt>Última actualización</dt><dd>${fmtDateTime(p.updatedAt)}<br><span class="muted">por ${esc(p.updatedBy)}</span></dd></div>` : ''}
      </dl>
    </div>`;

  const AF = [['tipoSangre', 'Tipo de sangre'], ['alergias', 'Alergias'], ['cronicos', 'Enfermedades crónicas'], ['quirurgicos', 'Antecedentes quirúrgicos'], ['heredofamiliares', 'Heredofamiliares'], ['medicamentos', 'Medicamentos actuales']];
  const antecedentes = can(r, 'history:write')
    ? `<form class="card" id="histForm"><h2>Antecedentes</h2>
        <div class="form-grid" style="grid-template-columns:1fr">
          <label>Tipo de sangre<select name="tipoSangre"><option value="">Sin registrar</option>${['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(t => `<option ${a.tipoSangre === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          ${AF.slice(1).map(([k, l]) => `<label>${l}<textarea name="${k}" rows="2" maxlength="500">${esc(a[k])}</textarea></label>`).join('')}
          <button class="btn btn-lav" type="submit">Guardar antecedentes</button>
        </div></form>`
    : `<div class="card"><h2>Antecedentes</h2><dl class="kv">${AF.map(([k, l]) => `<div><dt>${l}</dt><dd>${esc(a[k]) || '<span class="muted">Sin registrar</span>'}</dd></div>`).join('')}</dl></div>`;

  const v = n => n.vitals ?? {};
  const noteCard = n => `
    <article class="note ${n.status}">
      <div class="note-head">
        <div><b>${esc(n.tipo)}</b><small>${fmtDateTime(n.fecha)} · ${esc(n.autor)} (${esc(ROLES[n.autorRol])}${n.autorCedula ? ` · Céd. ${esc(n.autorCedula)}` : ''})</small></div>
        <div class="badges" data-integrity="${n.id}">${STATUS_BADGE[n.status]}</div>
      </div>
      <div class="chips">
        ${[['TA', v(n).ta, 'mmHg'], ['FC', v(n).fc, 'lpm'], ['FR', v(n).fr, 'rpm'], ['Temp', v(n).temp, '°C'], ['SpO₂', v(n).sat, '%'], ['Peso', v(n).peso, 'kg'], ['Talla', v(n).talla, 'cm']]
          .filter(([, val]) => val).map(([k, val, u]) => `<span>${k} ${esc(val)} ${u}</span>`).join('')}
      </div>
      <p><strong>Padecimiento / subjetivo:</strong> ${esc(n.subjetivo)}</p>
      ${n.exploracion ? `<p><strong>Exploración física:</strong> ${esc(n.exploracion)}</p>` : ''}
      ${n.dx ? `<p><strong>Diagnóstico:</strong> ${esc(n.dx)}</p>` : ''}
      ${n.plan ? `<p><strong>Plan:</strong> ${esc(n.plan)}</p>` : ''}
      ${n.rechazo ? `<p><strong>Motivo de rechazo:</strong> ${esc(n.rechazo.motivo)} <span class="muted">(${esc(n.rechazo.by)})</span></p>` : ''}
      <div class="note-foot">
        <span>${n.hash ? `${I.shield} SHA-256 <span class="mono" title="${n.hash}">${n.hash.slice(0, 16)}…</span>${n.cofirma ? ` · Co-firmada por ${esc(n.cofirma.by)}${n.cofirma.cedula ? ` (Céd. ${esc(n.cofirma.cedula)})` : ''}` : ''}` : n.status === 'pendiente' ? 'Sin validez legal hasta su co-firma' : ''}</span>
        ${n.status === 'pendiente' && can(r, 'notes:approve') ? `<div class="actions">
          ${can(r, 'notes:reject') ? `<button class="btn btn-danger btn-sm" data-act="reject" data-note="${n.id}">${I.x} Rechazar</button>` : ''}
          <button class="btn btn-ok btn-sm" data-act="approve" data-note="${n.id}">${I.check} Validar y co-firmar</button></div>` : ''}
      </div>
    </article>`;

  const dxWrite = can(r, 'diagnosis:write');
  const newNote = can(r, 'clinical:write') ? `
    <details class="card new-note" ${p.notes.length ? '' : 'open'}>
      <summary class="btn btn-primary">${I.plus} Nueva nota clínica</summary>
      <form id="noteForm">
        ${dxWrite ? '' : `<p class="hint">${I.alert} Como ${esc(ROLES[r])}, tu nota quedará <b>pendiente de validación</b> hasta que un Médico Adscrito o Residente la co-firme.</p>`}
        <div class="form-grid">
          <label>Tipo de nota<select name="tipo" required>${(p.notes.length ? ['Nota de evolución', 'Historia clínica'] : ['Historia clínica', 'Nota de evolución']).concat(['Nota de ingreso', 'Nota de urgencias']).map(t => `<option>${t}</option>`).join('')}</select></label>
        </div>
        <fieldset style="margin:18px 0 0"><legend style="font-size:15px">Signos vitales</legend>
          <div class="vitals">
            <label>TA (mmHg)<input name="ta" placeholder="120/80" pattern="[0-9]{2,3}/[0-9]{2,3}" required></label>
            <label>FC (lpm)<input name="fc" type="number" min="20" max="250" required></label>
            <label>FR (rpm)<input name="fr" type="number" min="5" max="80" required></label>
            <label>Temp (°C)<input name="temp" type="number" step="0.1" min="30" max="45" required></label>
            <label>SpO₂ (%)<input name="sat" type="number" min="50" max="100"></label>
            <label>Peso (kg)<input name="peso" type="number" step="0.1" min="0.5" max="350"></label>
            <label>Talla (cm)<input name="talla" type="number" min="30" max="250"></label>
          </div>
        </fieldset>
        <div class="form-grid" style="grid-template-columns:1fr;margin-top:16px">
          <label>Padecimiento actual / subjetivo<textarea name="subjetivo" required maxlength="2000"></textarea></label>
          <label>Exploración física<textarea name="exploracion" maxlength="2000" required></textarea></label>
          ${dxWrite ? `
          <label>Diagnóstico (CIE-10)<input name="dx" list="cie10" maxlength="200" placeholder="Escribe código o descripción" required></label>
          <datalist id="cie10">${CIE10.map(([c, d]) => `<option value="${c} ${d}">`).join('')}</datalist>
          <label>Plan terapéutico<textarea name="plan" maxlength="2000" required></textarea></label>` : ''}
        </div>
        <div id="noteError"></div>
        ${dxWrite ? `<p class="hint">${I.lock} ${IMMUTABLE_MSG}</p>` : ''}
        <div class="form-actions" style="margin-top:18px">
          <button class="btn btn-primary" type="submit">${I.check} ${dxWrite ? 'Firmar y guardar nota' : 'Guardar como borrador para validación'}</button>
        </div>
      </form>
    </details>` : '';

  const clinicalBlock = clinical
    ? `${newNote}
       <div class="card"><h2>Notas clínicas <span class="count">${p.notes.length}</span></h2>
         <div class="notes">${notes.map(noteCard).join('') || '<p class="empty">Aún no hay notas clínicas en este expediente.</p>'}</div>
       </div>`
    : `<div class="card locked"><div class="ico">${I.lock}</div><h2>Información clínica protegida</h2>
         <p class="muted">Tu rol (${esc(ROLES[r])}) solo puede gestionar datos demográficos y de contacto.<br>Antecedentes, diagnósticos y notas clínicas están bloqueados.</p></div>`;

  shell(user, `
    <a class="btn btn-ghost btn-sm" href="#/pacientes" style="margin-bottom:16px">${I.back} Pacientes</a>
    <div class="card record-head">
      <div class="avatar lg">${initials(fullName(p))}</div>
      <div class="info">
        <h1>${esc(fullName(p))}</h1>
        <div class="meta">
          <span class="badge blue">${esc(p.expediente)}</span>
          <span class="badge lav">${age(p.fechaNacimiento)} años · ${esc(p.sexo)}</span>
          ${clinical && a.tipoSangre ? `<span class="badge danger">${I.heart} ${esc(a.tipoSangre)}</span>` : ''}
          ${clinical && a.alergias && !/^negad/i.test(a.alergias) ? `<span class="badge warn">${I.alert} Alergias: ${esc(a.alergias)}</span>` : ''}
        </div>
      </div>
      <div class="actions">
        ${can(r, 'patients:update') ? `<a class="btn btn-ghost" href="#/expediente/${esc(p.id)}/editar">Editar datos</a>` : ''}
        ${pdfPerm ? `<button class="btn btn-lav" id="pdfBtn">${I.download} ${clinical ? 'Descargar expediente PDF' : 'Descargar ficha PDF'}</button>` : ''}
      </div>
    </div>
    <div class="record-grid">
      <div>${ficha}${clinical ? antecedentes : ''}</div>
      <div>${clinicalBlock}</div>
    </div>`);

  // Verifica el sello de cada nota firmada; si el contenido cambió fuera del sistema, lo marca y lo registra.
  if (clinical) for (const n of p.notes) verifyNote(p.id, n).then(ok => {
    if (ok) return;
    document.querySelector(`[data-integrity="${n.id}"]`)?.insertAdjacentHTML('afterbegin', `<span class="badge danger">${I.alert} Integridad comprometida</span>`);
    if (!quiet) audit('Alerta de integridad', `${p.expediente} · ${n.tipo} · sello SHA-256 no coincide`);
  });

  document.getElementById('pdfBtn')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await exportPdf(p, user, { clinical: can(r, 'pdf:clinical') });
      audit('Exportación PDF', p.expediente);
      toast('PDF generado');
    } catch (err) {
      console.error(err);
      toast('No se pudo generar el PDF. Revisa tu conexión (jsPDF se carga desde CDN).', 'err');
    } finally { btn.disabled = false; }
  });

  const histForm = document.getElementById('histForm');
  if (histForm) histForm.onsubmit = e => {
    e.preventDefault();
    p.antecedentes = Object.fromEntries([...new FormData(histForm)].map(([k, val]) => [k, val.trim()]));
    audit('Actualización de antecedentes', p.expediente);
    toast('Antecedentes guardados');
    render({ quiet: true });
  };

  const noteForm = document.getElementById('noteForm');
  if (noteForm) noteForm.onsubmit = async e => {
    e.preventDefault();
    if (!noteForm.reportValidity()) return;
    const f = Object.fromEntries([...new FormData(noteForm)].map(([k, val]) => [k, val.trim()]));
    const note = {
      id: crypto.randomUUID(), tipo: f.tipo, fecha: new Date().toISOString(), autorId: user.id, autor: user.name, autorRol: r, autorCedula: user.cedula ?? null,
      vitals: { ta: f.ta, fc: f.fc, fr: f.fr, temp: f.temp, sat: f.sat, peso: f.peso, talla: f.talla },
      subjetivo: f.subjetivo, exploracion: f.exploracion,
      dx: dxWrite ? f.dx ?? '' : '', plan: dxWrite ? f.plan ?? '' : '',
      status: noteStatusFor(r),
    };
    const missing = missingNoteFields(note, { requireDiagnosis: dxWrite });
    if (missing.length) {
      document.getElementById('noteError').innerHTML = `<div class="error" role="alert">Faltan campos obligatorios (NOM-004): ${missing.map(esc).join(', ')}.</div>`;
      return;
    }
    if (note.status === 'firmada' && !confirm(`${IMMUTABLE_MSG}\n\n¿Firmar y guardar la nota?`)) return;
    if (note.status === 'firmada') note.hash = await noteHash(p.id, note);
    p.notes.push(note);
    audit(note.status === 'firmada' ? 'Nota firmada' : 'Nota borrador (pendiente)', `${p.expediente} · ${note.tipo}`);
    toast(note.status === 'firmada' ? 'Nota firmada y sellada' : 'Nota enviada a validación');
    render({ quiet: true });
  };

  app.querySelector('.notes')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const n = p.notes.find(x => x.id === btn.dataset.note);
    if (!n || n.status !== 'pendiente') return;
    if (btn.dataset.act === 'approve' && can(r, 'notes:approve')) {
      if (!confirm(`${IMMUTABLE_MSG}\n\n¿Validar y co-firmar la nota?`)) return;
      n.status = 'firmada';
      n.cofirma = { by: user.name, cedula: user.cedula ?? null, at: new Date().toISOString() };
      n.hash = await noteHash(p.id, n);
      audit('Co-firma de nota', `${p.expediente} · ${n.tipo}`);
      toast('Nota validada y co-firmada');
    } else if (btn.dataset.act === 'reject' && can(r, 'notes:reject')) {
      const motivo = prompt('Motivo del rechazo:')?.trim();
      if (!motivo) return;
      n.status = 'rechazada';
      n.rechazo = { by: user.name, at: new Date().toISOString(), motivo };
      audit('Rechazo de nota', `${p.expediente} · ${n.tipo}`);
      toast('Nota rechazada');
    } else return;
    save();
    render({ quiet: true });
  });
}

// ---------- Administración ----------
function viewAudit(user) {
  shell(user, `
    <div class="page-head"><div><h1>Bitácora de auditoría</h1><p>Trazabilidad de accesos y operaciones (NOM-024): usuario, cédula, IP, fecha y hora. Solo inserción, sin contenido clínico.</p></div></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Cédula</th><th>Rol</th><th>IP</th><th>Acción</th><th>Referencia</th></tr></thead>
      <tbody>${db.audit.map(e => `<tr><td class="muted nowrap">${fmtDateTime(e.ts)}</td><td class="mono">${esc(e.user)}</td><td class="mono">${esc(e.cedula) || '<span class="muted">-</span>'}</td><td>${esc(ROLES[e.role] ?? e.role)}</td>
        <td class="mono nowrap">${esc(e.ip ?? 'N/D')}</td><td><span class="badge ${/fallido|denegado|Rechazo|integridad|Restablecimiento/.test(e.action) ? 'danger' : 'lav'}">${esc(e.action)}</span></td><td class="mono">${esc(e.detail)}</td></tr>`).join('')}</tbody>
    </table></div></div>`);
}

function viewUsers(user) {
  shell(user, `
    <div class="page-head"><div><h1>Usuarios y roles</h1><p>Cuentas del personal autorizado (datos de demostración).</p></div></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Usuario</th><th>Cuenta</th><th>Cédula profesional</th><th>Rol</th><th>Área</th><th>Estado</th></tr></thead>
      <tbody>${db.users.map(u => `<tr><td><div class="person"><div class="avatar">${initials(u.name)}</div><b>${esc(u.name)}</b></div></td>
        <td class="mono">${esc(u.username)}</td><td class="mono">${esc(u.cedula) || '<span class="muted">No aplica</span>'}</td><td><span class="badge lav">${esc(ROLES[u.role])}</span></td><td>${esc(u.area)}</td><td><span class="badge ok">Activo</span></td></tr>`).join('')}</tbody>
    </table></div></div>`);
}

render();
