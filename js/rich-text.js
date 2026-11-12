/**
 * Etiquetas permitidas en el HTML de notas clínicas.
 */
export const ALLOWED_TAGS = ['b', 'strong', 'ul', 'li', 'br', 'p', 'div'];

const TAG_RE = /^<\s*(\/?)\s*([a-z][a-z0-9]*)\b[^<>]*>$/i;   // a tag must start with a letter
const DROP_CONTENT = ['script', 'style', 'iframe', 'object', 'template'];
const escapeText = s => s
  .replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z]+);)/gi, '&amp;')  // bare & only; existing entities untouched
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Elimina etiquetas y atributos no seguros del HTML de una nota clínica.
 * @param {string} html - El HTML a sanitizar.
 * @returns {string} - El HTML sanitizado.
 */
export function sanitizeNoteHtml(html) {
  let out = '', skipUntil = null;
  for (const token of String(html ?? '').split(/(<[^>]*>)/)) {
    if (!token) continue;
    if (token.startsWith('<!')) continue;                     // comments / doctype
    const m = TAG_RE.exec(token);
    if (m) {
      const closing = m[1] === '/', tag = m[2].toLowerCase();
      if (skipUntil) { if (closing && tag === skipUntil) skipUntil = null; continue; }
      if (DROP_CONTENT.includes(tag)) { if (!closing) skipUntil = tag; continue; }
      if (!ALLOWED_TAGS.includes(tag)) continue;               // disallowed tag: drop tag, keep its text
      const name = tag === 'strong' ? 'b' : tag;
      if (name === 'br') { if (!closing) out += '<br>'; continue; }
      out += closing ? `</${name}>` : `<${name}>`;
    } else {
      if (skipUntil) continue;
      out += escapeText(token);                                // text, including things like "< 7 & 8 >" or an unclosed "<b onmouseover=..."
    }
  }
  return out.trim();
}

/**
 * Convierte HTML de nota clínica a texto plano.
 * @param {string} html - El HTML a convertir.
 * @returns {string} - El texto plano.
 */
export function noteHtmlToText(html) {
  const sanitized = sanitizeNoteHtml(html);
  let text = sanitized
    .replace(/<li>/g, '• ')
    .replace(/<\/li>/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<ul>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Decodificar entidades numéricas
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCodePoint(dec));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCodePoint(parseInt(hex, 16)));

  // Limpiar líneas vacías y colapsar múltiples nuevas líneas
  const lines = text.split('\n');
  for (let j = 0; j < lines.length; j++) {
    lines[j] = lines[j].replace(/\s+$/, '');
  }
  let finalText = lines.join('\n');
  finalText = finalText.replace(/\n{3,}/g, '\n\n');

  return finalText.trim();
}

/**
 * Verifica si el HTML de una nota clínica está vacío.
 * @param {string} html - El HTML a verificar.
 * @returns {boolean} - Verdadero si la nota está vacía.
 */
export const isBlankNoteHtml = html => noteHtmlToText(html).replace(/•/g, '').trim() === '';

/**
 * Límite máximo de caracteres en texto plano de nota clínica.
 */
export const MAX_NOTE_TEXT = 8000;
