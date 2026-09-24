import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-red-950 to-zinc-900">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-block rounded-full bg-red-600 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white">
              ⚡ Khuyến mãi đặc biệt
            </span>
            <h1 className="font-heading text-3xl font-bold leading-tight text-white md:text-5xl">
              Linh kiện PC chính hãng,<br />
              <span className="text-red-400">giá tốt nhất</span> thị trường
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-zinc-300 md:text-lg">
              CPU, GPU, Mainboard, RAM, Ổ cứng và đầy đủ linh kiện Build PC.
              Bảo hành chính hãng, tư vấn chuyên sâu, giao hàng nhanh 2 giờ.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/?category=cpu"
                className="inline-flex h-12 items-center rounded-lg bg-red-600 px-6 text-base font-semibold text-white transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                Mua ngay
              </Link>
              <Link
                href="/?sort=price_asc"
                className="inline-flex h-12 items-center rounded-lg border-2 border-white/20 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Xem khuyến mãi
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white backdrop-blur-sm transition-transform hover:scale-105">
                <span className="font-heading text-4xl font-bold">10K+</span>
                <span className="mt-2 text-sm font-medium text-zinc-300">Sản phẩm</span>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white backdrop-blur-sm transition-transform hover:scale-105">
                <span className="font-heading text-4xl font-bold">2Giờ</span>
                <span className="mt-2 text-sm font-medium text-zinc-300">Giao hàng</span>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white backdrop-blur-sm transition-transform hover:scale-105">
                <span className="font-heading text-4xl font-bold">15Ngày</span>
                <span className="mt-2 text-sm font-medium text-zinc-300">Đổi trả</span>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white backdrop-blur-sm transition-transform hover:scale-105">
                <span className="font-heading text-4xl font-bold">24/7</span>
                <span className="mt-2 text-sm font-medium text-zinc-300">Hỗ trợ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
