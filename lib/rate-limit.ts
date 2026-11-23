/** Rate limiter en memoria por clave (p. ej. IP del login). */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Devuelve true si la petición entra en el límite, false si lo excede.
 * En serverless el estado es por instancia; suficiente como freno de fuerza
 * bruta para una demo (spec de seguridad: 5 intentos/minuto por IP).
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Limpieza ocasional para no crecer sin límite. */
export function pruneRateLimits(maxAgeMs = 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt + maxAgeMs < now) buckets.delete(key);
  }
}

/** Reinicia el contador de una clave (p. ej. tras un login correcto). */
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}
