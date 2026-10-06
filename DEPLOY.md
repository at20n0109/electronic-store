# DEPLOY.md — Đưa PC Store lên internet (Vercel + Render + Neon + Cloudflare R2)

Kiến trúc đích:

```
Browser ── https://<frontend>.vercel.app ── Vercel (Next.js)
   │   /api/* → Vercel rewrite (same-origin proxy)
   ▼
https://<backend>.onrender.com ── Render (NestJS) ── Neon (Postgres)
                                        │
                                        ├─ Cloudflare R2 (S3-compatible: ảnh + PDF invoice)
                                        └─ PayPal Orders v2 (sandbox)
```

Same-origin là BẮT BUỘC: auth dùng httpOnly cookie (`access_token`, `refresh_token`,
`csrf_token`, SameSite=Lax, không có Domain) nên trình duyệt phải gọi `/api/*` trên **cùng tên miền**
với frontend ⇒ dùng Vercel rewrite như nginx LB hiện tại. Không bắt buộc custom domain
(`<frontend>.vercel.app` là đủ).

---

## 0. Chuẩn bị tài khoản

| Dịch vụ | URL | Cần làm |
|---|---|---|
| Neon | https://neon.tech | Tạo project (region gần nhất, free) |
| Render | https://dashboard.render.com | Tạo 1 Web Service (free Starter) |
| Vercel | https://vercel.com | Import repo `electronic-store` |
| Cloudflare R2 | https://dash.cloudflare.com | Tạo bucket + API token (S3) |
| PayPal Developer | https://developer.paypal.com | Tạo sandbox app + sandbox buyer |

---

## 1. Neon — Postgres

1. New Project → tên `pc-store`, region gần Việt Nam (vd Singapore).
2. Lấy **connection string** (tab "Connect"):
   - dùng bản **pooled** (`-pooler.neon.tech`, `?sslmode=require`) để tránh giới hạn connection trên free tier.
   - bản direct dùng khi cần (`migrate`, `psql`).
3. Apply migration + tạo dữ liệu (chạy từ máy local, thay `DATABASE_URL` bằng Neon **direct**):

```pwsh
# trong backend/
$env:DATABASE_URL="postgresql://USER:PASS@ep-xxx.region.aws.neon.tech/pc-store?sslmode=require"
npx prisma migrate deploy
npx prisma db seed
```

4. (Tùy chọn) Tạo 1 user admin để upload ảnh sản phẩm:
   đăng ký qua web (role CUSTOMER) rồi:
   `docker exec -i ... psql` hoặc Dashboard Neon → SQL Editor:
   `UPDATE "User" SET role='ADMIN' WHERE email='ban@ex.com';`

> Seed không tạo ảnh sản phẩm (DB `ProductImage` rỗng) — ảnh hiển thị là static trong
> `frontend/public`; upload ảnh thật thì cần phần R2 bên dưới.

---

## 2. Cloudflare R2 — object storage (bắt buộc: backend fail nếu thiếu S3_*)

`UploadsService` dùng `getOrThrow(S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY / S3_ENDPOINT)`
→ không cấu hình R2 là backend **crash lúc boot**.

1. R2 → Create bucket `electronic-store`.
2. R2 → **Manage R2 API Tokens** → Create token (Object Read & Write) → copy `S3_ACCESS_KEY`, `S3_SECRET_KEY`.
3. **Public URL** cho object:
   - cách nhanh: Settings → Turn on **Public access** (tick *Submit for index* tuỳ chọn) → lấy domain `https://pub-<hash>.r2.dev`.
   - hoặc **custom domain** (đẹp hơn, cần domain riêng): thêm `media.tenmien.com` → CNAME tới host R2.
   - gán cho env `S3_PUBLIC_URL` (không trailing slash). Nếu bỏ trống, URL ảnh lưu vào DB sẽ là key tương đối ⇒ ảnh không xem được — nên đặt.
