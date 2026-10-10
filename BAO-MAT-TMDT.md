# PC Store — Báo cáo tổng quan & An toàn thương mại điện tử

> Tài liệu phục vụ môn **An toàn thương mại điện tử**. Phần đầu giới thiệu sơ lược
> hệ thống, phần sau đi sâu vào **các cơ chế bảo mật đã triển khai** kèm **câu lệnh SQL
> minh họa trực quan** để chứng minh dữ liệu đã được bảo vệ ở tầng lưu trữ.

---

## 1. Giới thiệu sơ lược website

**PC Store** là website thương mại điện tử bán **linh kiện máy tính & build PC chính hãng**
(CPU, GPU, mainboard, RAM, ổ cứng, nguồn, vỏ case, tản nhiệt — hiện có 30 sản phẩm,
8 nhóm danh mục và 4 build PC mẫu). Ngôn ngữ tiếng Việt, phục vụ nhóm khách phổ thông – tầm trung.

### Kiến trúc kỹ thuật

| Lớp | Công nghệ |
| --- | --- |
| Frontend | Next.js 16 (App Router) + React + Tailwind CSS v4 |
| Backend | NestJS (Node.js) + TypeScript |
| ORM | Prisma |
| Cơ sở dữ liệu | PostgreSQL |
| Xác thực | JWT (access + refresh), HttpOnly cookie, OAuth xã hội, OTP SMS |
| Thanh toán | Stripe, VNPay, MoMo, ZaloPay, PayPal, chuyển khoản, COD, ATM mock |

### Chức năng chính

- Duyệt catalog, tìm kiếm/lọc/sắp xếp sản phẩm.
- Xem 4 build PC mẫu theo mức ngân sách (10 / 20 / 30–40 triệu).
- Giỏ hàng, đặt hàng, thanh toán nhiều phương thức.
- Hóa đơn điện tử (PDF), tra cứu đơn hàng của chính mình.
- Đăng ký / đăng nhập (email, số điện thoại qua OTP, mạng xã hội).
- Trang quản trị (admin) xác nhận thanh toán ATM.

### Luồng mua hàng (rút gọn)

```
Khách → Giỏ hàng → Đặt hàng (Order) → Chọn phương thức thanh toán
      → Cổng thanh toán (redirect/webhook) → Xác nhận PAID → Xuất hóa đơn
```

Trong suốt luồng này, các dữ liệu nhạy cảm (thông tin người nhận, dữ liệu thẻ ATM,
token phiên, mật khẩu) đều được xử lý theo nguyên tắc **không lưu plaintext**.

---

## 2. Kiến trúc dữ liệu

Các bảng quan trọng đối với bảo mật:

| Bảng | Vai trò | Trường nhạy cảm |
| --- | --- | --- |
| `User` | Tài khoản | `passwordHash`, `phone`, `authProvider` |
| `RefreshToken` | Phiên đăng nhập dài hạn | `tokenHash` (băm, không lưu token gốc) |
| `Otp` | Mã xác thực SMS | `codeHash` (băm), `attempts`, `expiresAt` |
| `Order` | Đơn hàng | `receiverName/Phone/Address/note` (**mã hóa**) |
| `Payment` | Giao dịch với cổng thanh toán | `transactionId`, `payload` |
| `PaymentMetadata` | Dữ liệu thẻ ATM nhập tay | `encryptedData`, `iv`, `authTag` (**mã hóa**) |

---

## 3. Các cơ chế bảo mật đã triển khai

### 3.1. Xác thực & quản lý phiên

- **Access token** (JWT, HS256, TTL ngắn ~15 phút) chỉ chứa `sub`, `email`, `role`.
- **Refresh token** là chuỗi ngẫu nhiên 48 byte; **chỉ bản băm SHA-256** được lưu
  trong `RefreshToken.tokenHash`. Token gốc không bao giờ nằm trong CSDL.
- Refresh token **xoay vòng (rotation)** và **bị thu hồi** sau mỗi lần dùng.
- Cookie đặt `HttpOnly`, `Secure` (production), `SameSite=Lax` → JavaScript không đọc được,
  giảm thiểu đánh cắp token qua XSS.
- Phản hồi đăng nhập chỉ trả hồ sơ người dùng, **không** trả token ra body.

### 3.2. Băm mật khẩu

