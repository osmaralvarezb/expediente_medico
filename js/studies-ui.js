import { STUDY_AREAS, STUDY_CATALOG, statusLabel, createStudyOrder, advanceStudy, readyNotices, worklist, findBySampleCode, ordersOf } from './studies.js';
import { formatValue, ANALYTES,formatRef, parseValue, flagFor, validateLabResults, isLabStudy } from './labs.js';
import { exportLabReport, exportLabels } from './lab-pdf.js';

export function studiesUI(h) {
  const I = h.I;
  
  function viewStudies(user) {
    const area = user.role;
    const { label, pickup } = STUDY_AREAS[area];
    
    const isLab = area === 'laboratorio';
    
    const requests = worklist(h.db.studies, area);
    const ready = h.db.studies.filter(r => r.status === 'listo' && r.area === area).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    // Estadísticas
    const stats = [
      { key: 'solicitado', label: 'Por iniciar', ico: I.clock, count: requests.filter(r => r.status === 'solicitado').length },
      { key: 'en_proceso', label: 'En proceso', ico: I.clock, count: requests.filter(r => r.status === 'en_proceso').length },
      { key: 'listo', label: isLab ? 'Resultados capturados' : 'Listos para recoger', ico: I.check, count: ready.length }
    ];
    
    const statsHtml = stats.map(s => `
      <div class="card stat">
        <div class="ico ${s.key === 'solicitado' || s.key === 'en_proceso' ? 'warn' : ''}">
          ${s.ico}
        </div>
        <div>
          <b>${s.count}</b><span>${s.label}</span>
        </div>
      </div>
    `).join('');
    
    // Formulario de código de muestra
    const codeForm = `
      <form class="card code-form" id="codeForm">
        <label>Código de muestra<input name="code" id="codeInput" required autocomplete="off" placeholder="${area === 'laboratorio' ? 'LAB' : 'GAB'}-AAMMDD-0001" class="mono"></label>
        <button class="btn btn-primary" type="submit">${I.search} Buscar</button>
        <div id="codeError"></div>
      </form>
      <div id="capture"></div>
    `;
    
    const tableRows = requests.map(r => {
      const patient = h.db.patients.find(p => p.id === r.patientId);
      const priorityBadge = r.prioridad === 'urgente' 
        ? '<span class="badge danger">Urgente</span>' 
        : '<span class="badge lav">Rutina</span>';
      
      const actionBtn = r.status === 'solicitado'
        ? `<button class="btn btn-primary btn-sm" data-act="recibir" data-id="${h.esc(r.id)}">Recibir muestra</button>`
        : r.status === 'en_proceso'
        ? `<button class="btn btn-ok btn-sm" data-act="capturar" data-id="${h.esc(r.id)}">Capturar resultados</button>`
        : '';
      
      return `
        <tr>
          <td>${priorityBadge}</td>
          <td><b>${h.esc(r.studyName)}</b></td>
          <td>
            <strong>${h.esc(h.fullName(patient))}</strong>
            <br><small class="mono">${h.esc(patient.expediente)}</small>
            <br><small>${h.age(patient.fechaNacimiento)} años</small>
          </td>
          <td>${h.esc(r.indicacion)}</td>
          <td>
            ${h.esc(r.requestedBy.name)}
            <br><small class="muted">${h.fmtDateTime(r.requestedAt)}</small>
          </td>
          <td><span class="code">${h.esc(r.sampleCode)}</span></td>
          <td>
            <span class="badge ${r.status === 'solicitado' ? 'lav' : r.status === 'en_proceso' ? 'blue' : r.status === 'listo' ? 'ok' : r.status === 'entregado' ? '' : 'danger'}">
              ${statusLabel(r)}
            </span>
          </td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join('');
    
    const readyRows = ready.map(r => {
      const patient = h.db.patients.find(p => p.id === r.patientId);
      return `
        <tr>
          <td><b>${h.esc(r.studyName)}</b></td>
          <td>
            <strong>${h.esc(h.fullName(patient))}</strong>
            <br><small class="mono">${h.esc(patient.expediente)}</small>
            <br><small>${h.age(patient.fechaNacimiento)} años</small>
          </td>
          <td><span class="code">${h.esc(r.sampleCode)}</span></td>
          <td>${h.fmtDateTime(r.completedAt)}</td>
          ${isLab ? '' : `<td>${h.esc(pickup)}</td>`}
          <td><button class="btn btn-lav btn-sm" data-act="pdf" data-id="${h.esc(r.id)}">Resultados PDF</button></td>
        </tr>
      `;
    }).join('');
    
    const html = `
      <div class="page-head">
        <div>
          <h1>Estudios · ${h.esc(label)}</h1>
          <p>${isLab
            ? 'Solicitudes recibidas para tu área. Al capturar los resultados, el médico puede descargar el PDF desde el expediente del paciente.'
            : 'Solicitudes recibidas para tu área. Al marcar un estudio como listo, el expediente del paciente muestra el aviso para recogerlo.'}</p>
        </div>
      </div>
      
      <div class="stats">${statsHtml}</div>
      
      ${codeForm}
      
      <div class="card">
        <h2>Lista de trabajo</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Prioridad</th>
                <th>Estudio</th>
                <th>Paciente</th>
                <th>Indicación clínica</th>
                <th>Solicitó</th>
                <th>Muestra</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || '<tr><td colspan="8" class="empty">No hay estudios pendientes.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="card">
        <h2>${isLab ? 'Resultados capturados' : 'Listos para recoger'}</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Estudio</th>
                <th>Paciente</th>
                <th>Muestra</th>
                <th>Listo desde</th>
                ${isLab ? '' : '<th>Lugar de entrega</th>'}
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              ${readyRows || `<tr><td colspan="${isLab ? 5 : 6}" class="empty">${isLab ? 'Aún no hay resultados capturados.' : 'Sin estudios pendientes de entrega.'}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    h.shell(user, html);
    const main = document.querySelector('.main');
    
    // Manejo de eventos
    main.addEventListener('submit', (e) => {
      if (e.target.matches('#codeForm')) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const code = formData.get('code').trim().toUpperCase();
        const errorDiv = document.getElementById('codeError');
        errorDiv.innerHTML = '';
        
        try {
          const req = findBySampleCode(h.db.studies, code, area);
          if (!req) {
            errorDiv.innerHTML = `<div class="error" role="alert">No se encontró una muestra de tu área con ese código.</div>`;
            return;
          }
          
          if (req.status === 'cancelado') {
            errorDiv.innerHTML = `<div class="error" role="alert">La solicitud de este estudio fue cancelada.</div>`;
            return;
          }
          
          if (req.status === 'solicitado') {
            const updated = advanceStudy(req, 'iniciar', user);
            const i = h.db.studies.findIndex(s => s.id === updated.id);
            h.db.studies[i] = updated;
            h.audit('Muestra recibida', `${h.db.patients.find(p => p.id === req.patientId)?.expediente} · ${req.studyName} · ${code}`);
            h.save();
            openCapture(updated);
          } else if (req.status === 'en_proceso') {
            openCapture(req);
          } else if (req.status === 'listo' || req.status === 'entregado') {
            const captureDiv = document.getElementById('capture');
            captureDiv.innerHTML = `
              <div class="card">
                <p>Este estudio ya tiene resultados capturados.</p>
                <button class="btn btn-lav" data-act="resultados" data-id="${h.esc(req.id)}">Resultados PDF</button>
              </div>
            `;
          }
        } catch (err) {
          h.toast(err.message, 'err');
        }
      }
    });
    
    main.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      
      if (btn.dataset.act === 'recibir') {
        const id = btn.dataset.id;
        try {
          const request = h.db.studies.find(r => r.id === id);
          const updated = advanceStudy(request, 'iniciar', user);
          const i = h.db.studies.findIndex(s => s.id === updated.id);
          h.db.studies[i] = updated;
          h.audit('Muestra recibida', `${h.db.patients.find(p => p.id === request.patientId)?.expediente} · ${request.studyName} · ${request.sampleCode}`);
          h.save();
          openCapture(updated);
        } catch (err) {
          h.toast(err.message, 'err');
        }
      } else if (btn.dataset.act === 'capturar') {
        const id = btn.dataset.id;
        const request = h.db.studies.find(r => r.id === id);
        openCapture(request);
      } else if (btn.dataset.act === 'cerrar-captura') {
        document.getElementById('capture').innerHTML = '';
      } else if (btn.dataset.act === 'resultados') {
        const id = btn.dataset.id;
        const req = h.db.studies.find(r => r.id === id);
        const patient = h.db.patients.find(p => p.id === req.patientId);
        const orderRequests = r => h.db.studies.filter(s => s.orderId === r.orderId);
        try {
          await exportLabReport(patient, orderRequests(req), user);
          h.audit('Exportación de resultados PDF', patient.expediente);
        } catch (err) {
          h.toast(err.message, 'err');
        }
      } else if (btn.dataset.act === 'pdf') {
        const id = btn.dataset.id;
        const req = h.db.studies.find(r => r.id === id);
        const patient = h.db.patients.find(p => p.id === req.patientId);
        const orderRequests = r => h.db.studies.filter(s => s.orderId === r.orderId);
        try {
          await exportLabReport(patient, orderRequests(req), user);
          h.audit('Exportación de resultados PDF', patient.expediente);
        } catch (err) {
          h.toast(err.message, 'err');
        }
      }
    });
    
    main.addEventListener('submit', (e) => {
      if (e.target.matches('#captureForm')) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const id = e.target.dataset.id;
        const request = h.db.studies.find(r => r.id === id);
        const patient = h.db.patients.find(p => p.id === request.patientId);
        
        if (isLabStudy(request.studyCode)) {
          const values = {};
          for (const [key, value] of formData.entries()) {
            if (key !== '__obs') {
              values[key] = value;
            }
          }
          
          const obs = formData.get('__obs').trim() || undefined;
          
          const validation = validateLabResults(request.studyCode, values, patient.sexo);
          if (!validation.ok) {
            const errorDiv = e.target.querySelector('.error');
            if (errorDiv) errorDiv.remove();
            const ul = document.createElement('ul');
            validation.errors.forEach(err => {
              const li = document.createElement('li');
              li.textContent = err;
              ul.appendChild(li);
            });
            const div = document.createElement('div');
            div.className = 'error';
            div.setAttribute('role', 'alert');
            div.appendChild(ul);
            e.target.insertBefore(div, e.target.firstChild);
            return;
          }
          
          try {
            const updated = advanceStudy(request, 'completar', user, { results: validation.results, resultado: obs });
            const i = h.db.studies.findIndex(s => s.id === updated.id);
            h.db.studies[i] = updated;
            h.audit('Resultados capturados', `${patient.expediente} · ${request.studyName} · ${request.sampleCode}`);
            h.toast('Resultados guardados. El médico ya puede descargar el PDF desde el expediente.');
            h.save();
            h.render({ quiet: true });
          } catch (err) {
            h.toast(err.message, 'err');
          }
        } else {
          const obs = formData.get('__obs').trim() || undefined;
          
          try {
            const updated = advanceStudy(request, 'completar', user, { resultado: obs });
            const i = h.db.studies.findIndex(s => s.id === updated.id);
            h.db.studies[i] = updated;
            h.audit('Resultados capturados', `${patient.expediente} · ${request.studyName} · ${request.sampleCode}`);
            h.toast('Resultados guardados. Se notificó en el expediente del paciente.');
            h.save();
            h.render({ quiet: true });
          } catch (err) {
            h.toast(err.message, 'err');
          }
        }
      }
    });
    
    // Focus al input de código
    setTimeout(() => {
      const codeInput = document.getElementById('codeInput');
      if (codeInput) codeInput.focus();
    }, 100);
  }
  
  function openCapture(req) {
    const patient = h.db.patients.find(p => p.id === req.patientId);
    const captureDiv = document.getElementById('capture');
    
    let formHtml = `
      <form class="card" id="captureForm" data-id="${h.esc(req.id)}">
        <h2>${h.esc(req.studyName)} <span class="code">${h.esc(req.sampleCode)}</span></h2>
        <p><strong>Paciente:</strong> ${h.esc(h.fullName(patient))} · Expediente: ${h.esc(patient.expediente)} · Sexo: ${h.esc(patient.sexo)} · Edad: ${h.age(patient.fechaNacimiento)} años</p>
        <p><strong>Indicación:</strong> ${h.esc(req.indicacion)}</p>
    `;
    
    if (isLabStudy(req.studyCode)) {
      const items = ANALYTES[req.studyCode].items;
      formHtml += `
        <table class="capture">
          <thead>
            <tr>
              <th>Examen</th>
              <th>Resultado</th>
              <th>Unidades</th>
              <th>Referencia</th>
              <th>Marca</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      items.forEach(item => {
        if (item.type === 'text') {
          if (item.options) {
            formHtml += `
              <tr>
                <td>${h.esc(item.name)}</td>
                <td><select name="${h.esc(item.key)}" ${item.optional ? '' : 'required'}>
                  <option value="">Selecciona…</option>
                  ${item.options.map(opt => `<option value="${h.esc(opt)}">${h.esc(opt)}</option>`).join('')}
                </select></td>
                <td>${h.esc(item.unit || '')}</td>
                <td>${h.esc(formatRef(item, patient.sexo))}</td>
                <td class="flag" data-flag-for="${h.esc(item.key)}"></td>
              </tr>
            `;
          } else {
            formHtml += `
              <tr>
                <td>${h.esc(item.name)}</td>
                <td><input name="${h.esc(item.key)}" type="text" maxlength="200" ${item.optional ? '' : 'required'} autocomplete="off"></td>
                <td>${h.esc(item.unit || '')}</td>
                <td>${h.esc(formatRef(item, patient.sexo))}</td>
                <td class="flag" data-flag-for="${h.esc(item.key)}"></td>
              </tr>
            `;
          }
        } else {
          formHtml += `
            <tr>
              <td>${h.esc(item.name)}</td>
              <td><input name="${h.esc(item.key)}" type="text" inputmode="decimal" autocomplete="off" required></td>
              <td>${h.esc(item.unit || '')}</td>
              <td>${h.esc(formatRef(item, patient.sexo))}</td>
              <td class="flag" data-flag-for="${h.esc(item.key)}"></td>
            </tr>
          `;
        }
      });
      
      formHtml += `
          </tbody>
        </table>
        <label>Observaciones (opcional)<textarea name="__obs" maxlength="4000" rows="2"></textarea></label>
      `;
    } else {
      formHtml += `
        <label>Interpretación / reporte<textarea name="__obs" required maxlength="4000" rows="5"></textarea></label>
      `;
    }
    
    formHtml += `
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-act="cerrar-captura">Cancelar</button>
        <button class="btn btn-ok" type="submit">${I.check} Guardar resultados y marcar listo</button>
      </div>
    `;
    
    captureDiv.innerHTML = formHtml;
    
    // Manejo de live flag
    const table = captureDiv.querySelector('.capture');
    if (table) {
      table.addEventListener('input', (e) => {
        if (e.target.matches('input, select')) {
          const key = e.target.name;
          const row = e.target.closest('tr');
          const flagCell = row.querySelector('.flag[data-flag-for="' + key + '"]');
          
          if (flagCell) {
            const items = ANALYTES[req.studyCode].items;
            const item = items.find(i => i.key === key);
            const raw = e.target.value.trim();
            let flag = null;
            
            if (raw) {
              const v = parseValue(item, raw);
              if (item.type === 'text' || !Number.isNaN(v)) {
                flag = flagFor(item, v, patient.sexo);
              }
            }
            
            flagCell.innerHTML = '';
            if (flag) {
              const badge = document.createElement('span');
              badge.className = 'badge ' + (flag === 'alto' ? 'danger' : flag === 'bajo' ? 'blue' : 'warn');
              badge.textContent = (flag === 'alto' ? '↑ Alto' : flag === 'bajo' ? '↓ Bajo' : 'Anormal');
              flagCell.appendChild(badge);
            }
          }
        }
      });
      
      table.addEventListener('change', (e) => {
        if (e.target.matches('select')) {
          const key = e.target.name;
          const row = e.target.closest('tr');
          const flagCell = row.querySelector('.flag[data-flag-for="' + key + '"]');
          
          if (flagCell) {
            const items = ANALYTES[req.studyCode].items;
            const item = items.find(i => i.key === key);
            const raw = e.target.value.trim();
            let flag = null;
            
            if (raw) {
              const v = parseValue(item, raw);
              if (item.type === 'text' || !Number.isNaN(v)) {
                flag = flagFor(item, v, patient.sexo);
              }
            }
            
            flagCell.innerHTML = '';
            if (flag) {
              const badge = document.createElement('span');
              badge.className = 'badge ' + (flag === 'alto' ? 'danger' : flag === 'bajo' ? 'blue' : 'warn');
              badge.textContent = (flag === 'alto' ? '↑ Alto' : flag === 'bajo' ? '↓ Bajo' : 'Anormal');
              flagCell.appendChild(badge);
            }
          }
        }
      });
    }
    
    captureDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Focus al primer input
    const firstInput = captureDiv.querySelector('input, select');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
  
  function recordSection(user, patient) {
    const orders = ordersOf(h.db.studies, patient.id);
    const totalStudies = orders.reduce((sum, order) => sum + order.requests.length, 0);
    
    let html = `
      <div class="card" id="studies">
        <h2>Estudios de laboratorio y gabinete <span class="count">${totalStudies}</span></h2>
    `;
    
    if (h.can(user.role, 'studies:request')) {
      const catalogByArea = {};
      STUDY_CATALOG.forEach(item => {
        if (!catalogByArea[item.area]) catalogByArea[item.area] = [];
        catalogByArea[item.area].push(item);
      });
      
      html += `
        <details class="new-note">
          <summary class="btn btn-primary">${I.plus} Solicitar estudio</summary>
          <form id="studyForm">
            <div class="form-grid">
              ${Object.entries(catalogByArea).map(([area, items]) => `
                <fieldset class="study-pick">
                  <legend>${h.esc(STUDY_AREAS[area].label)}</legend>
                  <div class="checks">
                    ${items.map(item => `
                      <label class="check"><input type="checkbox" name="studyCodes" value="${h.esc(item.code)}"> ${h.esc(item.name)}</label>
                    `).join('')}
                  </div>
                </fieldset>
              `).join('')}
              
              <label>Prioridad
                <select name="prioridad">
                  <option value="rutina" selected>Rutina</option>
                  <option value="urgente">Urgente</option>
                </select>
              </label>
              
              <label class="full">Indicación clínica
                <textarea name="indicacion" required maxlength="500" rows="2" placeholder="Motivo o sospecha diagnóstica"></textarea>
              </label>
            </div>
            
            <div class="form-actions">
              <button class="btn btn-primary" type="submit">Generar solicitud y códigos</button>
            </div>
          </form>
        </details>
      `;
    }
    
    if (orders.length === 0) {
      html += '<p class="empty">Sin estudios solicitados.</p>';
    } else {
      orders.forEach(order => {
        html += `
          <section class="order">
            <div class="order-head">
              <div>
                <b>Solicitud del ${h.fmtDateTime(order.requestedAt)}</b>
                <small>${order.requests.length} estudio(s) · ${h.esc(order.requests[0].requestedBy.name)}</small>
              </div>
              <div class="actions">
        `;

        if (h.can(user.role, 'studies:request')) {
          html += `<button class="btn btn-ghost btn-sm" data-act="etiquetas" data-order="${h.esc(order.orderId)}">Etiquetas PDF</button>`;
        }
        if (h.can(user.role, 'clinical:read') && order.requests.some(r => r.status === 'listo' || r.status === 'entregado')) {
          html += `
            <button class="btn btn-lav btn-sm" data-act="resultados" data-order="${h.esc(order.orderId)}">Resultados PDF</button>
          `;
        }
        
        html += '</div></div>';
        
        order.requests.forEach(req => {
          const areaLabel = STUDY_AREAS[req.area].label;
          const statusBadgeClass = req.status === 'solicitado' ? 'lav' : 
                                  req.status === 'en_proceso' ? 'blue' : 
                                  req.status === 'listo' ? 'ok' : 
                                  req.status === 'entregado' ? '' : 'danger';
          
          const priorityBadge = req.prioridad === 'urgente' 
            ? '<span class="badge danger">Urgente</span>' 
            : '<span class="badge lav">Rutina</span>';
          
          html += `
            <article class="study ${req.status}">
              <div class="study-head">
                <div>
                  <b>${h.esc(req.studyName)}</b>
                  <br><small>${h.esc(areaLabel)} · solicitado por ${h.esc(req.requestedBy.name)} · ${h.fmtDateTime(req.requestedAt)}</small>
                </div>
                <div>
                  ${priorityBadge}
                  <span class="badge ${statusBadgeClass}">${statusLabel(req)}</span>
                  <span class="code">${h.esc(req.sampleCode)}</span>
                </div>
              </div>
          `;
          
          if (h.can(user.role, 'clinical:read')) {
            html += `<p><strong>Indicación:</strong> ${h.esc(req.indicacion)}</p>`;
            
            if (req.status === 'listo' || req.status === 'entregado') {
              if (isLabStudy(req.studyCode)) {
                const results = req.results;
                if (results && results.length > 0) {
                  html += `
                    <table class="results">
                      <thead>
                        <tr>
                          <th>Examen</th>
                          <th>Resultado</th>
                          <th>Unidades</th>
                          <th>Referencia</th>
                        </tr>
                      </thead>
                      <tbody>
                  `;
                  
                  results.forEach(res => {
                    const flagClass = res.flag ? 'out' : '';
                    html += `
                      <tr class="${flagClass}">
                        <td>${h.esc(res.name)}</td>
                        <td>${h.esc(formatValue(req.studyCode, res))} ${res.flag ? '<span class="badge ' + (res.flag === 'alto' ? 'danger' : res.flag === 'bajo' ? 'blue' : 'warn') + '">' + (res.flag === 'alto' ? '↑ Alto' : res.flag === 'bajo' ? '↓ Bajo' : 'Anormal') + '</span>' : ''}</td>
                        <td>${h.esc(res.unit)}</td>
                        <td>${h.esc(res.ref)}</td>
                      </tr>
                    `;
                  });
                  
                  html += `
                      </tbody>
                    </table>
                  `;
                }
                if (req.resultado) html += `<p><strong>Observaciones:</strong> ${h.esc(req.resultado)}</p>`;
              } else {
                html += `<p><strong>Interpretación:</strong> ${h.esc(req.resultado)}</p>`;
              }
              
              html += `<small>Validó: ${h.esc(req.completedBy?.name || '')}</small>`;
            }
          }
          
          if (req.status === 'listo' && STUDY_AREAS[req.area].pickup) {
            html += `<p class="pickup">${I.alert} Recoger en: <b>${h.esc(STUDY_AREAS[req.area].pickup)}</b></p>`;
          } else if (req.status === 'entregado') {
            html += `<small class="muted">Entregado por ${h.esc(req.deliveredBy || '')} · ${h.fmtDateTime(req.deliveredAt)}</small>`;
          } else if (req.status === 'cancelado') {
            html += `<small class="muted">Cancelado: ${h.esc(req.cancelReason)}</small>`;
          }
          
          // Botones de acción
          const actions = [];
          if (req.status === 'listo' && STUDY_AREAS[req.area].pickup && h.can(user.role, 'studies:deliver')) {
            actions.push(`<button class="btn btn-ok btn-sm" data-act="entregar" data-id="${h.esc(req.id)}">Marcar como entregado</button>`);
          }
          if (req.status === 'solicitado' && h.can(user.role, 'studies:cancel')) {
            actions.push(`<button class="btn btn-danger btn-sm" data-act="cancelar" data-id="${h.esc(req.id)}">Cancelar</button>`);
          }
          
          if (actions.length > 0) {
            html += `<div class="actions">${actions.join('')}</div>`;
          }
          
          html += '</article>';
        });
        
        html += '</section>';
      });
    }
    
    html += '</div>';
    return html;
  }
  
  function bindRecordSection(user, patient) {
    const container = document.getElementById('studies');
    
    if (!container) return;
    
    // Manejo de formulario
    const form = container.querySelector('#studyForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        
        const formData = new FormData(form);
        const studyCodes = formData.getAll('studyCodes');
        
        if (studyCodes.length === 0) {
          h.toast('Selecciona al menos un estudio.', 'err');
          return;
        }
        
        const prioridad = formData.get('prioridad');
        const indicacion = formData.get('indicacion');
        
        try {
          const order = createStudyOrder({ patientId: patient.id, studyCodes, indicacion, prioridad }, user, { firstSeq: (h.db.sampleSeq ?? 0) + 1 });
          
          h.db.studies.push(...order.requests);
          h.db.sampleSeq = order.nextSeq - 1;
          h.save();
          
          const codes = order.requests.map(r => r.sampleCode);
          h.audit('Solicitud de estudios', `${patient.expediente} · ${codes.join(', ')}`);
          h.toast(`Se generaron ${codes.length} códigos de muestra. Imprime las etiquetas.`);
          h.render({ quiet: true });
        } catch (err) {
          h.toast(err.message, 'err');
        }
      });
    }
    
    // Manejo de acciones
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      
      if (btn.dataset.act === 'entregar') {
        const id = btn.dataset.id;
        try {
          const request = h.db.studies.find(r => r.id === id);
          const updated = advanceStudy(request, 'entregar', user);
          const i = h.db.studies.findIndex(s => s.id === updated.id);
          h.db.studies[i] = updated;
          h.audit('Estudio entregado', `${patient.expediente} · ${request.studyName}`);
          h.toast('Estudio marcado como entregado');
          h.save();
          h.render({ quiet: true });
        } catch (err) {
          h.toast(err.message, 'err');
        }
      } else if (btn.dataset.act === 'cancelar') {
        const id = btn.dataset.id;
        const motivo = prompt('Motivo de la cancelación:');
        if (motivo === null) return;
        
        try {
          const request = h.db.studies.find(r => r.id === id);
          const trimmedMotivo = motivo.trim();
          if (!trimmedMotivo) return;
          
          const updated = advanceStudy(request, 'cancelar', user, { motivo: trimmedMotivo });
          const i = h.db.studies.findIndex(s => s.id === updated.id);
          h.db.studies[i] = updated;
          h.audit('Solicitud de estudio cancelada', `${patient.expediente} · ${request.studyName}`);
          h.toast('Solicitud cancelada');
          h.save();
          h.render({ quiet: true });
        } catch (err) {
          h.toast(err.message, 'err');
        }
      } else if (btn.dataset.act === 'resultados') {
        const orderId = btn.dataset.order;
        const reqs = h.db.studies.filter(s => s.orderId === orderId);
        try {
          await exportLabReport(patient, reqs, user);
          h.audit('Exportación de resultados PDF', patient.expediente);
        } catch (err) {
          h.toast(err.message, 'err');
        }
      } else if (btn.dataset.act === 'etiquetas') {
        const reqs = h.db.studies.filter(s => s.orderId === btn.dataset.order);
        try {
          await exportLabels(patient, reqs);
          h.audit('Impresión de etiquetas', `${patient.expediente} · ${reqs.map(r => r.sampleCode).join(', ')}`);
        } catch (err) {
          h.toast(err.message, 'err');
        }
      }
    });
  }
  
  function readyBanner(patient) {
    const notices = readyNotices(h.db.studies, patient.id);
    
    if (!notices.length) return '';
    
    const noticeHtml = notices.map(r => {
      const pickup = STUDY_AREAS[r.area].pickup;
      return `
        <div class="notice" role="status">
          ${I.check}
          <div>
            <b>Estudio listo para recoger: ${h.esc(r.studyName)}</b>
            <span>Acudir a ${h.esc(pickup)} · listo desde ${h.fmtDateTime(r.completedAt)}</span>
          </div>
        </div>
      `;
    }).join('');
    
    return `<div class="notices">${noticeHtml}</div>`;
  }
  
  return { viewStudies, recordSection, bindRecordSection, readyBanner };
}
