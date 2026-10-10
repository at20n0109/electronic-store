# DEPLOY.md — Đưa PC Store lên internet (Vercel Services + Neon + Cloudflare R2)

Kiến trúc đích: **một project duy nhất trên Vercel** chứa 2 service (cùng 1 domain, routing chung),
backend chạy như **1 Vercel Function (NestJS, Fluid compute)** — không còn Render.

```
Browser ── https://<project>.vercel.app ───────────────────────────────┐
            │  /api/(.*)  → rewrite → service "backend" (NestJS Function)
            │  /(.*)      → rewrite → service "frontend" (Next.js)
            │  (server) frontend → service "backend" qua binding BACKEND_URL
            ▼
  Vercel service "backend" ── Neon (Postgres)
            │
            ├─ Cloudflare R2 (S3-compatible: ảnh + PDF invoice)
            └─ PayPal Orders v2 (sandbox)
```

Same-origin là bắt buộc: auth dùng httpOnly cookie (`access_token`, `refresh_token`, `csrf_token`,
SameSite=Lax, không Domain) nên trình duyệt luôn gọi `/api/*` trên cùng tên miền với frontend.
Với services, toàn bộ app nằm dưới 1 domain ⇒ không cần CORS giữa các service.

`vercel.json` ở **repo root** (cấu hình services):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "frontend": {
      "root": "frontend",
      "framework": "nextjs",
      "bindings": [
        { "type": "service", "service": "backend", "format": "url", "env": "BACKEND_URL" }
      ]
    },
    "backend": { "root": "backend" }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
```

- `frontend` là service công khai theo rewrite `/(.*)`; `backend` **internal** (chỉ gọi được qua rewrite `/api/(.*)`
  hoặc qua binding, không có URL public riêng).
- `BACKEND_URL` do Vercel sinh ra và inject vào frontend **lúc runtime** (functions), KHÔNG được tự đặt.
  Nó không resolve ở build và không có trong middleware ⇒ frontend `app/page.tsx` đánh `export const dynamic='force-dynamic'`
  và `proxy.ts` tắt bằng `NEXT_PUBLIC_DISABLE_PROXY=true`.
- Backend là NestJS chuẩn (`src/main.ts`, giữ `bootstrap()`/`app.listen()`) — Vercel tự nhận diện, đóng gói thành 1 Function
  trên Fluid compute. Không cần serverless-http, không cần Docker.

---

## 0. Chuẩn bị tài khoản

| Dịch vụ | URL | Cần làm |
|---|---|---|
| Neon | https://neon.tech | Project (pooled connection string) |
| Vercel | https://vercel.com | `vercel login` (CLI) hoặc import GitHub |
| Cloudflare R2 | https://dash.cloudflare.com | Bucket + API token (S3) |
| PayPal Developer | https://developer.paypal.com | Sandbox app + buyer |

---

## 1. Neon — Postgres

1. Lấy **pooled** connection string (`-pooler.neon.tech`, `?sslmode=require`).
2. Apply migration + seed (chạy từ máy local trong `backend/`):
   ```pwsh
   $env:DATABASE_URL="postgresql://USER:PASS@ep-xxx-pooler.neon.tech/neondb?sslmode=require"
   npx prisma migrate deploy
   npx prisma db seed
   ```
   Vercel **không tự chạy migration**. Mỗi khi schema đổi: `npx prisma migrate deploy --prod` rồi mới deploy.
3. (Tuỳ chọn) Tạo admin upload ảnh: đăng ký bằng web rồi Dashboard Neon → SQL Editor:
   `UPDATE "User" SET role='ADMIN' WHERE email='ban@ex.com';`

> Seed không tạo ảnh sản phẩm (DB `ProductImage` rỗng) — ảnh hiển thị là static trong `frontend/public`;
> upload ảnh thật cần phần R2 bên dưới.

---

## 2. Cloudflare R2 — object storage (bắt buộc: backend fail nếu thiếu S3_*)

`UploadsService` dùng `getOrThrow(S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY / S3_ENDPOINT)`
→ không cấu hình R2 là backend **crash lúc boot**.

1. R2 → bucket `electronic-store` (đã tạo).
2. R2 → **Manage R2 API Tokens** → Create token (Object Read & Write) → copy `S3_ACCESS_KEY`, `S3_SECRET_KEY`.
3. **Public URL** cho ảnh admin upload: Settings → bật **Public access** → domain `https://pub-<hash>.r2.dev`
   → env `S3_PUBLIC_URL` (không trailing slash). **Không bắt buộc**: ảnh upload được phục vụ qua API
   (`GET /api/v1/uploads/images/:id`) nên không cần bucket public (PDF download luôn OK qua API).
   Bật public chỉ cần thiết nếu muốn đọc trực tiếp từ R2.
