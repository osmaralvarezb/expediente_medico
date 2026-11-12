export const STUDY_AREAS = {
  laboratorio: { label: 'Laboratorio clínico', pickup: null }, // los resultados de laboratorio se consultan en PDF, no se recogen
  imagenologia: { label: 'Imagenología (gabinete)', pickup: 'Imagenología · sala de interpretación y entrega de estudios' },
};

/**
 * Catálogo de estudios diagnósticos disponibles.
 * @type {Array<{code: string, name: string, area: string}>}
 */
export const STUDY_CATALOG = [
  // Estudios de laboratorio
  { code: 'LAB-BH', name: 'Biometría hemática completa', area: 'laboratorio' },
  { code: 'LAB-QS', name: 'Química sanguínea (glucosa, urea, creatinina)', area: 'laboratorio' },
  { code: 'LAB-PL', name: 'Perfil de lípidos', area: 'laboratorio' },
  { code: 'LAB-HBA1C', name: 'Hemoglobina glucosilada (HbA1c)', area: 'laboratorio' },
  { code: 'LAB-EGO', name: 'Examen general de orina', area: 'laboratorio' },
  { code: 'LAB-PFH', name: 'Pruebas de función hepática', area: 'laboratorio' },
  { code: 'LAB-ES', name: 'Electrolitos séricos', area: 'laboratorio' },
  { code: 'LAB-TC', name: 'Tiempos de coagulación (TP, TTPa)', area: 'laboratorio' },
  { code: 'LAB-UC', name: 'Urocultivo', area: 'laboratorio' },
  { code: 'LAB-HCG', name: 'Prueba de embarazo (hCG en sangre)', area: 'laboratorio' },
  // Estudios de imagenología
  { code: 'RX-TX', name: 'Radiografía de tórax PA', area: 'imagenologia' },
  { code: 'RX-ABD', name: 'Radiografía simple de abdomen', area: 'imagenologia' },
  { code: 'USG-ABD', name: 'Ultrasonido abdominal', area: 'imagenologia' },
  { code: 'USG-OBS', name: 'Ultrasonido obstétrico', area: 'imagenologia' },
  { code: 'TAC-CR', name: 'Tomografía de cráneo simple', area: 'imagenologia' },
  { code: 'TAC-ABD', name: 'Tomografía de abdomen contrastada', area: 'imagenologia' },
  { code: 'RM-COL', name: 'Resonancia magnética de columna lumbar', area: 'imagenologia' },
  { code: 'MASTO', name: 'Mastografía bilateral', area: 'imagenologia' },
  { code: 'DXA', name: 'Densitometría ósea', area: 'imagenologia' },
];

/**
 * Estados posibles de un estudio.
 * @type {Object}
 */
export const STUDY_STATUS = {
  solicitado: 'Solicitado',
  en_proceso: 'En proceso',
  listo: 'Listo para recoger',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
};

/** Etiqueta de estado para mostrar: en laboratorio, "listo" significa resultados disponibles (no se recoge nada). */
export const statusLabel = r => (r.status === 'listo' && r.area === 'laboratorio' ? 'Resultados disponibles' : STUDY_STATUS[r.status]);

/**
 * Genera un código de muestra para un estudio.
 * @param {string} area - Área del estudio ('laboratorio' o 'imagenologia')
 * @param {number} seq - Secuencia numérica
 * @param {string} now - Fecha y hora actual (opcional)
 * @returns {string}
 */
export function sampleCode(area, seq, now = new Date().toISOString()) {
  if (typeof seq !== 'number' || seq <= 0 || !Number.isInteger(seq)) {
    throw new Error('Secuencia no válida.');
  }
  const d = new Date(now);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const yymmdd = `${String(year).slice(2)}${month}${day}`;
  return `${area === 'laboratorio' ? 'LAB' : 'GAB'}-${yymmdd}-${String(seq).padStart(4, '0')}`;
}

/**
 * Crea una nueva solicitud de estudio.
 * @param {Object} params - Parámetros de la solicitud
 * @param {string} params.patientId - ID del paciente
 * @param {string} params.studyCode - Código del estudio
 * @param {string} params.indicacion - Indicación clínica
 * @param {'rutina'|'urgente'} params.prioridad - Prioridad del estudio
 * @param {Object} user - Usuario que realiza la solicitud
 * @param {string} now - Fecha y hora actual (opcional)
 * @param {Object} extra - Datos adicionales
 * @returns {Object} Solicitud de estudio creada
 */
