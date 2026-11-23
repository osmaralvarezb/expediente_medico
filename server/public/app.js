// Cliente mínimo del Incremento 1: todo lo valida el servidor; aquí solo se muestran las respuestas.
const $ = id => document.getElementById(id);
const PUEDE = {
  pacientes: ['adscrito', 'residente', 'mip', 'recepcion'],
  alta: ['adscrito', 'residente', 'recepcion'],
  bitacora: ['admin'],
};

async function api(url, opts = {}) {
  const res = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function celda(texto) {
  const td = document.createElement('td');
  td.textContent = texto ?? '';
  return td;
}

function filas(tbody, items, columnas) {
  tbody.replaceChildren(...items.map(it => {
    const tr = document.createElement('tr');
    columnas.forEach(c => tr.append(celda(c(it))));
    return tr;
  }));
}

async function salud() {
  const { status } = await api('/api/health');
  $('salud').textContent = status === 200 ? 'API y BD en línea' : `BD no disponible (${status})`;
}

function mostrar(usuario) {
  const rol = usuario?.role;
  $('v-login').hidden = !!usuario;
  $('salir').hidden = !usuario;
  $('quien').textContent = usuario ? `${usuario.username} · ${rol}` : '';
  $('v-pacientes').hidden = !PUEDE.pacientes.includes(rol);
  $('h-alta').hidden = $('f-alta').hidden = !PUEDE.alta.includes(rol);
  $('v-bitacora').hidden = !PUEDE.bitacora.includes(rol);
  $('v-denegado').hidden = !usuario || PUEDE.pacientes.includes(rol) || PUEDE.bitacora.includes(rol);
  $('m-denegado').textContent = 'Tu rol no tiene vistas en este incremento.';
  if (PUEDE.pacientes.includes(rol)) buscar('');
  if (PUEDE.bitacora.includes(rol)) bitacora();
}

async function buscar(q) {
  const { status, body } = await api(`/api/pacientes?q=${encodeURIComponent(q)}`);
  if (status !== 200) return filas($('t-pacientes'), [], []);
  filas($('t-pacientes'), body, [p => p.expediente, p => p.nombre, p => p.curp]);
}

async function bitacora() {
  const { status, body } = await api('/api/auditoria');
  if (status !== 200) return;
  filas($('t-bitacora'), body, [
    r => new Date(r.fecha).toLocaleString('es-MX'),
    r => r.accion,
    r => [r.usuario_id, r.rol].filter(Boolean).join(' / '),
    r => r.ip,
    r => JSON.stringify(r.detalle),
  ]);
}

$('f-login').addEventListener('submit', async e => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const { status, body } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(datos) });
  $('e-login').textContent = status === 200 ? '' : body.error ?? `Error ${status}`;
  if (status === 200) { e.target.reset(); mostrar(body.usuario); }
});

$('salir').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  mostrar(null);
});

$('f-buscar').addEventListener('submit', e => {
  e.preventDefault();
  buscar(new FormData(e.target).get('q'));
});

$('f-alta').addEventListener('submit', async e => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const { status, body } = await api('/api/pacientes', { method: 'POST', body: JSON.stringify(datos) });
  $('m-alta').className = status === 201 ? 'ok' : 'error';
  $('m-alta').textContent = status === 201 ? `Registrado con expediente ${body.expediente}` : `${status}: ${body.error}`;
  if (status === 201) { e.target.reset(); buscar(''); }
});

$('b-bitacora').addEventListener('click', bitacora);

salud();
api('/api/auth/me').then(({ status, body }) => mostrar(status === 200 ? body.usuario : null));
