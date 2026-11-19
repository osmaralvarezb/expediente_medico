/** LoginRateLimiter: máximo 5 intentos de login por minuto por IP; el sexto responde 429 (HU-02). */
export function loginRateLimiter({ max = 5, windowMs = 60_000 } = {}) {
  const intentos = new Map(); // ip -> { inicio, cuenta }
  return (req, res, next) => {
    const ahora = Date.now();
    const reg = intentos.get(req.ip);
    if (!reg || ahora - reg.inicio >= windowMs) {
      intentos.set(req.ip, { inicio: ahora, cuenta: 1 });
      return next();
    }
    reg.cuenta += 1;
    if (reg.cuenta > max) {
      res.set('Retry-After', String(Math.ceil((reg.inicio + windowMs - ahora) / 1000)));
      return res.status(429).json({ error: 'Demasiados intentos. Espere un minuto.' });
    }
    next();
  };
}
