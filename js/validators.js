// Validaciones de dominio puras (sin DOM) para poder probarlas con Node.
import { isBlankNoteHtml, noteHtmlToText, MAX_NOTE_TEXT } from './rich-text.js';

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
 * Campos obligatorios de una nota clínica: signos vitales básicos y el texto libre de la nota
 * (editor con negritas y viñetas, que sustituye a los campos separados de padecimiento, exploración, diagnóstico y plan).
 * @returns {string[]} etiquetas de los campos faltantes o inválidos
 */
export function missingNoteFields(note) {
  const v = note.vitals ?? {};
  const missing = [['Signos vitales: TA', v.ta], ['Signos vitales: FC', v.fc], ['Signos vitales: FR', v.fr], ['Signos vitales: temperatura', v.temp]]
    .filter(([, val]) => !String(val ?? '').trim()).map(([label]) => label);
  if (isBlankNoteHtml(note.contenido)) missing.push('Contenido de la nota');
  else if (noteHtmlToText(note.contenido).length > MAX_NOTE_TEXT) missing.push(`Contenido de la nota (máximo ${MAX_NOTE_TEXT} caracteres)`);
  return missing;
}
