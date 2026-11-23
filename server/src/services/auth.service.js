import { HttpError } from '../errors.js';

// Hash Argon2id válido que no corresponde a ninguna contraseña real. Se verifica contra él cuando
// el usuario no existe, para que la respuesta tarde lo mismo y no revele qué usuarios existen.
const HASH_SEÑUELO = '$argon2id$v=19$m=19456,t=2,p=1$5mbW6nx8gmgPyROTVC1brA$BTzFH/RRMmA9f5njKl21bLj7QkUPzJC/gnNTXkUL3aw';

/** AuthService: valida credenciales con UsuarioRepository y PasswordHasher, y emite JWT (HU-02). */
export function createAuthService({ usuarios, hasher, tokens }) {
  return {
    async login(identificador, password) {
      const usuario = await usuarios.buscarPorLogin(String(identificador ?? '').trim());
      const coincide = await hasher.verify(usuario?.hash ?? HASH_SEÑUELO, String(password ?? ''));
      // Mismo error para usuario inexistente, contraseña incorrecta o usuario dado de baja.
      if (!usuario || !usuario.activo || !coincide) throw new HttpError(401, 'Credenciales inválidas');
      const token = tokens.firmar({ sub: usuario.id, role: usuario.role, username: usuario.username });
      return { token, usuario: { id: usuario.id, username: usuario.username, role: usuario.role } };
    },
  };
}