4. **CORS** (cache/cross-origin cho presigned PUT từ trình duyệt): bucket → **Settings → CORS**:
   ```json
   [
     {
       "AllowedOrigins": ["https://<frontend>.vercel.app"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["Content-Type", "x-amz-content-sha256"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. `S3_REGION=auto` (R2), `S3_ACL` **để trống** (R2 không hỗ trợ ACL), `S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com`.

---

## 3. Render — backend

1. Dashboard → **New + → Web Service** → connect repo → **Root Directory: `backend`**.
2. Runtime **Node**, version ≥ 22.
3. Build & Start:
   - Build command: `npm ci && npx prisma generate && npm run build`
   - Start command: `sh -c "npx prisma migrate deploy && node dist/main"`
   - (Trên Render bản install đầy đủ nên `npx prisma` có sẵn; save lại cả migration để auto-run mỗi lần deploy.)
4. **Health check**: `/api/v1/health` (Render tắt giám sát lỗi crash nếu set đúng).
5. Env (xem bảng dưới). Render deploy lần đầu **đã set hết env bắt buộc** (nhất là `DATABASE_URL`, `S3_*`, `ENCRYPTION_KEY`, `JWT_ACCESS_SECRET`, `CORS_ORIGIN`, `PAYPAL_*`) rồi mới bấm Deploy.
6. Copy URL Web Service, vd `https://pc-store-api.onrender.com`.

### Env Render

| Key | Giá trị |
|---|---|
| NODE_ENV | `production` |
| PORT | `3001` |
| DATABASE_URL | Neon **pooled** URL |
| CORS_ORIGIN | `https://<frontend>.vercel.app` (thêm nhiều origin, ngăn cách bằng `,`) |
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
| S3_PUBLIC_URL | `https://pub-<hash>.r2.dev` hoặc custom domain |
| PAYMENT_PROVIDER | `paypal` |
| PAYPAL_CLIENT_ID / PAYPAL_SECRET | từ PayPal sandbox app (mục 4) |
| PAYPAL_MODE | `sandbox` |
| PAYPAL_RETURN_URL | `https://<frontend>.vercel.app/api/v1/payments/paypal/return` |
| PAYPAL_CANCEL_URL | `https://<frontend>.vercel.app/checkout` |
| PAYPAL_CURRENCY | `USD` |
| PAYPAL_USD_RATE | `25000` (VND → USD; toàn bộ đơn chuyển đổi theo tỷ giá cố định này — PayPal không hỗ trợ VND) |
| NEXT_PUBLIC_APP_URL | `https://<frontend>.vercel.app` (dùng cho QR xác minh hoá đơn) |
| PAYMENT_SECRET / PAYMENT_WEBHOOK_SECRET | tuỳ chọn (stripe/vnpay) — để placeholder cũng được |

`backend/render.yaml` là Blueprint tương đương (thay `sync:false` bằng giá trị thật ở dashboard).

---

## 4. PayPal — sandbox app

1. https://developer.paypal.com → Dashboard → Apps → **Create App** (loại Business/Platform).
2. Copy **Client ID** và **Secret** → `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`.
3. Testing: Dashboard → **Sandbox → Accounts** → tạo/lấy 1 buyer account + password để test thanh toán.
4. Lưu ý:
   - VND không phải currency PayPal hỗ trợ ⇒ provider chuyển `total VND / PAYPAL_USD_RATE` (mặc định
     25.000 VND/$) sang USD, sai lệch ± vài nghìn VND tuỳ tỷ giá thực tế — chỉ dùng cho demo/sandbox.
   - Thanh toán qua **hosted checkout** (redirect), không nhúng SDK ⇒ CSP không phải nới `paypal.com`.
   - JWT cookie sống 15 phút; nếu khách chậm hơn thì hit `/auth/refresh` (frontend chưa tự gọi — demo chấp nhận
     hoặc tăng `JWT_ACCESS_TTL` khi demo).

---

## 5. Vercel — frontend

Trong repo đã có `frontend/vercel.json`:

```json
{
  "env": { "NEXT_PUBLIC_DISABLE_PROXY": "true", "INTERNAL_API_URL": "https://YOURBACKEND.onrender.com" },
  "rewrites": [{ "source": "/api/:path*", "destination": "https://YOURBACKEND.onrender.com/api/:path*" }]
}
```

