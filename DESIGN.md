# DESIGN — PC Store landing `/`

> Record của quyết định thị giác. Nguồn: skill `design-taste-frontend` (quy trình concept-seed → 7 hướng grounded → gán) + `impeccable` (PRODUCT.md → direction contract → craft-floor → detector).
> Hướng được chọn: **Clean-Build Interior** (assigned, key `9aee7108`). Pick card: Review Bench.

## Thế giới

Trang `/` là một **nội thất máy mới ráp xong**: nền xưởng tối (zinc-950), dây rút gọn, các phần tử nằm trên một lưới đo đạc. Nhận diện được chứng minh bằng "bản vẽ khai triển" thật (dữ liệu build pc-10 trực tiếp từ API), không phải ảnh stock hay số liệu bịa.

- Surface: `zinc-950` nền, `zinc-900` panel, `zinc-800` hairline, `zinc-500/600` nuance.
- Accent đỏ (`var(--primary)` #DC2626) **reserve**: chỉ trên CTA cấp một, nút thang "sống", dòng "pc-10 · …" và viền trên card flagship. Không dùng làm border trang trí rải rác.
- Bối cảnh dùng màu: tối là quyết định theo **scene** (xưởng ráp, đèn bàn), không phải convention dark-mode; breadcrumb – catalog `/san-pham` vẫn theo theme sáng/tối riêng như trước.

## Chữ

- Display + body: **Saira** (next/font/google, latin+latin-ext). Heading tracking −0.03em, line-height 1.04, max ~text-6xl.
- Data/đo: **JetBrains Mono** cho mọi con số giá, mã linh kiện, nhãn kỹ thuật, tick đo. Trường hợp hợp lệ của "mono cho dữ liệu/đo".
- Cấm eyebrow/kicker; heading tự đứng vững. Số section không dùng (không cần thứ tự thông tin).

## Bố cục — một trục dọc (axial-pace)

1. **Hero**: copy trái (headline 2 dòng, sub 1 clause, CTA kép) + phải **bản vẽ khai triển** pc-10: 7 món lắp vào theo staggered slot-in, khung góc + tick đo, chú thích "tỉ lệ 1:1 · giá tại kho".
2. **Dải BOM** (1 marquee duy nhất): tên nhóm linh kiện lặp, dừng khi `prefers-reduced-motion`.
3. **Bốn bản vẽ ngân sách**: 4 build thật, giá thật (mono), flagship đánh dấu bằng viền đỏ (phần tử sống).
4. **Tám ngăn kho**: 8 danh mục thật (+1 "Tất cả") — lọc thẳng `/san-pham`.
5. **Trên kệ, đúng hàng**: 5 sản phẩm thật (định tuyến theo slug) có ảnh thật từ `/images/photos`, giá mono.
6. **Cần con số, không cần lời chào**: band khép, CTA kép về `/san-pham` + `/pc-builds`.

## Chuyển động

- Một khoảnh khắc chủ đạo duy nhất: **các phần khai triển trượt vào ô lưới** khi hero vào viewport (`motion`, easeOut, `useReducedMotion` tắt tức thì).
- **Press-physics**: nút chìm vào hốc — rest có đĩa `0_2px_0` + inset highlight 1px; press dịch chuyển 2px và đảo thành inset shadow recessed (âm thanh "keycap", không phải neobrutal stamp).
- Không window-scroll listener, không chồng micro-animation.

## A11y & chất lượng (craft-floor)

- Contrast: text phụ nhỏ nâng lên `zinc-400` (≥ 4.5:1) trên nền `zinc-900/950`; headline `zinc-50`; CTA trắng/đỏ ~7.6:1.
- `::selection` theme theo brand đỏ/trắng toàn app.
- Focus: `focus-visible:ring` rõ trên mọi link/button landing (ring đỏ cho CTA/nút sống).
- `prefers-reduced-motion`: tắt stagger + marquee; giữ trạng thái tĩnh.
- Detector `impeccable.detect --json` trên toàn bộ file thay đổi trong arc này: **0 nguyên văn nào trên bề mặt landing**; 6 warning còn lại đều là pattern hover `bg-red-50` cũ của catalog (chuyển nguyên văn từ trang cũ, chỉ chạm khi hover kèm đổi màu chữ) — ngoài phạm vi thế giới mới.

## Cấu trúc code

- `frontend/app/page.tsx` — server component, fetch thật (builds/categories/products theo slug), font Saira+JetBrains qua next/font (vars `--font-display`/`--font-data`).
- `frontend/components/landing/LandingHeroDiagram.tsx` (client, motion) + `BomMarquee.tsx` (client, CSS marquee).
- Viewport: `bg-zinc-950 font-display` trên root, mono qua `.font-data`.

## Quyết định kiến trúc đi cùng

- Catalog cũ của `/` (filter, grid, pagination, empty state) chuyển nguyên vẹn sang **`/san-pham`**; mọi link `?category=`/search action trong layout, CategoryNav, trang sản phẩm đổi sang `/san-pham`.
- Xóa các component marketing cũ giữ claim bịa: `HeroSection`, `FeatureGrid`, `TrustBadges`, `PcBuildTeaser` (số ảo "10K+ sản phẩm", "giao 2h", "tư vấn 24/7").
- Landing dynamic (fetch `no-store`) — giá luôn theo kho.

## Chiến dịch: Trung Thu — "Trăng trong khung đo"

Banner promo 30% toàn bộ linh kiện, cửa sổ **20/09 – 20/10** (utc+0700, `lib/promo.ts`), toàn bộ trang qua layout:

- **Single full-width banner** (mọi viewport, dưới header), thiết kế theo thẩm mỹ banner TTGShop (ttgshop.vn): nền sáng warm (cream→peach) + headline đỏ thẫm to + CTA **vermilion** `#e03e2d` + accent **gold** (`#f2a11e`/`#e3b23c`) — phân tích màu thật 3 banner TTG (chiếm phần lớn nền ấm sáng `#e0e0c0` + chữ đỏ thẫm + cam) cho thấy họ không dùng teal trong banner sale. Nghệ thuật 100% SVG (`components/promo/MidAutumnArt.tsx`): trăng rằm có thỏ geometric ngồi trong quầng, chùm đèn lồng thả mép trên, sao bốn cánh, mây blob; graticule cột mờ giữ tín hiệu song sinh Clean-Build của site. Dismiss + cửa sổ ngày như trên; lúc trước đã bỏ 2 side rails (fixed trái/phải từ `2xl`).
- **Font**: chuyển `next/font/google` → **@fontsource self-host** (Saira Variable + JetBrains Mono Variable) để build deterministic (Docker build không phụ thuộc mạng ngoài; lỗi Turbopack resolve font đã gặp ở container).
- Lưu ý: chỉ là frontend campaign; chưa có logic áp giá 30% ở backend (không có field promo/price override trong schema).

## HTTPS (edge nginx)

- Nginx edge phục vụ **443 TLS** (HTTP 80 `301` → HTTPS), cert trong `nginx/certs/pcstore.{crt,key}` cấp bằng **mkcert v1.4.4** (CA local đã cài vào trust store Windows: `C:\Users\thebi\AppData\Local\mkcert`) — trình duyệt Chrome/Edge/Windows trên máy này **không còn cảnh báo** "not secure" cho `localhost` / `127.0.0.1` / LAN `192.168.174.1`. Cert hết hạn 06/01/2029; renew: `mkcert -install` (nếu cần) rồi `mkcert -cert-file nginx\certs\pcstore.crt -key-file nginx\certs\pcstore.key localhost 127.0.0.1 192.168.174.1` + `up -d --no-deps --force-recreate nginx`.
- Lưu ý: client Windows dùng **schannel** (vd `curl.exe`) đòi revocation check → fail `CRYPT_E_NO_REVOCATION_CHECK` (mkcert không có CRL/OCSP); dùng `curl --ssl-no-revoke`. Máy khác muốn hết cảnh báo phải tự cài CA mkcert (`mkcert -install`) hoặc cài file root.
- Swapped hướng certbot: thả bundle Let's Encrypt vào đúng 2 đường mount `/etc/nginx/certs/pcstore.{crt,key}` rồi `docker compose -f docker-compose.yml -f docker-compose.lb.yml up -d --no-deps --force-recreate nginx` — config không đổi; nên thêm SAN/Wildcard domain. Yêu cầu certbot: domain public trỏ về IP này + port 80 mở internet (HTTP-01).
- Các URL app trên LB đã sang `https://localhost` (build arg `NEXT_PUBLIC_APP_URL`, `CORS_ORIGIN`, `PAYMENT_VNPAY_RETURN_URL`); HSTS `max-age=63072000`.

## Mã hóa field trong DB (field-level encryption)

- **AES-256-GCM** (`backend/src/crypto/crypto.service.ts`, `@Global` `CryptoModule`), key từ env **`ENCRYPTION_KEY`** (base64 của 32 bytes; bắt buộc, thiếu là app fail startup). Format lưu: `enc:v1:iv:tag:ct` (mỗi thành phần base64url, base64url không chứa `:` nên split an toàn).
- **~ Field đang mã hóa (Order)**: `receiverName`, `receiverPhone`, `receiverAddress`, `note`. Encrypt ở `OrderService.create`; decrypt ở `toView` (create response + `myOrders` + `myOrder`) và `InvoicesService.buildPdf`. Dữ liệu cũ plaintext vẫn đọc được qua fallback (không prefix → trả nguyên giá trị).
- 2 stub spec cũ của auth (`providers:[AuthService]`/`controllers:[AuthController]` thiếu dependency) vốn đã fail — không phụ thuộc thay đổi này.
- **Quan trọng**: không mã hóa các field dùng để lookup/index/unique (vd `email`): encrypt thường sẽ phá tìm kiếm; nếu cần phải thêm sidecar HMAC. `User.passwordHash` / `RefreshToken.tokenHash` là hash — không encrypt. `Payment.clientSecret`/`payload` chưa mã hóa (PAYMENT_PROVIDER=mock trong dev); khi chuyển sang Stripe/VNPAY thật nên encrypt tiếp `clientSecret`.