export function createStudyRequest({ patientId, studyCode, indicacion, prioridad }, user, now = new Date().toISOString(), extra = {}) {
  if (!['adscrito', 'residente'].includes(user.role)) {
    throw new Error('Tu rol no puede solicitar estudios.');
  }
  if (typeof patientId !== 'string' || patientId.trim() === '') {
    throw new Error('ID de paciente inválido.');
  }
  const study = STUDY_CATALOG.find(s => s.code === studyCode);
  if (!study) {
    throw new Error('Estudio no válido.');
  }
  const trimmedIndicacion = indicacion.trim();
  if (trimmedIndicacion === '' || trimmedIndicacion.length > 500) {
    throw new Error('La indicación clínica es obligatoria (máx. 500 caracteres).');
  }
  if (!['rutina', 'urgente'].includes(prioridad)) {
    throw new Error('Prioridad no válida.');
  }

  const result = {
    id: crypto.randomUUID(),
    patientId,
    studyCode,
    studyName: study.name,
    area: study.area,
    indicacion: trimmedIndicacion,
    prioridad,
    status: 'solicitado',
    requestedBy: { id: user.id, name: user.name },
    requestedAt: now,
    history: [{ status: 'solicitado', by: user.name, at: now }]
  };

  if (extra.orderId) {
    result.orderId = extra.orderId;
  }
  if (extra.sampleCode) {
    result.sampleCode = extra.sampleCode;
  }

  return result;
}

/**
 * Crea un orden de estudios.
 * @param {Object} params - Parámetros del orden
 * @param {string} params.patientId - ID del paciente
 * @param {Array<string>} params.studyCodes - Códigos de los estudios
 * @param {string} params.indicacion - Indicación clínica
 * @param {'rutina'|'urgente'} params.prioridad - Prioridad del estudio
 * @param {Object} user - Usuario que realiza la solicitud
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Orden de estudios creado
 */
export function createStudyOrder({ patientId, studyCodes, indicacion, prioridad }, user, { now = new Date().toISOString(), firstSeq } = {}) {
  if (!Array.isArray(studyCodes) || studyCodes.length === 0) {
    throw new Error('Selecciona entre 1 y 10 estudios distintos.');
  }
  if (studyCodes.length > 10) {
    throw new Error('Selecciona entre 1 y 10 estudios distintos.');
  }
  const uniqueCodes = [...new Set(studyCodes)];
  if (uniqueCodes.length !== studyCodes.length) {
    throw new Error('Selecciona entre 1 y 10 estudios distintos.');
  }

  if (typeof firstSeq !== 'number' || firstSeq <= 0 || !Number.isInteger(firstSeq)) {
    throw new Error('Secuencia no válida.');
  }

  const orderId = crypto.randomUUID();
  const requests = [];
  for (let i = 0; i < studyCodes.length; i++) {
    const code = studyCodes[i];
    const seq = firstSeq + i;
    // El prefijo depende del área del estudio (LAB / GAB); un código inválido lo rechaza createStudyRequest.
    const area = STUDY_CATALOG.find(s => s.code === code)?.area;
    const sampleCodeValue = sampleCode(area, seq, now);
    const request = createStudyRequest({
      patientId,
      studyCode: code,
      indicacion,
      prioridad
    }, user, now, {
      orderId,
      sampleCode: sampleCodeValue
    });
    requests.push(request);
  }

  return {
    orderId,
    requests,
    nextSeq: firstSeq + studyCodes.length
  };
}

/**
 * Busca una solicitud por código de muestra.
 * @param {Array<Object>} requests - Lista de solicitudes
 * @param {string} code - Código de muestra
 * @param {string} area - Área del estudio ('laboratorio' o 'imagenologia')
 * @returns {Object | null}
 */
export const findBySampleCode = (requests, code, area) => {
  const normalizedCode = code.trim().toUpperCase();
  return requests.find(r => r.sampleCode === normalizedCode && r.area === area) || null;
};

/**
 * Avanza el estado de una solicitud de estudio.
 * @param {Object} request - Solicitud actual
 * @param {'iniciar'|'completar'|'entregar'|'cancelar'} action - Acción a realizar
 * @param {Object} user - Usuario que realiza la acción
 * @param {Object} data - Datos adicionales para la acción
 * @param {string} now - Fecha y hora actual (opcional)
 * @returns {Object} Nueva solicitud con estado actualizado
 */
