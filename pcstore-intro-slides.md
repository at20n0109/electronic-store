# PC Store — Giới thiệu Website & Hệ thống Bảo mật

> Slide 1/15 · Slide deck: `pcstore-intro-slides.html` (bấm mũi tên/Space để chuyển slide)

---

## Slide 2 — Giới thiệu Website

**PC Store** — website bán lẻ phụ kiện máy tính, đầy đủ chu trình mua sắm thực tế:

| # | Chức năng | Mô tả |
|---|-----------|-------|
| 01 | Danh mục sản phẩm | Case, CPU, GPU, mainboard, RAM, SSD, PSU, tản nhiệt — có filter & tìm kiếm |
| 02 | PC Builder | Cấu hình bộ máy, cảnh báo tương thích linh kiện |
| 03 | Giỏ hàng + Đặt hàng | Giỏ hàng theo tài khoản, thanh toán (mock), theo dõi đơn hàng |
| 04 | Hóa đơn PDF | Tự tạo hóa đơn, quyền truy cập đúng chủ sở hữu |

**Công nghệ:** Next.js 16 (React 19) · NestJS · PostgreSQL · Prisma · JWT + Argon2id

---

## Slide 3 — Kiến trúc 3 tầng

```
Frontend (Next.js 16)
   │  Gọi API same-origin /api/v1/* qua proxy
   ▼
Proxy same-origin (frontend/proxy.ts)
   │  Chuyển tiếp tới backend
   ▼
Backend API (NestJS · REST · JWT)
   │
   ▼
Data: PostgreSQL · S3-compatible (MinIO local / Cloudflare R2 prod)
```

**Điểm mạnh:**
- ✅ **Same-origin** — cookie hoạt động mà không cần bỏ `SameSite` → giảm bề mặt tấn công CSRF
- ✅ **REST + DTO** — validate mọi input ở biên giới qua `ValidationPipe`
- ✅ **Auth layers** — JwtGuard · RolesGuard · CsrfGuard · ownership check

---

## Slide 4 — 9 lớp phòng thủ

1. **Mật khẩu** — Argon2id, hash chuẩn OWASP
2. **Session** — Access + refresh token, refresh token hash & rotate
3. **Cookie** — httpOnly · SameSite · Secure
4. **CSRF** — Double-submit cookie + timing-safe compare
5. **Headers + CSP** — nosniff · X-Frame-Options DENY · script-src 'self'
6. **Authorization** — Roles + ownership từng resource
7. **Input validation** — whitelist · không SQL concat
8. **Dev hardening** — chặn endpoint nội bộ `__nextjs_*`
9. **Deployment** — CORS allow-list · HSTS · secrets qua env

---

## Slide 5 — Lớp 1: Mật khẩu (Argon2id)

Không bao giờ lưu plaintext — hash bằng **Argon2id**, thuật toán đạt chuẩn Password Hashing Competition, được OWASP khuyến nghị.

```ts
// backend/src/auth/auth.service.ts:64
const passwordHash = await argon2.hash(dto.password, {
  type: argon2.argon2id,        // chuẩn OWASP
  memoryCost: 19456,            // ≈19MB — chống crack bằng GPU
  timeCost: 2,
  parallelism: 1,
});
const ok = await argon2.verify(user.passwordHash, dto.password);
```

- ✅ **Argon2id** — thuật toán hash hàng đầu hiện nay
- ✅ **Chống user enumeration** — sai email / sai mật khẩu đều trả `Invalid email or password`
- ✅ **Salt tự động** — 2 tài khoản cùng mật khẩu cho 2 hash khác nhau

---

## Slide 6 — Lớp 2: Phiên đăng nhập (Access + Refresh token)

| Loại | Thời gian sống | Đặc điểm |
|------|----------------|----------|
| **Access token** | 15 phút | JWT ngắn hạn, rò rỉ cũng chỉ dùng được thời gian ngắn |
| **Refresh token** | 30 ngày | Chỉ dùng để xin token mới — **không lưu plaintext** trong DB, chỉ lưu SHA-256 hash |

- ✅ **Rotation** — mỗi lần refresh, token cũ bị **thu hồi ngay** → token bị đánh cắp dùng lại là vô hiệu
- ✅ **Tamper-proof** — JWT ký bằng secret từ env, kiểm tra issuer/audience

---

## Slide 7 — Lớp 3: Cookie an toàn trước XSS

```ts
// backend/src/auth/auth.controller.ts:31
res.cookie(ACCESS_COOKIE, r.accessToken, {
  httpOnly: true,   // JS client không đọc được → kẻ XSS không cướp được token
  sameSite: 'lax',  // trình duyệt không gửi kèm request chéo site
  secure,           // production: chỉ gửi qua HTTPS
  path: '/',
  maxAge: 15 * 60 * 1000,
});
```

- ✅ **httpOnly** — chặn đánh cắp session bằng XSS/script
- ✅ **SameSite=Lax** — lá chắn CSRF tầng trình duyệt
- ✅ **Secure** — không lọt token khi dùng HTTP

---

## Slide 8 — Lớp 4: Chống CSRF