- Sử dụng **scrypt** (memory-hard): `N=16384, r=8, p=1`, salt ngẫu nhiên 16 byte.
- Định dạng lưu: `scrypt:N:r:p:salt:derivedKey` (base64).
- So sánh bằng `timingSafeEqual` → chống tấn công đo thời gian (timing attack).

### 3.3. OTP

- Sinh mã 6 chữ số bằng `randomInt` (an toàn mật mã).
- Lưu **SHA-256 của mã** (`Otp.codeHash`), không lưu mã gốc.
- Có `expiresAt` (hết hạn) và `attempts` (giới hạn số lần thử) chống brute-force.

### 3.4. Mã hóa dữ liệu nhạy cảm (AES-256-GCM)

- Lớp `CryptoService` mã hóa bằng **AES-256-GCM** (mã hóa có xác thực — AEAD).
- Khóa 256-bit lấy từ biến môi trường `ENCRYPTION_KEY` (base64, đúng 32 byte).
- Định dạng bản mã: `enc:v1:iv:tag:ciphertext` (iv/tag/ct mã hóa base64url).
- **IV ngẫu nhiên 12 byte cho mỗi lần mã hóa** → cùng một dữ liệu, mã hóa hai lần cho
  ra hai bản mã khác nhau (chống phân tích mẫu).
- **Áp dụng cho**: `Order.receiverName`, `receiverPhone`, `receiverAddress`, `note`
  và toàn bộ dữ liệu thẻ ATM trong `PaymentMetadata.encryptedData`.
- GCM cung cấp cả **bảo mật** lẫn **toàn vẹn**: nếu bản mã bị sửa, `authTag` sai → giải mã thất bại.

### 3.5. Chống CSRF

- Cơ chế **double-submit cookie**: cookie `csrf_token` phải khớp header `x-csrf-token`.
- So sánh hằng thời gian bằng `timingSafeEqual`.
- Chỉ áp dụng cho các request thay đổi trạng thái (POST/PUT/PATCH/DELETE) có cookie phiên.

### 3.6. Phân quyền (RBAC)

- Vai trò: `CUSTOMER`, `STAFF`, `ADMIN`.
- Các thao tác quản trị catalog yêu cầu `STAFF`/`ADMIN`; dữ liệu giỏ/đơn của khách
  bị **giới hạn theo chính người dùng đang đăng nhập** (tránh truy cập chéo tài khoản).
- Kiểm tra qua `JwtAuthGuard` + `RolesGuard`.

### 3.7. Kiểm tra chữ ký webhook thanh toán

- VNPay, MoMo, ZaloPay kiểm tra **chữ ký HMAC/SHA** trước khi xử lý nghiệp vụ.
- Stripe xác minh `signature` bằng `endpointSecret` trước khi đọc dữ liệu sự kiện.
- Chống giả mạo callback "đã thanh toán".

### 3.8. Chống race condition tồn kho

- Trừ kho bằng `UPDATE ... WHERE stock >= quantity` (có điều kiện, nguyên tử)
  trong một transaction → ngăn hai người cùng mua vượt số lượng tồn.

### 3.9. Kiểm soát đầu vào & phòng thủ chung

- DTO allowlist + `class-validator` kiểm tra dữ liệu ở mọi biên.
- Dùng API có tham số hóa của Prisma → chống **SQL Injection**.
- Bộ lọc ngoại lệ chỉ trả thông báo chung, không lộ stack/chi tiết nội bộ.
- Header bảo mật và CORS allowlist ở production; bắt buộc HTTPS qua reverse proxy.

---

## 4. Câu lệnh SQL minh họa trực quan

> Các truy vấn dưới đây cho thấy **dữ liệu nhạy cảm đã được băm/mã hóa**, không đọc
> được như plaintext. Dùng `psql`, pgAdmin hoặc Prisma Studio.

### 4.1. Kết nối tới cơ sở dữ liệu

Hệ thống có hai môi trường CSDL:

| Menv | DATABASE_URL | Dùng để |
| --- | --- | --- |
| Local dev | `postgresql://...@localhost:5432/ecommerce` (trong `backend/.env`) | Phát triển, chạy `npx prisma studio` |
| **Production** | URL **Neon** (PostgreSQL serverless) — lưu trong biến môi trường `DATABASE_URL` của Vercel | Website đang chạy thật, chứa dữ liệu bảo mật cần demo |