4. **CORS**: **không cần** cho upload ảnh — browser POST bytes vào API của chính app (same-origin),
   không PUT cross-origin lên bucket. Cần CORS chỉ nếu sau này đổi sang presigned PUT trực tiếp.
   CORS cho API (backend) vẫn cấu hình bình thường qua `CORS_ORIGIN`.
5. `S3_REGION=auto`, `S3_ACL` **để trống** (R2 không hỗ trợ ACL), `S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com`.

---

## 3. Vercel — project services (frontend + backend)

1. `vercel login` rồi import repo (hoặc `vercel --prod` từ repo root). **Root Directory = repo root** (không phải `frontend`).
2. Vercel đọc `vercel.json` gốc → build 2 service. Frontend Next.js ↔ Backend NestJS.
3. Đặt **project environment variables** (áp cho cả 2 service) trước lần deploy đầu:

   | Key | Giá trị |
   |---|---|
   | NODE_ENV | `production` |
   | DATABASE_URL | Neon **pooled** URL |
   | CORS_ORIGIN | `https://<project>.vercel.app` (giờ là same-origin, giữ để NODE_ENV=production không throw) |
   | JWT_ACCESS_SECRET | random ≥32 ký tự — `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
   | JWT_ACCESS_TTL | `900` |
   | JWT_REFRESH_TTL | `604800` |
   | JWT_ISSUER | `pc-store-api` |
   | JWT_AUDIENCE | `pc-store-web` |
   | ENCRYPTION_KEY | base64 32 bytes — **giữ đúng key đã dùng**, xoay key = mất dữ liệu mã hoá cũ |
   | S3_ENDPOINT | `https://<accountid>.r2.cloudflarestorage.com` |
   | S3_ACCESS_KEY / S3_SECRET_KEY | R2 token (Object Read & Write) |
   | S3_BUCKET | `electronic-store` |
   | S3_REGION | `auto` |
   | S3_ACL | *(để trống)* |
    | S3_PUBLIC_URL | *tuỳ chọn* — bỏ trống được; ảnh upload phục vụ qua `/api/v1/uploads/images/:id` |
   | PAYMENT_PROVIDER | `mock` (default khi request không nêu `provider`; frontend gọi `GET /api/v1/payments/methods` để user chọn) |
   | PAYPAL_CLIENT_ID / PAYPAL_SECRET | từ PayPal sandbox app (mục 4) — có thì PayPal hiện trong danh sách trả tiền |
   | PAYPAL_MODE | `sandbox` |
   | PAYPAL_RETURN_URL | `https://<project>.vercel.app/api/v1/payments/paypal/return` |
   | PAYPAL_CANCEL_URL | `https://<project>.vercel.app/checkout` |
   | PAYPAL_CURRENCY | `USD` |
   | PAYPAL_USD_RATE | `25000` (VND → USD) |
   | MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY | từ triển khai MoMo merchant (business.momo.vn) — set là MoMo hiện trong danh sách trả tiền |
   | MOMO_MODE | `sandbox` |
   | MOMO_REQUEST_TYPE | `captureWallet` |
   | MOMO_REDIRECT_URL | `https://<project>.vercel.app/api/v1/payments/momo/return` |
   | MOMO_IPN_URL | `https://<project>.vercel.app/api/v1/payments/webhook` |
   | NEXT_PUBLIC_APP_URL | `https://<project>.vercel.app` (QR xác minh hoá đơn) |
   | NEXT_PUBLIC_DISABLE_PROXY | `true` (tắt `proxy.ts`) |
   | NEXT_PUBLIC_API_URL | *(để trống)* → relative `/api` → rewrite |

   **KHÔNG được đặt** `BACKEND_URL` (binding sinh ra). `PAYPAL_RETURN_URL` / `CORS_ORIGIN` /
   `NEXT_PUBLIC_APP_URL` trỏ domain thật — biết domain sau lần deploy đầu ⇒ deploy 2 lần (lần 1 lấy domain, set env, lần 2 hoàn chỉnh).

4. Deploy. Domain: `https://<project>.vercel.app`. Frontend gọi backend qua rewrite; server components
   dùng binding `BACKEND_URL` cho home (ƒ dynamic) và `/invoice/:id`, `/san-pham`.

