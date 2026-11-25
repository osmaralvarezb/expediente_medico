/**
 * CryptoService: cifrado en reposo de datos clínicos con AES-256-GCM (HU-04 · SCRUM-7).
 * Sprint 2 · fase roja: las pruebas de crypto.service.test.js se escribieron antes del código.
 * Formato esperado del texto cifrado: base64(iv) . base64(tag) . base64(cifrado)
 */
export function createCryptoService({ key } = {}) {
  return {
    cifrar(texto) {
      throw new Error('No implementado');
    },
    descifrar(cifrado) {
      throw new Error('No implementado');
    },
  };
}
