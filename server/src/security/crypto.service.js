import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * CryptoService: cifrado en reposo de datos clínicos con AES-256-GCM (HU-04 · SCRUM-7).
 * Formato del texto cifrado: base64(iv) . base64(tag) . base64(cifrado)
 * La clave (DATA_KEY) son 32 bytes, en hexadecimal (64 caracteres) o en base64 (la que genera Render),
 * y vive solo en el entorno (.env / Render).
 */
const ALGORITMO = 'aes-256-gcm';
const BYTES_CLAVE = 32;
const BYTES_IV = 12; // tamaño recomendado para GCM
const SEPARADOR = '.';

function leerClave(key) {
  const texto = String(key ?? '').trim();
  const clave = /^[0-9a-f]{64}$/i.test(texto) ? Buffer.from(texto, 'hex') : Buffer.from(texto, 'base64');
  if (clave.length !== BYTES_CLAVE) throw new Error(`La clave de cifrado debe ser de ${BYTES_CLAVE} bytes (hexadecimal o base64)`);
  return clave;
}

export function createCryptoService({ key } = {}) {
  const clave = leerClave(key);
  return {
    cifrar(texto) {
      const iv = randomBytes(BYTES_IV);
      const cipher = createCipheriv(ALGORITMO, clave, iv);
      const cifrado = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
      return [iv, cipher.getAuthTag(), cifrado].map(b => b.toString('base64')).join(SEPARADOR);
    },
    descifrar(valor) {
      const [iv, tag, cifrado] = String(valor).split(SEPARADOR).map(p => Buffer.from(p ?? '', 'base64'));
      try {
        const decipher = createDecipheriv(ALGORITMO, clave, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString('utf8');
      } catch {
        throw new Error('No se pudo autenticar el dato cifrado: falla de integridad');
      }
    },
  };
}
