// HU-04 (SCRUM-7) · CryptoService AES-256-GCM · Pareja B (Andrés de Anda / Ernesto Morquecho)
// Sprint 2 · TDD: estas pruebas se escribieron antes del código (sesión 6) y pasan a verde en la sesión 7.
import { describe, it, expect } from 'vitest';
import { createCryptoService } from '../src/security/crypto.service.js';

const CLAVE = 'a'.repeat(64); // 32 bytes en hexadecimal, solo para pruebas
const TEXTO = 'Antecedentes: alergia a penicilina';

describe('CryptoService AES-256-GCM (HU-04)', () => {
  // T-26 · Conductor: Andrés · Copiloto: Ernesto
  it('T-26 cifrar devuelve iv.tag.cifrado en base64 sin el texto original', () => {
    const c = createCryptoService({ key: CLAVE }).cifrar(TEXTO);
    expect(c.split('.')).toHaveLength(3);
    expect(c).not.toContain('penicilina');
  });

  // T-27 · Conductor: Ernesto · Copiloto: Andrés
  it('T-27 descifrar(cifrar(texto)) devuelve el texto original', () => {
    const crypto = createCryptoService({ key: CLAVE });
    expect(crypto.descifrar(crypto.cifrar(TEXTO))).toBe(TEXTO);
  });

  // T-28 · Conductor: Andrés · Copiloto: Ernesto
  it('T-28 el mismo texto cifrado dos veces da resultados distintos (IV por registro)', () => {
    const crypto = createCryptoService({ key: CLAVE });
    expect(crypto.cifrar(TEXTO)).not.toBe(crypto.cifrar(TEXTO));
  });

  // T-29 · Conductor: Ernesto · Copiloto: Andrés
  it('T-29 un texto cifrado alterado se rechaza sin devolver datos', () => {
    const crypto = createCryptoService({ key: CLAVE });
    const [iv, tag, datos] = crypto.cifrar(TEXTO).split('.');
    const alterado = [iv, tag, Buffer.from('xxxx' + datos).toString('base64')].join('.');
    expect(() => crypto.descifrar(alterado)).toThrow(/integridad|autenticar/i);
  });

  // T-30 · Conductor: Andrés · Copiloto: Ernesto
  it('T-30 sin una clave de 32 bytes el servicio no se crea', () => {
    expect(() => createCryptoService({ key: '' })).toThrow(/32 bytes/);
  });
});
