export const SEX = { Femenino: 'F', Masculino: 'M' };

export const ANALYTES = {
  'LAB-BH': {
    section: 'Hematología',
    items: [
      { key: 'leucocitos', name: 'Leucocitos', unit: '10³/µL', decimals: 2, ref: { min: 4.5, max: 11.0 } },
      { key: 'eritrocitos', name: 'Eritrocitos', unit: '10⁶/µL', decimals: 2, ref: { F: { min: 4.0, max: 5.2 }, M: { min: 4.5, max: 5.9 } } },
      { key: 'hemoglobina', name: 'Hemoglobina', unit: 'g/dL', decimals: 1, ref: { F: { min: 12.0, max: 15.5 }, M: { min: 13.5, max: 17.5 } } },
      { key: 'hematocrito', name: 'Hematocrito', unit: '%', decimals: 1, ref: { F: { min: 36.0, max: 46.0 }, M: { min: 41.0, max: 53.0 } } },
      { key: 'vcm', name: 'Volumen corpuscular medio', unit: 'fL', decimals: 1, ref: { min: 80, max: 100 } },
      { key: 'hcm', name: 'Hemoglobina corpuscular media', unit: 'pg', decimals: 1, ref: { min: 27, max: 33 } },
      { key: 'plaquetas', name: 'Plaquetas', unit: '10³/µL', decimals: 0, ref: { min: 150, max: 450 } },
      { key: 'neutrofilos', name: 'Neutrófilos', unit: '%', decimals: 1, ref: { min: 40, max: 70 } },
      { key: 'linfocitos', name: 'Linfocitos', unit: '%', decimals: 1, ref: { min: 20, max: 40 } }
    ]
  },
  'LAB-QS': {
    section: 'Química clínica',
    items: [
      { key: 'glucosa', name: 'Glucosa', unit: 'mg/dL', decimals: 1, ref: { min: 74.0, max: 106.0 } },
      { key: 'bun', name: 'Nitrógeno ureico (BUN)', unit: 'mg/dL', decimals: 2, ref: { min: 7.94, max: 20.10 } },
      { key: 'urea', name: 'Urea', unit: 'mg/dL', decimals: 1, ref: { min: 17.0, max: 43.0 } },
      { key: 'creatinina', name: 'Creatinina', unit: 'mg/dL', decimals: 2, ref: { F: { min: 0.52, max: 1.04 }, M: { min: 0.67, max: 1.17 } } },
      { key: 'acidoUrico', name: 'Ácido úrico', unit: 'mg/dL', decimals: 1, ref: { F: { min: 2.5, max: 6.2 }, M: { min: 3.5, max: 7.2 } } }
    ]
  },
  'LAB-PL': {
    section: 'Química clínica',
    items: [
      { key: 'colesterolTotal', name: 'Colesterol total', unit: 'mg/dL', decimals: 1, ref: { min: 50.0, max: 200.0 } },
      { key: 'trigliceridos', name: 'Triglicéridos', unit: 'mg/dL', decimals: 1, ref: { min: 40.0, max: 160.0 } },
      { key: 'hdl', name: 'Colesterol de alta densidad (HDL)', unit: 'mg/dL', decimals: 1, ref: { min: 40.0, max: 60.0 } },
      { key: 'ldl', name: 'Colesterol de baja densidad (LDL)', unit: 'mg/dL', decimals: 2, ref: { min: 75.00, max: 193.00 } },
      { key: 'vldl', name: 'Colesterol de muy baja densidad (VLDL)', unit: 'mg/dL', decimals: 1, ref: { min: 25.0, max: 50.0 } }
    ]
  },
  'LAB-HBA1C': {
    section: 'Hematología',
    items: [
      { key: 'hba1c', name: 'Hemoglobina glucosilada (HbA1c)', unit: '%', decimals: 2, ref: { min: 4.00, max: 5.60 } }
    ]
  },
  'LAB-EGO': {
    section: 'Uroanálisis',
    items: [
      { key: 'color', name: 'Color', type: 'text', normal: 'Amarillo' },
      { key: 'aspecto', name: 'Aspecto', type: 'text', normal: 'Claro', options: ['Claro','Ligeramente turbio','Turbio'] },
      { key: 'densidad', name: 'Densidad', unit: '', decimals: 3, ref: { min: 1.005, max: 1.030 } },
      { key: 'ph', name: 'pH', unit: '', decimals: 1, ref: { min: 5.0, max: 8.0 } },
      { key: 'glucosaOrina', name: 'Glucosa', type: 'text', normal: 'Negativo', options: ['Negativo','Positivo'] },
      { key: 'proteinas', name: 'Proteínas', type: 'text', normal: 'Negativo', options: ['Negativo','Positivo'] },
      { key: 'leucocitosOrina', name: 'Leucocitos', unit: '/campo', decimals: 0, ref: { min: 0, max: 5 } },
      { key: 'eritrocitosOrina', name: 'Eritrocitos', unit: '/campo', decimals: 0, ref: { min: 0, max: 2 } },
      { key: 'bacterias', name: 'Bacterias', type: 'text', normal: 'Escasas', options: ['Escasas','Moderadas','Abundantes'] }
    ]
  },
  'LAB-PFH': {
    section: 'Química clínica',
    items: [
      { key: 'ast', name: 'Aspartato aminotransferasa (AST/TGO)', unit: 'U/L', decimals: 0, ref: { min: 0, max: 40 } },
      { key: 'alt', name: 'Alanina aminotransferasa (ALT/TGP)', unit: 'U/L', decimals: 0, ref: { min: 0, max: 41 } },
      { key: 'fosfatasa', name: 'Fosfatasa alcalina', unit: 'U/L', decimals: 0, ref: { min: 40, max: 129 } },
      { key: 'bilirrubinaTotal', name: 'Bilirrubina total', unit: 'mg/dL', decimals: 2, ref: { min: 0.30, max: 1.20 } },
      { key: 'bilirrubinaDirecta', name: 'Bilirrubina directa', unit: 'mg/dL', decimals: 2, ref: { min: 0.00, max: 0.30 } },
      { key: 'albumina', name: 'Albúmina', unit: 'g/dL', decimals: 1, ref: { min: 3.5, max: 5.2 } },
      { key: 'ggt', name: 'Gamma glutamil transferasa (GGT)', unit: 'U/L', decimals: 0, ref: { F: { min: 6, max: 42 }, M: { min: 10, max: 71 } } }
    ]
  },
  'LAB-ES': {
    section: 'Química clínica',
    items: [
      { key: 'sodio', name: 'Sodio', unit: 'mmol/L', decimals: 1, ref: { min: 136.0, max: 145.0 } },
      { key: 'potasio', name: 'Potasio', unit: 'mmol/L', decimals: 2, ref: { min: 3.50, max: 5.10 } },
      { key: 'cloro', name: 'Cloro', unit: 'mmol/L', decimals: 1, ref: { min: 98.0, max: 107.0 } },
      { key: 'calcio', name: 'Calcio', unit: 'mg/dL', decimals: 1, ref: { min: 8.6, max: 10.2 } }
    ]
  },
  'LAB-TC': {
    section: 'Coagulación',
    items: [
      { key: 'tp', name: 'Tiempo de protrombina (TP)', unit: 's', decimals: 1, ref: { min: 11.0, max: 13.5 } },
      { key: 'inr', name: 'INR', unit: '', decimals: 2, ref: { min: 0.80, max: 1.20 } },
      { key: 'ttpa', name: 'Tiempo de tromboplastina parcial activada (TTPa)', unit: 's', decimals: 1, ref: { min: 25.0, max: 35.0 } }
    ]
  },
  'LAB-UC': {
    section: 'Microbiología',
    items: [
      { key: 'desarrollo', name: 'Desarrollo bacteriano', type: 'text', normal: 'Sin desarrollo', options: ['Sin desarrollo','Con desarrollo'] },
      { key: 'microorganismo', name: 'Microorganismo aislado', type: 'text', optional: true },
      { key: 'ufc', name: 'Cuenta de colonias (UFC/mL)', type: 'text', optional: true }
    ]
  },
  'LAB-HCG': {
    section: 'Inmunología',
    items: [
      { key: 'hcg', name: 'Gonadotropina coriónica humana (hCG)', unit: 'mUI/mL', decimals: 1, ref: { min: 0.0, max: 5.0 } }
    ]
  }
};

