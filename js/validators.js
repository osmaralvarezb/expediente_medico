// Validaciones de dominio puras (sin DOM) para poder probarlas con Node.

// Claves de entidad federativa válidas en la posición 12-13 de la CURP (RENAPO). NE = nacido en el extranjero.
const ESTADOS = new Set(['AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG', 'GT', 'GR', 'HG', 'JC', 'MC', 'MN', 'MS', 'NT', 'NL', 'OC', 'PL', 'QT', 'QR', 'SP', 'SL', 'SR', 'TC', 'TS', 'TL', 'VZ', 'YN', 'ZS', 'NE']);
const CURP_RE = /^([A-Z][AEIOUX][A-Z]{2})(\d{2})(\d{2})(\d{2})([HM])([A-Z]{2})([B-DF-HJ-NP-TV-Z]{3})([A-Z\d])(\d)$/;

/**
 * Valida una CURP: estructura, fecha de nacimiento real, sexo y clave de estado.
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateCurp(raw) {
  const curp = String(raw ?? '').trim().toUpperCase();
  if (curp.length !== 18) return { ok: false, error: 'La CURP debe tener 18 caracteres.' };
  const m = CURP_RE.exec(curp);
  if (!m) return { ok: false, error: 'La CURP no tiene un formato válido.' };
  const [, , yy, mm, dd, , estado] = m;
  // El carácter 17 distingue el siglo: dígito = 1900-1999, letra = 2000 en adelante.
  const year = (/\d/.test(curp[16]) ? 1900 : 2000) + Number(yy);
  const date = new Date(Date.UTC(year, Number(mm) - 1, Number(dd)));
  if (date.getUTCMonth() !== Number(mm) - 1 || date.getUTCDate() !== Number(dd)) return { ok: false, error: 'La fecha de nacimiento contenida en la CURP no existe.' };
  if (!ESTADOS.has(estado)) return { ok: false, error: `La clave de entidad "${estado}" de la CURP no es válida.` };
  return { ok: true };
}

/** Fecha de nacimiento (AAAA-MM-DD) codificada en una CURP válida. */
export function curpBirthDate(curp) {
  const c = curp.toUpperCase();
  const year = (/\d/.test(c[16]) ? 1900 : 2000) + Number(c.slice(4, 6));
  return `${year}-${c.slice(6, 8)}-${c.slice(8, 10)}`;
}

/**
 * Campos obligatorios de una nota clínica (NOM-004-SSA3-2012, 6.2 nota de evolución).
 * Quien firma (adscrito/residente) además debe registrar diagnóstico y plan.
 * @returns {string[]} etiquetas de los campos faltantes
 */
export function missingNoteFields(note, { requireDiagnosis }) {
  const v = note.vitals ?? {};
  const req = [
    ['Signos vitales: TA', v.ta], ['Signos vitales: FC', v.fc], ['Signos vitales: FR', v.fr], ['Signos vitales: temperatura', v.temp],
    ['Padecimiento / subjetivo', note.subjetivo], ['Exploración física', note.exploracion],
    ...(requireDiagnosis ? [['Diagnóstico', note.dx], ['Plan terapéutico', note.plan]] : []),
  ];
  return req.filter(([, val]) => !String(val ?? '').trim()).map(([label]) => label);
}
