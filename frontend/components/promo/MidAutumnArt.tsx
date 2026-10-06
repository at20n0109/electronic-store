/** Geometric Trung Thu art, TTGShop-style warm palette. */

export function Sparkle({
  size = 12,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M8 0 9.6 6.4 16 8 9.6 9.6 8 16 6.4 9.6 0 8 6.4 6.4Z" fill="currentColor" />
    </svg>
  );
}

export function CloudBlob({ className = '' }: { className?: string }) {
  return (
    <svg
      width="120"
      height="46"
      viewBox="0 0 120 46"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="34" cy="34" rx="34" ry="12" fill="currentColor" />
      <ellipse cx="70" cy="30" rx="42" ry="14" fill="currentColor" />
      <ellipse cx="104" cy="34" rx="24" ry="10" fill="currentColor" />
    </svg>
  );
}

export function Lantern({
  uid,
  dim = false,
  className = '',
}: {
  uid: string;
  dim?: boolean;
  className?: string;
}) {
  return (
    <svg
      width="30"
      height="52"
      viewBox="0 0 30 52"
      className={className}
      role="img"
      aria-label="Đèn lồng Trung Thu"
    >
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="1">
          {dim ? (
            <>
              <stop offset="0" stopColor="#ff7a4d" />
              <stop offset="1" stopColor="#c93a1f" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#ffb36b" />
              <stop offset="0.45" stopColor="#ff6a3d" />
              <stop offset="1" stopColor="#c93a1f" />
            </>
          )}
        </linearGradient>
      </defs>
      {/* string + cap + body */}
      <path d="M15 0v8" stroke="#8a5a2b" strokeWidth="1" fill="none" />
      <rect x="9" y="8" width="12" height="3" rx="1" fill="#efe3c8" stroke="#c9994f" strokeWidth="0.5" />
      <path
        d="M9 11 C9 26 7 34 15 34 C23 34 21 26 21 11 Z"
        fill="url(#${uid}-body)"
        stroke="#b3351a"
        strokeWidth="0.6"
      />
      <path
        d="M9 11 C13 18 17 18 21 11 M9 17 C13 24 17 24 21 17 M9 23 C13 30 17 30 21 23"
        fill="none"
        stroke="rgba(90,20,0,0.35)"
        strokeWidth="0.8"
      />
      {/* tassel */}
      <path d="M13 34c0 4 4 4 4 9M17 34c0 4-4 4-4 9" stroke="#d98c2b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function LanternString({ uid, className = '' }: { uid: string; className?: string }) {
  return (
    <div
      className={`flex items-start gap-5 ${className}`}
      role="img"
      aria-label="Chùm đèn lồng thả dây"
    >
      <span className="hidden sm:block">
        <Lantern uid={`${uid}-a`} dim />
      </span>
      <Lantern uid={`${uid}-b`} />
      <span className="hidden pt-2 sm:block">
        <Lantern uid={`${uid}-c`} dim />
      </span>
    </div>
  );
}

export function MoonOrb({
  uid,
  size = 200,
  className = '',
}: {
  uid: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="Trăng rằm Trung Thu với chú thỏ"
    >
      <defs>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.55" stopColor="#ffb36b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb36b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-moon`} cx="0.36" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffd9a8" />
          <stop offset="0.45" stopColor="#ff8b4f" />
          <stop offset="1" stopColor="#df4a20" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#${uid}-glow)`} />
      <circle cx="60" cy="60" r="46" fill={`url(#${uid}-moon)`} />
      <circle
        cx="60"
        cy="60"
        r="40"
        fill="none"
        stroke="rgba(120,30,0,0.35)"
        strokeWidth="0.8"
        strokeDasharray="1.5 3"
      />
      {/* craters */}
      <circle cx="42" cy="46" r="3" fill="rgba(120,30,0,0.25)" />
      <circle cx="72" cy="42" r="2" fill="rgba(120,30,0,0.22)" />
      <circle cx="76" cy="62" r="2.4" fill="rgba(120,30,0,0.2)" />
      {/* geometric rabbit */}
      <g fill="#fff6e8" opacity="0.95">
        <ellipse cx="52" cy="80" rx="11" ry="8.5" transform="rotate(-8 52 80)" />
        <circle cx="69" cy="78" r="6.5" />
        <ellipse cx="65" cy="66" rx="3" ry="6.5" transform="rotate(-18 65 66)" />
        <ellipse cx="73" cy="66" rx="3" ry="6.5" transform="rotate(14 73 66)" />
        <circle cx="41" cy="80" r="3.4" />
      </g>
    </svg>
  );
}