export function advanceStudy(request, action, user, data = {}, now = new Date().toISOString()) {
  const newRequest = structuredClone(request);
  const currentStatus = request.status;

  switch (action) {
    case 'iniciar': {
      if (user.role !== request.area) {
        throw new Error('Tu rol no puede realizar esta acción.');
      }
      if (currentStatus !== 'solicitado') {
        throw new Error('Acción no permitida en el estado actual.');
      }
      newRequest.status = 'en_proceso';
      newRequest.processedBy = { id: user.id, name: user.name };
      break;
    }
    case 'completar': {
      if (user.role !== request.area) {
        throw new Error('Tu rol no puede realizar esta acción.');
      }
      if (currentStatus !== 'en_proceso') {
        throw new Error('Acción no permitida en el estado actual.');
      }

      // Validación específica para laboratorio
      if (request.area === 'laboratorio') {
        if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
          throw new Error('Captura los valores del estudio.');
        }
        newRequest.results = data.results;
        if (data.resultado && typeof data.resultado === 'string' && data.resultado.trim() !== '') {
          const trimmedResultado = data.resultado.trim();
          if (trimmedResultado.length > 4000) {
            throw new Error('El resultado no puede exceder los 4000 caracteres.');
          }
          newRequest.resultado = trimmedResultado; // observaciones del laboratorio (mismo campo que lee la UI y el PDF)
        }
      } else {
        // Validación para imagenología
        const trimmedResultado = data.resultado?.trim();
        if (typeof trimmedResultado !== 'string' || trimmedResultado === '' || trimmedResultado.length > 4000) {
          throw new Error('Captura el resultado o la interpretación del estudio.');
        }
        newRequest.resultado = trimmedResultado;
      }

      newRequest.status = 'listo';
      newRequest.completedBy = { id: user.id, name: user.name };
      newRequest.completedAt = now;
      newRequest.pickup = STUDY_AREAS[request.area].pickup;
      break;
    }
    case 'entregar': {
      if (!['recepcion', 'adscrito', 'residente'].includes(user.role)) {
        throw new Error('Tu rol no puede realizar esta acción.');
      }
      if (currentStatus !== 'listo') {
        throw new Error('Acción no permitida en el estado actual.');
      }
      newRequest.status = 'entregado';
      newRequest.deliveredAt = now;
      newRequest.deliveredBy = user.name;
      break;
    }
    case 'cancelar': {
      if (!['adscrito', 'residente'].includes(user.role)) {
        throw new Error('Tu rol no puede realizar esta acción.');
      }
      if (currentStatus !== 'solicitado') {
        throw new Error('Acción no permitida en el estado actual.');
      }
      const trimmedMotivo = data.motivo?.trim();
      if (typeof trimmedMotivo !== 'string' || trimmedMotivo === '') {
        throw new Error('Indica el motivo de cancelación.');
      }
      newRequest.status = 'cancelado';
      newRequest.cancelReason = trimmedMotivo;
      break;
    }
    default:
      throw new Error('Acción no permitida en el estado actual.');
  }

  newRequest.history.push({ status: newRequest.status, by: user.name, at: now });
  return newRequest;
}

/**
 * Notificaciones de estudios listos para recoger (solo áreas con lugar de entrega, p. ej. imagenología).
 * @param {Array<Object>} requests - Lista de solicitudes
 * @param {string} patientId - ID del paciente
 * @returns {Array<Object>} Solicitudes listas para recoger del paciente
 */
export const readyNotices = (requests, patientId) => {
  return requests
    .filter(r => r.patientId === patientId && r.status === 'listo' && STUDY_AREAS[r.area]?.pickup)
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
};

/**
 * Lista de trabajo por área.
 * @param {Array<Object>} requests - Lista de solicitudes
 * @param {string} area - Área (laboratorio o imagenologia)
 * @returns {Array<Object>} Solicitudes pendientes ordenadas por prioridad y fecha
 */
export const worklist = (requests, area) => {
  return requests
    .filter(r => r.area === area && ['solicitado', 'en_proceso'].includes(r.status))
    .sort((a, b) => {
      if (a.prioridad !== b.prioridad) {
        return b.prioridad === 'urgente' ? 1 : -1;
      }
      return new Date(a.requestedAt) - new Date(b.requestedAt);
    });
};

/**
 * Agrupa las solicitudes por orden.
 * @param {Array<Object>} requests - Lista de solicitudes
 * @param {string} patientId - ID del paciente
 * @returns {Array<Object>} Solicitudes agrupadas por orden
 */
export const ordersOf = (requests, patientId) => {
  const patientRequests = requests.filter(r => r.patientId === patientId);
  const groups = new Map();

  for (const request of patientRequests) {
    const orderId = request.orderId || request.id;
    if (!groups.has(orderId)) {
      groups.set(orderId, []);
    }
    groups.get(orderId).push(request);
  }

  return Array.from(groups.entries())
    .map(([orderId, requests]) => ({
      orderId,
      requestedAt: requests[0].requestedAt,
      requests
    }))
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
};
