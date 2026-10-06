# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Người Việt Nam mua linh kiện máy tính / build PC (CPU, GPU, mainboard, RAM, ổ cứng, nguồn, vỏ case, tản nhiệt), có thể kèm laptop/màn hình/phụ kiện. Phân khúc phổ thông–tầm trung (4 build mẫu 10–40 triệu). Người mua hành động nhanh: so giá, chọn linh kiện, đặt hàng, thanh toán (mock).

## Product Purpose

Cửa hàng linh kiện máy tính & Build PC chính hãng: giá tốt, bảo hành uy tín, giao nhanh. Landing page phải khiến khách tin rằng đây là nơi mua linh kiện đáng tin, có cấu hình chuẩn, và lôi kéo vào xem catalog / đặt build.

## Positioning

Có sẵn build PC được nhân viên dựng theo ba mức ngân sách thật (10 / 20 / 30–40 triệu), bán linh kiện chính hãng với bộ lọc tìm kiếm đầy đủ thay vì danh sách tĩnh.

## Operating Context

Website tiếng Việt. Trang chủ hiện là catalog có FilterBar (search, danh mục, sort, lọc giá). Header/footer hiện dùng nền tối zinc-950 + accent đỏ (red-600), nút hình chữ nhật bo nhẹ. Backend NestJS + Prisma + Postgres; frontend Next.js 16 (App Router) + Tailwind v4. Đã có sẵn 41 ảnh sản phẩm thật trong `frontend/public/images/photos/`.

Giả định (chưa được xác nhận nguyên văn, gắn nhãn từ codebase): thương hiệu "PC Store", tagline "Cửa hàng linh kiện máy tính & Build PC chính hãng", HTML lang=vi, accent đỏ là sign mark của store.

## Capabilities and Constraints

- Catalog trên trang chủ HIỆN TẠI (`/`) với bộ lọc hoạt động (search/category/sort/minPrice/maxPrice) — sẽ dời sang `/san-pham`, giữ nguyên chức năng.
- 4 build PC mẫu (pc-10-trieu → 30-trieu): slug, budget, tier; mỗi build có 4–6 linh kiện với ảnh thật.
- Danh mục: cpu, gpu, mainboard, ram, storage, psu, case, cooling (+ monitor, laptop, peripheral có thể rỗng).
- 30 sản phẩm seed với sku/slug, giá VND (Decimal), stock, specs JSON.
- Ảnh sản phẩm render qua map tĩnh `frontend/lib/photos.ts` (ProductImage trong DB trống).
- Giữ nguyên trải nghiệm catalog/landing không phá bộ lọc, pagination, các page sản phẩm đang hoạt động.
- Accessibility: dark mode tồn tại (dark: variant) — trang mới phải kế thừa.

## Brand Commitments

- Tên: "PC Store" (PC + "Store" đỏ).
- Ngôn ngữ: tiếng Việt.
- Accent đỏ trên nền tối — nên giữ nhận diện, không chuyển sang màu khác trừ khi bắt buộc.
- Không có bộ nhận diện chính thức (logo SVG AI cũ đã bị bỏ) — nhận diện là chữ + block đỏ.

## Evidence on Hand

- 41 ảnh sản phẩm chính hãng tại `frontend/public/images/photos/` (đặt tên theo slug, ext thật).
- 30 sản phẩm + 4 build trong `backend/prisma/seed.ts`.
- `frontend/lib/photos.ts` (map ảnh), `frontend/lib/api.ts` (API), `frontend/components/FilterBar.tsx` (bộ lọc).
- Không có testimonial/customer thật, không có số liệu bán hàng thật — KHÔNG bịa claim thương mại trên landing.

## Product Principles

- Sự thật là vốn: mọi thứ trên landing phải chạy được bằng dữ liệu thật của store (build thật, ảnh thật, danh mục thật), không bịa số liệu bán hàng hay khách hàng.
- Catalog là công cụ bán hàng: landing đưa người dùng vào `/san-pham` sâu được, bộ lọc giữ nguyên.
- Một nhận diện xuyên suốt: accent đỏ chính là ngôn ngữ thương hiệu, dùng nhất quán.
- Đánh dấu cấu hình là mục tiêu chính: build PC là lý do tồn tại khác biệt so với bán lẻ linh kiện đơn lẻ.
- Hiệu năng + a11y là chuẩn bắt buộc: ảnh nén sẵn, dark mode, prefers-reduced-motion.

## Accessibility & Inclusion

Website tiếng Việt, người dùng phổ thông. Giữ WCAG AA (tương phản), dark mode, prefers-reduced-motion, bàn phím điều hướng được.