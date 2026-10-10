/**
 * CORS origin allowlist parsing.
 *
 * Origins are matched as exact strings. A `RegExp` built from configuration is
 * deliberately not used: it would put operator-supplied pattern syntax into the
 * request path (a ReDoS surface) and would silently widen the allowed set for
 * every deployment that only needed one origin.
 */

export interface CorsConfig {
  origins: Set<string>;
  /** Non-null when a wildcard was rejected, so the caller can fail fast. */
  error: string | null;
}

/** Splits a comma-separated CORS_ORIGIN value into trimmed, non-empty origins. */
export function splitOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** True when the value looks like a pattern rather than a concrete origin. */
export function isWildcardOrigin(origin: string): boolean {
  return origin.includes('*');
}

export function parseCorsOrigins(raw: string | undefined): CorsConfig {
  const origins = splitOrigins(raw).filter((origin) => !isWildcardOrigin(origin));
  const rejected = splitOrigins(raw).find((origin) => isWildcardOrigin(origin));

  return {
    origins: new Set(origins),
    error: rejected
      ? `CORS_ORIGIN must list exact origins, not patterns: "${rejected}". ` +
        'Example: CORS_ORIGIN=https://pcstore.example.com,https://www.pcstore.example.com'
      : null,
  };
}
