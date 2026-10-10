# Security baseline

This application is aligned to OWASP Top 10:2025 and uses OWASP ASVS 5.0 as the verification baseline. It does not claim that a code review alone proves complete coverage.

## Controls in the application

- **Authentication is default-deny.** `PublicGuard` and `JwtGuard` are registered globally as `APP_GUARD` in `src/core/core.module.ts`. Every route requires a valid token unless it is explicitly tagged `@Public()`. A new controller is protected without anyone remembering to add a guard.
- `JwtGuard` reads role and `isActive` from the database on each request, so a disabled account or a role change takes effect immediately rather than at token expiry.
- Passwords use **scrypt** (`N=16384, r=8, p=1`, 16-byte random salt) and are compared with `timingSafeEqual`. Refresh tokens are 48 random bytes; only a SHA-256 hash is stored. They are rotated on use and revoked on logout. Tokens live only in `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookies.
- Registration does not reveal whether an email is taken, and `POST /auth/refresh` reads the token only from the cookie — never from the body.
- Social login only links an existing account when the provider has verified the email address (`emailVerified === true`); Facebook's `/me` email is treated as unverified.
- Login, registration, OTP send/verify and refresh are throttled per IP/user by `RateLimitGuard`. This is in-process and best-effort: an edge limiter or shared store is still required at scale.
- Prisma's typed query API and DTO allowlists protect database inputs. No XML parser or object deserializer is present; do not add either without a dedicated security review.
- Authentication responses return only the user profile, never access or refresh tokens. Cookie-authenticated writes require a constant-time double-submit CSRF token (`CsrfGuard`, registered globally).
- Order receiver name/phone/address and ATM transfer payloads are encrypted with AES-256-GCM using a per-call random IV (`enc:v1:iv:tag:ct`). Decryption enforces a 12-byte IV and a 16-byte authentication tag before Node sees them, so a truncated or forged tag cannot be accepted. Tampered or wrong-key ciphertext throws instead of being returned as plaintext.
- Test suites never contain key material: HMAC fixtures are self-describing `TEST-ONLY-…` placeholders, and `ENCRYPTION_KEY` is generated per test with `randomBytes`. `.env` is git-ignored; the encryption key belongs only there.
- CORS is an exact-match origin allowlist (`src/common/cors.ts`). Wildcard entries are rejected at startup and origins are compared as plain strings — no `RegExp` is built from configuration, which removes a ReDoS surface and prevents pattern syntax from widening the allowed set.
- Payment settlement happens only on a verified provider callback. VNPay/MoMo IPNs and ZaloPay/Stripe webhooks verify their HMAC signature first; if a provider is not configured the verification path fails closed and returns 97/`received:false`. The `mock` and `atm-mock` providers self-report success and are gated behind `ALLOW_MOCK_PAYMENT=1` plus a non-production `NODE_ENV`.
- `createCheckout` never marks an order `PAID` from a provider-reported status; only `markPaid`/`markPaidForOrder` (post-signature-verification) can settle an order. ATM confirmation compares the recorded transfer amount against the authoritative order total before settling.
- Raw request bodies are captured (`NestFactory.create(AppModule, { rawBody: true })`) so webhook signature verification actually runs; without it verification silently no-ops.
- `vnpay/ipn` accepts POST only. All-ID routes use `ParseUUIDPipe` or `@IsUUID()`, so a malformed ID is a 400 rather than a 500 with a stack trace.
- Production startup requires a strong JWT secret, a 32-byte `ENCRYPTION_KEY`, a database URL, a `CORS_ORIGIN` allowlist of exact origins (wildcards rejected), and `BANK_TRANSFER_INFO`. No bank account details are hardcoded in source.
- API and web responses use restrictive security headers and a per-request nonce CSP without `script-src 'unsafe-inline'`; TLS termination must redirect HTTP to HTTPS.
- The frontend stores no token in `localStorage`; the session lives in the HttpOnly cookie only. Redirect targets returned by the API are validated against a same-origin or allowlisted-host rule before the browser is navigated.
- Errors log method, path (never the query string) and status server-side, and reach the client as a generic message — only validation arrays are forwarded verbatim. Do not log passwords, tokens, cookies, addresses or payment data.

## Operations required before production

1. Set production environment variables from a managed secret store; rotate the JWT secret and database credentials if they were ever committed or shared.
2. Put the app behind a TLS-terminating reverse proxy, enforce HTTPS, set `NODE_ENV=production`, and set `CORS_ORIGIN` to exact HTTPS browser origins.
3. Use a managed PostgreSQL service with TLS, encryption at rest, least-privilege application credentials, tested backups and network allowlists. Do not store card data; use a PCI-compliant payment provider's hosted/tokenized flow. Do not set `ALLOW_MOCK_PAYMENT`.
4. Send structured application logs to a protected, centralized service. Alert on repeated failed logins, CSRF failures, privilege changes, token reuse, order failures and unexpected 5xx bursts. Set retention and access controls appropriate to local privacy law.
5. The `RateLimitGuard` is in-process. Add an edge rate limit/WAF for login, registration, password recovery, checkout and all API routes; use a shared store (not in-process memory) if application instances scale horizontally.
6. Run `npm audit --omit=dev` in both packages, pin lockfiles, enable automated dependency updates, produce an SBOM, and gate releases on SCA/SAST, tests and a reviewed deployment artifact.
7. Perform authenticated DAST and a manual authorization test before release. Specifically test cross-account cart/order access, staff/admin mutation endpoints, CSRF, token rotation/reuse, malformed input, and production headers.

## Secure coding rules

- Validate allowlisted DTOs at every boundary; cap string, array, pagination and upload sizes. Use `ParseUUIDPipe` or validated DTO fields for new identifier routes.
- Keep using parameterized Prisma APIs; do not concatenate SQL, shell commands, HTML, URLs or redirect targets with request data. Raw SQL needs a security review.
- Never add a payment callback, webhook or provider method whose signature verification has a `true` fallback. Verification must be mandatory and fail closed.
- Never derive a settled/paid state from a status the payment provider reports about itself. Only a verified callback may move money.
- Do not send a client-supplied amount into any settlement path. The order total is the server's to decide; a client-editable price is a price-tampering hole.
- Do not add a presigned object URL that takes an arbitrary key without an authorization check.
- React escapes text by default. Never introduce `dangerouslySetInnerHTML`; if rich text is essential, sanitize it server-side with a reviewed allowlist and retain contextual output encoding.
- Restrict uploaded content by size, MIME signature, extension and storage isolation; malware-scan it and serve it from a separate domain with `Content-Disposition: attachment` where applicable.
- Review any webhook, XML, serialization or URL-fetch feature before adding it. Disable external entity expansion, use strict schemas, verify signed webhooks before parsing business data, and block private/reserved network destinations for any outbound fetch.