```ts
// backend/src/common/guards/csrf.guard.ts
if (SAFE_METHODS.has(request.method)) return true;  // GET/HEAD/OPTIONS
// Với POST/PATCH/DELETE đang có session:
const cookie = cookies.csrf_token;
const header = request.header('x-csrf-token');
if (!cookie || !header || !sameValue(cookie, header))
  throw new ForbiddenException('CSRF validation failed');

function sameValue(a, b) {  // so bằng hằng số thời gian (chống timing attack)
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- ✅ **Double-submit cookie** — server so header với cookie; website thứ 3 không đọc được cookie nên không giả được header
- ✅ **timingSafeEqual** — so sánh không rò thông tin qua thời gian phản hồi

---

## Slide 9 — Lớp 5: Security Headers + CSP

**Headers (backend/src/main.ts):**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` — chống clickjacking
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` — tắt camera/mic/geolocation
- `Cache-Control: no-store` — page nhạy cảm không bị lưu cache
- `Strict-Transport-Security` (HSTS) — production

**CSP production (frontend/next.config.ts):**
```http
default-src 'self';
object-src 'none';          # chặn plugin
frame-ancestors 'none';     # chặn iframe ngoài
base-uri 'self';
script-src 'self';          # chặn inline/remote script
```
Không cho `unsafe-inline` / `unsafe-eval` ở production → tấn công XSS không chạy được code.

---

## Slide 10 — Lớp 6: Authorization (Phân quyền)

- ✅ **JwtGuard** — route yêu cầu đăng nhập; không có token hợp lệ → `401`
- ✅ **RolesGuard** — hạn chế thao tác quản trị cho admin → `403`
- ✅ **Ownership** — mỗi khi lấy giỏ hàng / đơn hàng / hóa đơn / PDF đều kiểm tra userId của chủ thật:

```ts
// backend/src/invoices/invoices.service.ts:121 — xem hóa đơn của NGƯỜI KHÁC → từ chối
if (invoice.order.userId !== userId) {
  throw new ForbiddenException('You do not own this invoice');
}
```

---

## Slide 11 — Lớp 7: Input Validation

```ts
// backend/src/main.ts:15
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,             // bỏ field không khai báo trong DTO
  forbidNonWhitelisted: true,  // chặn field lạ
  transform: true,             // ép kiểu theo DTO
}));
```

- ✅ **Chống mass-assignment** — không thể tự thêm field `isAdmin` vào request
- ✅ **Chống SQL injection** — toàn bộ truy vấn qua Prisma (prepared statement), không concat chuỗi SQL

---

## Slide 12 — Lớp 8: Dev hardening

Next.js dev có các route nội bộ `/__nextjs_*` (mở Node inspector) — được xử lý **trước cả middleware thường**, nên bị chặn ở lớp HTTP bằng custom server:

```js
// frontend/server.js — chạy trước khi Next xử lý request
createServer(function (req, res) {
  if (dev && req.url.startsWith('/__nextjs')) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  handle(req, res);
})
```

- ✅ Scanner dò sẽ nhận **403** thay vì URL debugger
- ✅ CSP dev nới `unsafe-inline/eval` để tiện XHR/HMR — nhưng **production bỏ hẳn**

---

## Slide 13 — Lớp 9: Deployment (Triển khai)

- ✅ **CORS allow-list** — production chỉ chấp nhận origin HTTPS từ `CORS_ORIGIN`; server **từ chối khởi động** nếu không cấu hình
- ✅ **HSTS** — `Strict-Transport-Security` bắt buộc HTTPS
- ✅ **Secrets qua env** — JWT secret, database, storage từ biến môi trường — **không hardcode, không commit** vào git
- ✅ **Storage riêng** — hóa đơn PDF lưu S3-compatible (MinIO local / Cloudflare R2 prod)

Repo: `at20n0109/electronic-store` · branch `main`

---

## Slide 14 — Tổng kết

- ✅ **Mật khẩu** — Argon2id, không plaintext, chống user enumeration
- ✅ **Session** — access ngắn hạn + refresh token hash & rotate
- ✅ **Cookie** — httpOnly + SameSite + Secure, same-origin proxy
- ✅ **CSRF** — double-submit cookie + timing-safe compare
- ✅ **XSS / clickjacking** — CSP strict, nosniff, frame DENY, HSTS
- ✅ **Phân quyền** — RolesGuard + ownership trên từng resource
- ✅ **Input** — ValidationPipe whitelist, Prisma prepared statements

> **Bảo mật được thiết kế từ đầu, không phải vá sau.**

---

## Slide 15 — Kết thúc

# Cảm ơn thầy/cô & các bạn

Nhận câu hỏi về website & hệ thống bảo mật.

GitHub: **at20n0109/electronic-store** · Next.js · NestJS · PostgreSQL

---

## Phụ lục — Đường dẫn code chính

| Lớp bảo mật | File | Vị trí |
|-------------|------|--------|
| Argon2id hash | `backend/src/auth/auth.service.ts` | :64-69 |
| Refresh token hash | `backend/src/auth/auth.service.ts` | :31-33, :97 |
| Token rotation | `backend/src/auth/auth.service.ts` | :112-115 |
| Cookie httpOnly/SameSite/Secure | `backend/src/auth/auth.controller.ts` | :31-52 |
| CSRF guard | `backend/src/common/guards/csrf.guard.ts` | :34 |
| Security headers | `backend/src/main.ts` | :27-33 |
| ValidationPipe | `backend/src/main.ts` | :15-17 |
| CORS allow-list | `backend/src/main.ts` | :40-51 |
| Ownership check | `backend/src/invoices/invoices.service.ts` | :55, :121 |
| CSP production | `frontend/next.config.ts` | :6-7 |
| Chặn `__nextjs_*` | `frontend/server.js` | — |
| Proxy same-origin | `frontend/proxy.ts` | — |