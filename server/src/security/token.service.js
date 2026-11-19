import jwt from 'jsonwebtoken';

export const SESION_HORAS = 8;

/** TokenService: firma y verifica JWT con vencimiento de 8 horas (HU-02). */
export function createTokenService({ secret }) {
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  return {
    firmar: payload => jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: `${SESION_HORAS}h` }),
    verificar: token => jwt.verify(token, secret, { algorithms: ['HS256'] }),
  };
}