/**
 * Obtiene el rango de referencia para un ítem y sexo.
 * @param {Object} item - El ítem del análisis
 * @param {string} sexo - Sexo del paciente ('Femenino', 'Masculino', u otro)
 * @returns {{ min: number, max: number } | null}
 */
export function refFor(item, sexo) {
  if (item.type === 'text') return null;
  const sexKey = SEX[sexo];
  if (!sexKey) {
    // Si el sexo no es F o M, devolver el rango combinado
    return {
      min: Math.min(item.ref.F?.min ?? item.ref.min, item.ref.M?.min ?? item.ref.min),
      max: Math.max(item.ref.F?.max ?? item.ref.max, item.ref.M?.max ?? item.ref.max)
    };
  }
  return item.ref[sexKey] || item.ref;
}

/**
 * Formatea el rango de referencia para mostrarlo.
 * @param {Object} item - El ítem del análisis
 * @param {string} sexo - Sexo del paciente ('Femenino', 'Masculino', u otro)
 * @returns {string}
 */
export function formatRef(item, sexo) {
  if (item.type === 'text') return item.normal ? item.normal : '';
  const r = refFor(item, sexo);
  if (!r) return '';
  return `${r.min.toFixed(item.decimals)} - ${r.max.toFixed(item.decimals)}`;
}

