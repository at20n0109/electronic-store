# Security baseline

This application is aligned to OWASP Top 10:2025 and uses OWASP ASVS 5.0 as the verification baseline. It does not claim that a code review alone proves complete coverage.

## Controls in the application

- Catalog writes require an authenticated `STAFF` or `ADMIN` role; customer cart and order reads are scoped to the authenticated user.
- Prisma's typed query API and DTO allowlists protect database inputs. No XML parser or object deserializer is present; do not add either without a dedicated security review.
- Passwords use Argon2id. Access and refresh tokens are stored only in `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookies. Refresh tokens are random, hashed at rest, rotated, and revoked on use.
- Authentication responses return only the user profile, never access or refresh tokens. Cookie-authenticated writes require a constant-time double-submit CSRF token.
- Production startup requires a strong JWT secret, database URL, and explicit CORS origin allowlist. API and web responses use restrictive security headers; TLS termination must redirect HTTP to HTTPS.
- Errors log request method, URL, status, and stack server-side without sending internal exception details to clients. Do not log passwords, tokens, cookies, addresses, or payment data.

## Operations required before production

1. Set production environment variables from a managed secret store; rotate the JWT secret and database credentials if they were ever committed or shared.
2. Put the app behind a TLS-terminating reverse proxy, enforce HTTPS, set `NODE_ENV=production`, and set `CORS_ORIGIN` to exact HTTPS browser origins.
3. Use a managed PostgreSQL service with TLS, encryption at rest, least-privilege application credentials, tested backups, and network allowlists. Do not store card data; use a PCI-compliant payment provider's hosted/tokenized flow.
4. Send structured application logs to a protected, centralized service. Alert on repeated failed logins, CSRF failures, privilege changes, token reuse, order failures, and unexpected 5xx bursts. Set retention and access controls appropriate to local privacy law.
5. Add an edge rate limit/WAF for login, registration, password recovery, checkout, and all API routes. Use a shared store (not in-process memory) if application instances scale horizontally.
6. Run `npm audit --omit=dev` in both packages, pin lockfiles, enable automated dependency updates, produce an SBOM, and gate releases on SCA/SAST, tests, and a reviewed deployment artifact.
7. Perform authenticated DAST and a manual authorization test before release. Specifically test cross-account cart/order access, staff/admin mutation endpoints, CSRF, token rotation/reuse, malformed input, and production headers.

## Secure coding rules

- Validate allowlisted DTOs at every boundary; cap string, array, pagination, and upload sizes. Use `ParseUUIDPipe` or validated DTO fields for new identifier routes.
- Keep using parameterized Prisma APIs; do not concatenate SQL, shell commands, HTML, URLs, or redirect targets with request data. Raw SQL needs a security review.
- React escapes text by default. Never introduce `dangerouslySetInnerHTML`; if rich text is essential, sanitize it server-side with a reviewed allowlist and retain contextual output encoding.
- Restrict uploaded content by size, MIME signature, extension, and storage isolation; malware-scan it and serve it from a separate domain with `Content-Disposition: attachment` where applicable.
- Review any webhook, XML, serialization, or URL-fetch feature before adding it. Disable external entity expansion, use strict schemas, verify signed webhooks before parsing business data, and block private/reserved network destinations for any outbound fetch.