1. Vercel → New Project → import repo → **Root Directory: `frontend`**.
2. **Thay `YOURBACKEND.onrender.com`** bằng Render URL thật trong `vercel.json` (hoặc đặt env dashboard, xoá placeholder ở file).
3. Framework preset: Next.js (Vercel tự nhận). Build/Start mặc định là chuẩn.
4. Env (dashboard hoặc để trong `vercel.json`):
   | Key | Giá trị | Ghi chú |
   |---|---|---|
   | NEXT_PUBLIC_DISABLE_PROXY | `true` | tắt `proxy.ts` trên prod; nếu không set, middleware sẽ trỏ sai `127.0.0.1:3001` |
   | INTERNAL_API_URL | `https://<backend>.onrender.com` | server components gọi thẳng Render (kèm cookie) |
   | NEXT_PUBLIC_API_URL | *(để trống)* | rỗng ⇒ relative `/api` ⇒ rewrite |
   | NEXT_PUBLIC_BACKEND_URL | *(để trống)* | KHÔNG đặt — tránh trình duyệt gọi thẳng Render (mất cookie) |
5. Deploy. Domain mặc định: `https://<project>.vercel.app`.

CSP trên prod giữ `connect-src 'self' https://*.r2.cloudflarestorage.com https://*.r2.dev`
(cho presigned PUT/GET); `img-src 'self' data: https:`; `proxy.ts` pass-through khi có flag trên.

---

## 6. Luồng thanh toán PayPal hoạt động thế nào

1. Checkout → `POST /api/v1/payments/checkout` → provider tạo order PayPal → trả `checkoutUrl` (hosted).
2. Browser đi sang `sandbox.paypal.com`, login buyer sandbox, Approve.
3. PayPal redirect GET → `PAYPAL_RETURN_URL?token=<paypalOrderId>` (trên Vercel) → rewrite sang Render →
   `JwtGuard` (cookie còn hạn) → `capture` → đánh dấu `Payment=SUCCEEDED`, `Order=PAID` → redirect `/checkout/success?orderId=…`.
4. `/checkout/success` hiển thị + link `/invoice/:orderId` (xem hoá đơn, tải PDF).
5. PDF/ảnh lưu R2, đường dẫn qua API (không cần bucket public cho download; `S3_PUBLIC_URL` chỉ để link ảnh sản phẩm admin upload).

---

## 7. Verify sau khi deploy

```pwsh
# backend
curl.exe -k -s https://<backend>.onrender.com/api/v1/health
# ↑ {"status":"ok","database":"connected",...}

# frontend + rewrite
curl.exe -k -s https://<frontend>.vercel.app/api/v1/health
curl.exe -k -s -o NUL -w "%{http_code}" https://<frontend>.vercel.app/
```

Smoke test E2E (giống lần verify local): register → login (lấy cookie) → GET products →
add cart → POST orders (kèm `x-csrf-token`) → checkout → thanh toán bằng sandbox buyer →
xác nhận redirect `/checkout/success?orderId=…` và `/invoice/:id` hiển thị.

Check mã hoá field: raw DB (Neon SQL Editor) — `receiverName` của order mới phải là chuỗi `enc:v1:…`;
nhưng API trả plaintext.

---

## 8. Lưu ý vận hành

- **Render free**: service ngủ sau ~15 phút không có request → lần mở lại chậm (~30–60s). Muốn luôn nóng: UptimeRobot/K6 ping
  `/api/v1/health` mỗi 10 phút, hoặc nâng plan. Cũng giới hạn 750h/month.
- **Cold start không ảnh hưởng dữ liệu**: Postgres (Neon) và R2 nằm ngoài Render.
- **Đổi domain**: nếu có custom domain và tách `api.pcstore.com`: không cần rewrite → set `NEXT_PUBLIC_API_URL=https://api.pcstore.com`, `CORS_ORIGIN=https://pcstore.com`, cookie vẫn SameSite=Lax (cùng site `pcstore.com`) — giữ hợp lệ.
- **Migrate tự động**: start command chạy `prisma migrate deploy` mỗi lần deploy — request POST chỉ bắt đầu sau khi
  health check OK.
- **Bảo mật env**: `vercel.json`/`render.yaml` chỉ chứa placeholder/`sync:false`; creds thật đặt ở dashboard.
- **Promo Trung Thu**: campagne là frontend-only (`frontend/lib/promo.ts`), không đổi gì ở Neon/Render.