/**
 * Parsea un valor de entrada según el tipo del ítem.
 * @param {Object} item - El ítem del análisis
 * @param {string} raw - Valor en bruto como string
 * @returns {number | string}
 */
export function parseValue(item, raw) {
  if (item.type === 'text') return raw.trim();
  const clean = raw.replace(',', '.').trim();
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return NaN;
  return Number(clean);
}

/**
 * Determina si un valor es alto, bajo o anormal.
 * @param {Object} item - El ítem del análisis
 * @param {number} value - Valor numérico
 * @param {string} sexo - Sexo del paciente ('Femenino', 'Masculino', u otro)
 * @returns {'alto' | 'bajo' | 'anormal' | null}
 */
export function flagFor(item, value, sexo) {
  if (item.type === 'text') {
    if (!item.normal) return null;
    const trimmedValue = value.trim().toLowerCase();
    const normalTrimmed = item.normal.trim().toLowerCase();
    if (trimmedValue !== normalTrimmed) return 'anormal';
    return null;
  }
  const r = refFor(item, sexo);
  if (!r) return null;
  if (value > r.max) return 'alto';
  if (value < r.min) return 'bajo';
  return null;
}

export const FLAG_LABEL = { alto: 'Alto', bajo: 'Bajo', anormal: 'Anormal' };
export const FLAG_MARK = { alto: '*A', bajo: '*B', anormal: '*' };

/**
 * Valida los resultados de un estudio de laboratorio.
 * @param {string} studyCode - Código del estudio
 * @param {Object} values - Valores ingresados por el usuario
 * @param {string} sexo - Sexo del paciente ('Femenino', 'Masculino', u otro)
 * @returns {{ ok: boolean, results?: Array, errors?: Array }}
 */
export function validateLabResults(studyCode, values, sexo) {
  if (!ANALYTES[studyCode]) {
    return { ok: false, errors: ['El estudio no tiene analitos configurados.'] };
  }

  const study = ANALYTES[studyCode];
  const results = [];
  const errors = [];

  for (const item of study.items) {
    const raw = values[item.key];
    const text = typeof raw === 'string' ? raw.trim() : (raw == null ? '' : String(raw).trim());
    if (text === '') { if (!item.optional) errors.push(`Falta el valor de ${item.name}.`); continue; }
    if (item.type === 'text') {
      if (text.length > 200) { errors.push(`${item.name}: máximo 200 caracteres.`); continue; }
      let value = text;
      if (item.options) {
        const match = item.options.find(o => o.toLowerCase() === text.toLowerCase());
        if (!match) { errors.push(`${item.name}: valor no permitido.`); continue; }
        value = match; // forma canónica
      }
      results.push({ key: item.key, name: item.name, value, unit: item.unit || '', ref: formatRef(item, sexo), flag: flagFor(item, value, sexo) });
    } else {
      const n = parseValue(item, text);
      if (Number.isNaN(n)) { errors.push(`${item.name}: valor numérico no válido.`); continue; }
      if (n < 0) { errors.push(`${item.name}: no puede ser negativo.`); continue; }
      const value = Number(n.toFixed(item.decimals));
      results.push({ key: item.key, name: item.name, value, unit: item.unit || '', ref: formatRef(item, sexo), flag: flagFor(item, value, sexo) });
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, results };
}

/**
 * Verifica si un código corresponde a un estudio de laboratorio.
 * @param {string} studyCode - Código del estudio
 * @returns {boolean}
 */
export function isLabStudy(studyCode) {
  return studyCode in ANALYTES;
}

/** Valor para mostrar con los decimales del analito (0.4 → '0.40'); los textos se devuelven tal cual. */
export function formatValue(studyCode, result) {
  const item = ANALYTES[studyCode]?.items.find(i => i.key === result.key);
  return typeof result.value === 'number' && item?.decimals != null ? result.value.toFixed(item.decimals) : String(result.value ?? '');
}