> Lưu ý build backend: `buildCommand` = `npm run build -s && npx prisma generate && npm run build:vercel -s`;
> `build:vercel` (`scripts/vercel-build.cjs`) bundle toàn bộ `dist/bootstrap.js` thành **một file `server.cjs`** (ESM→CJS,
> inline hết node_modules nên Function tự chứa, không cần package từng dep; chỉ giữ `pdfkit` external — cần font file thật).
> Service config dùng `"runtime": "node"`, `"entrypoint": "server.cjs"` (extension `.cjs` = chắc chắn load CJS).
> `src/main.ts` đã đổi tên `src/bootstrap.ts` vì tên `main.ts` nằm trong danh sách detection của Vercel và bị ưu tiên lấy làm entrypoint.
> Password hash dùng Node `crypto.scryptSync` (không còn `argon2` — tránh native module/install-scripts trên npm mới);
> `package.json` có `trustedDependencies` để npm cho chạy install-scripts của `@prisma/engines`, `esbuild`, `prisma`.
> `prisma` client đã commit trong `src/generated/prisma`, build có chạy `prisma generate` cho chắc; `postinstall` có `prisma skills sync || exit 0`.

---

## 4. PayPal — sandbox app

1. https://developer.paypal.com → Apps → **Create App** (Business/Platform).
2. Copy **Client ID** + **Secret** → `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`.
3. **Sandbox → Accounts** → lấy buyer + password để test.
4. Lưu ý:
   - VND không phải currency PayPal hỗ trợ ⇒ provider chuyển `total VND / PAYPAL_USD_RATE` (mặc định 25.000 VND/$) → USD.
   - **Hosted checkout** (redirect), không nhúng SDK ⇒ CSP không nới `paypal.com`.
   - JWT cookie sống 15 phút; khách chậm hơn thì cần refresh token (frontend chưa tự gọi — demo tăng `JWT_ACCESS_TTL`).

---

## 4.1 MoMo — merchant keys

1. Đăng ký triển khai MoMo (test env) tại https://business.momo.vn → nhận `partnerCode`, `accessKey`, `secretKey`.
2. Set `MOMO_*` env (bảng mục 3) → provider autoboot và xuất hiện trong `GET /payments/methods`.
3. Cơ chế: checkout tạo link `payUrl` (v2 All-in-One, `captureWallet`) → user thanh toán → MoMo redirect
   `/api/v1/payments/momo/return` (đổi ra `resultCode=0` → order PAID) + IPN gửi gần như đồng thời tới `/api/v1/payments/webhook`
   (verify HMAC-SHA256 signature, idempotent qua `markPaidForOrder`).
4. Không cần key nào cũng chạy: `PAYMENT_PROVIDER=mock` + frontend chỉ hiện phương thức đã cấu hình env.

---

## 5. Verify sau khi deploy

```pwsh
curl.exe -s https://<project>.vercel.app/api/v1/health
# ↑ {"status":"ok","database":"connected",...} — chạy qua rewrite từ service backend
curl.exe -s -o NUL -w "%{http_code}" https://<project>.vercel.app/
```

Smoke E2E (như verify local): register → login (cookie+CSRF) → GET products → cart → POST orders →
checkout → sandbox buyer approve → redirect `/checkout/success?orderId=…` → `/invoice/:id` xem/tải PDF.

Check mã hoá field: raw DB (Neon SQL Editor) — `receiverName` order mới phải là `enc:v1:…`; API trả plaintext.

---

## 6. Lưu ý vận hành

- **Cold start**: backend là NestJS 1 Function — instance nguội khởi tạo DI container (vài giây) sau thời gian im lặng.
  Dữ liệu ổn định (Neon/R2 bên ngoài). Luôn nóng: ping `/api/v1/health` bằng cron mỗi vài phút.
- **Migrate thủ công**: Vercel không chạy `prisma migrate deploy` — schema mới phải deploy DB trước khi deploy app.
- **`vercel dev`**: chạy cả 2 service local cùng lúc, binding `BACKEND_URL` được inject tự động.
- **Đổi domain**: nếu thêm custom domain, cập nhật `PAYPAL_RETURN_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_APP_URL`
  (QR invoice), và CORS nguồn ở R2.
- **Bảo mật env**: file `vercel.json` chỉ chứa routing/bindings — creds thật đặt ở dashboard Vercel.
- **Promo Trung Thu**: campagne frontend-only (`frontend/lib/promo.ts`), không đổi gì ở Neon/R2.