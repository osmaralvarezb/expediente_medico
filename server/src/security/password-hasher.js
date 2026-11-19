import { hash, verify } from '@node-rs/argon2';

// Algorithm.Argon2id = 2. Parámetros mínimos recomendados por OWASP (19 MiB, 2 iteraciones).
const OPCIONES = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };

/** PasswordHasher: hash y verificación con Argon2id (HU-02). */
export async function hashPassword(plain) {
  return hash(plain, OPCIONES);
}

export async function verifyPassword(hashGuardado, plain) {
  try {
    return await verify(hashGuardado, plain);
  } catch {
    return false; // hash mal formado: se trata como contraseña incorrecta
  }
}

export const passwordHasher = { hash: hashPassword, verify: verifyPassword };