Muốn **demo trực quan các cơ chế bảo mật với dữ liệu thật** (đơn hàng, tài khoản, giao dịch
đã băm/mã hóa), hãy chạy các truy vấn ở mục 4 trên **production Neon**:

- Cách 1 (nhanh): mở **Neon Console** → project → **SQL Editor**, paste truy vấn rồi **Run**.
- Cách 2: lấy `DATABASE_URL` production (Vercel → Settings → Environment Variables, hoặc
  `vercel env pull` trên máy dev) rồi:

```bash
psql "$DATABASE_URL"
```

> Không dán `DATABASE_URL` / `ENCRYPTION_KEY` thật vào báo cáo hay slide — chỉ dùng để chạy demo.

### 4.2. Bảng người dùng — mật khẩu đã băm, không lộ plaintext

```sql
SELECT id, email, role, "passwordHash"
FROM "User"
LIMIT 10;
```

**Quan sát:** `passwordHash` có dạng `scrypt:16384:8:1:<salt>:<hash>` — không thể đảo ngược.
Nếu thấy mật khẩu đọc được → chưa băm (sai).

Chỉ kiểm tra mật khẩu có đúng chuẩn scrypt hay không:

```sql
SELECT email,
       LEFT("passwordHash", 6) AS thuat_toan,
       "passwordHash" LIKE 'scrypt:%' AS dung_chuan
FROM "User";
```

### 4.3. Bảng refresh token — chỉ lưu bản băm

```sql
SELECT id, "userId", LEFT("tokenHash", 16) AS hash_rut_gon,
       "expiresAt", ("revokedAt" IS NOT NULL) AS da_thu_hoi
FROM "RefreshToken"
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Quan sát:** `tokenHash` là chuỗi hex 64 ký tự (SHA-256). Token gốc **không tồn tại**
trong CSDL — kẻ tấn công đọc được bảng này cũng không tái sử dụng được phiên.

Đếm token đang hoạt động / đã thu hồi:

```sql
SELECT
  COUNT(*) FILTER (WHERE "revokedAt" IS NULL AND "expiresAt" > now()) AS dang_hoat_dong,
  COUNT(*) FILTER (WHERE "revokedAt" IS NOT NULL)                   AS da_thu_hoi
FROM "RefreshToken";
```

### 4.4. Bảng OTP — mã đã băm

```sql
SELECT phone, LEFT("codeHash", 16) AS hash_rut_gon, attempts, "expiresAt", "usedAt"
FROM "Otp"
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Quan sát:** không thấy mã 6 số, chỉ thấy bản băm SHA-256.

### 4.5. Bảng Order — thông tin người nhận đã mã hóa

```sql
SELECT id,
       "receiverName",
       "receiverPhone",
       "receiverAddress",
       "note"
FROM "Order"
LIMIT 5;
```

**Quan sát:** các trường có tiền tố `enc:v1:` → đã mã hóa AES-256-GCM.

Tách bản mã thành 4 phần `enc:v1 : iv : tag : ciphertext` để thấy rõ cấu trúc:

```sql
SELECT id,
       split_part("receiverName", ':', 1) AS tien_to,
       split_part("receiverName", ':', 2) AS iv,
       split_part("receiverName", ':', 3) AS auth_tag,
       split_part("receiverName", ':', 4) AS cipher_text
FROM "Order"
WHERE "receiverName" LIKE 'enc:v1:%'
LIMIT 5;
```

**Quan sát:** `iv`, `auth_tag`, `cipher_text` đều là chuỗi base64url vô nghĩa.

Thống kê tỉ lệ đã mã hóa / còn plaintext:

```sql
SELECT
  COUNT(*)                                                    AS tong_don,
  COUNT(*) FILTER (WHERE "receiverPhone" LIKE 'enc:v1:%')     AS da_ma_hoa,
  COUNT(*) FILTER (WHERE "receiverPhone" NOT LIKE 'enc:v1:%') AS chua_ma_hoa
FROM "Order";
```

Tìm đơn hàng còn lộ thông tin (nếu có):

```sql
SELECT id, "receiverName", "receiverPhone"
FROM "Order"
WHERE "receiverPhone" NOT LIKE 'enc:v1:%'
  AND "receiverPhone" <> '';
```

### 4.6. Bảng PaymentMetadata — dữ liệu thẻ ATM đã mã hóa

```sql
SELECT "orderId",
       provider,
       status,
       "encryptedData",
       iv,
       "authTag"
FROM "PaymentMetadata"
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Quan sát:** `encryptedData` có dạng `enc:v1:<iv>:<tag>:<ct>`; `iv` và `authTag`
được lưu tách riêng. Không có số thẻ/pin nào đọc được.

Đối chiếu `iv` trong cột riêng với `iv` bên trong `encryptedData`:

```sql
SELECT "orderId",
       iv                                            AS iv_cot_rieng,
       split_part("encryptedData", ':', 2)           AS iv_trong_ban_ma,
       (iv = split_part("encryptedData", ':', 2))    AS khop
FROM "PaymentMetadata"
LIMIT 5;
```

### 4.7. Kiểm chứng tính ngẫu nhiên của IV

Hai đơn hàng có thể chứa **cùng thông tin** người nhận, nhưng bản mã phải **khác nhau**
hoàn toàn (do IV ngẫu nhiên). Đây là bằng chứng trực quan của mã hóa đúng chuẩn:

```sql
SELECT id, "receiverPhone"
FROM "Order"
WHERE "receiverPhone" LIKE 'enc:v1:%'
LIMIT 5;
```

So sánh mắt thường: không đơn nào có bản mã giống nhau dù cùng số điện thoại.

### 4.8. Liệt kê các bảng và cột để rà soát

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

Danh sách tất cả bảng:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 4.9. Xem ai đã đăng ký và các khoản thanh toán

```sql
SELECT
    u.email,
    u.name,
    p.provider,
    p.status,
    p.amount,
    p.currency,
    p."createdAt"
FROM "User" u
JOIN "Order" o   ON o."userId" = u."id"
JOIN "Payment" p ON p."orderId" = o."id"
ORDER BY p."createdAt" DESC;
```

> Lưu ý: `amount` là `Decimal` nên có thể hiển thị dạng số; thông tin người nhận trong
> `Order` vẫn ở dạng mã hóa nếu truy vấn trực tiếp CSDL.

### 4.10. Bằng chứng không giải mã được nếu thiếu khóa

Các cột mã hóa **không thể đọc** bằng SQL thuần; muốn giải mã phải có
`ENCRYPTION_KEY` và chạy qua ứng dụng (`CryptoService.decrypt`). Điều này chứng minh
dữ liệu nhạy cảm được bảo vệ ngay cả khi CSDL bị rò rỉ:

```
enc:v1:0J3x...:9dK...:hW2q...   ← vô nghĩa nếu không có khóa 256-bit
```

Còn token/phiên thì ngay cả có khóa cũng **không** khôi phục được vì đã băm một chiều.

---

## 5. Ánh xạ với OWASP Top 10

| Rủi ro | Cơ chế đối phó trong PC Store |
| --- | --- |
| A01 Broken Access Control | RBAC, giới hạn giỏ/đơn theo người dùng |
| A02 Security Misconfiguration | Header bảo mật, CORS allowlist, HTTPS bắt buộc |
| A03 Injection | Prisma tham số hóa, DTO allowlist |
| A04 Insecure Design | Trừ kho nguyên tử, không lưu dữ liệu thẻ |
| A05 Security Misconfiguration | Kiểm tra biến môi trường lúc khởi động |
| A07 Auth Failures | scrypt, OTP giới hạn, refresh rotation |
| A08 Data Integrity Failures | Xác minh chữ ký webhook, AES-GCM AEAD |
| A09 Logging Failures | Log không chứa mật khẩu/token/thẻ |

---

## 6. Ghi chú cho báo cáo

- **Bảo mật tại tầng ứng dụng**: băm mật khẩu/OTP, token băm một chiều, mã hóa AEAD
  thông tin cá nhân & dữ liệu thẻ.
- **Bảo mật tại tầng vận hành**: HTTPS, secret store, rate limit/WAF, backup, log tập trung
  (xem `SECURITY.md`).
- Khi trình bày, có thể chạy lần lượt các truy vấn mục **4.2 → 4.6** để chứng minh
  "dữ liệu nhạy cảm không nằm dạng gốc trong CSDL".
- Không dán khóa `ENCRYPTION_KEY` hoặc mật khẩu CSDL thật vào báo cáo/slide.

---

*Tài liệu tham chiếu thêm: `SECURITY.md` (baseline OWASP ASVS 5.0), `PRODUCT.md` (đặc tả sản phẩm), `backend/prisma/schema.prisma` (mô hình dữ liệu).*
