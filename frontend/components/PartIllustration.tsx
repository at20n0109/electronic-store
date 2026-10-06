'use client';

import Image from 'next/image';
import { useState } from 'react';
import { PHOTOS, PRODUCT_PHOTOS } from '@/lib/photos';

type Props = {
  slug?: string | null;
  product?: string | null;
  className?: string;
};

function CpuArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="CPU" className="h-full w-full">
      <defs>
        <linearGradient id="cpuBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="cpuBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#cpuBg)" />
      <rect x="40" y="40" width="320" height="220" rx="16" fill="#0b1220" stroke="#334155" strokeWidth="2" />
      <rect x="78" y="78" width="244" height="144" rx="10" fill="url(#cpuBody)" stroke="#1e293b" strokeWidth="3" />
      <rect x="102" y="102" width="196" height="96" rx="6" fill="#e2e8f0" />
      <rect x="118" y="118" width="164" height="64" rx="4" fill="#1f2937" />
      <text x="200" y="156" textAnchor="middle" fill="#f59e0b" fontSize="26" fontWeight="bold" fontFamily="monospace">CPU CORE</text>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="116" y={88 + i * 16} width="10" height="6" rx="1" fill="#f8723c" />
          <rect x="274" y={88 + i * 16} width="10" height="6" rx="1" fill="#f8723c" />
          <rect x={78 + i * 16} y="104" width="6" height="10" rx="1" fill="#f8723c" />
          <rect x={78 + i * 16} y="186" width="6" height="10" rx="1" fill="#f8723c" />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="160" y="40" width="20" height="10" rx="2" fill="#38bdf8" />
          <rect x="220" y="40" width="20" height="10" rx="2" fill="#38bdf8" />
          <rect x="160" y="250" width="20" height="10" rx="2" fill="#38bdf8" />
          <rect x="220" y="250" width="20" height="10" rx="2" fill="#38bdf8" />
        </g>
      ))}
    </svg>
  );
}

function GpuArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="GPU" className="h-full w-full">
      <defs>
        <linearGradient id="gpuBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a1a3a" />
          <stop offset="1" stopColor="#1f1232" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#gpuBg)" />
      <path d="M60 70 L340 70 L340 250 L60 250 Z" fill="#171522" stroke="#4c3a6b" strokeWidth="2" rx="10" />
      <rect x="80" y="92" width="240" height="48" rx="6" fill="#0d0b18" />
      <circle cx="120" cy="116" r="20" fill="#312a4d" stroke="#7c5cd6" strokeWidth="2" />
      <circle cx="120" cy="116" r="9" fill="#6d28d9" />
      <circle cx="120" cy="116" r="4" fill="#c4b5fd" />
      <circle cx="168" cy="98" r="12" fill="#312a4d" stroke="#7c5cd6" strokeWidth="1.5" />
      <circle cx="168" cy="98" r="5" fill="#9333ea" />
      <text x="256" y="124" textAnchor="middle" fill="#a78bfa" fontSize="18" fontWeight="bold" fontFamily="monospace">NVIDIA</text>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={84 + i * 26} y="150" width="18" height="16" rx="2" fill="#22203a" stroke="#4c3a6b" />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={110 + i * 34} y="196" width="24" height="42" rx="3" fill="#1d1a30" stroke="#4c3a6b" />
          <rect x={118 + i * 34} y="204" width="8" height="34" rx="2" fill="#6d28d9" />
          <rect x={70 + i * 120} y="252" width="64" height="10" rx="2" fill="#8b5cf6" />
        </g>
      ))}
    </svg>
  );
}

function MainboardArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Mainboard" className="h-full w-full">
      <defs>
        <linearGradient id="mbBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a2b1a" />
          <stop offset="1" stopColor="#0f1a0f" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#mbBg)" />
      <rect x="30" y="40" width="340" height="220" rx="12" fill="#12361a" stroke="#22c55e" strokeWidth="2" />
      <rect x="150" y="110" width="100" height="100" rx="6" fill="#0f2a14" stroke="#16a34a" />
      <rect x="166" y="126" width="68" height="68" rx="4" fill="#1b4a24" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={66 + i * 30} y="70" width="22" height="18" rx="2" fill="#14532d" stroke="#22c55e" />
          <rect x={282 + i * 18} y="70" width="14" height="24" rx="2" fill="#0c2e14" stroke="#16a34a" />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="70" y={170 + i * 18} width="44" height="8" rx="2" fill="#166534" stroke="#22c55e" />
      ))}
      <rect x="58" y="60" width="70" height="14" rx="3" fill="#e2e8f0" stroke="#94a3b8" />
      <rect x="60" y="62" width="40" height="10" rx="2" fill="#0f172a" />
      <rect x="150" y="68" width="34" height="26" rx="3" fill="#7e22ce" stroke="#c084fc" />
      <text x="254" y="270" textAnchor="middle" fill="#bbf7d0" fontSize="15" fontWeight="bold" fontFamily="monospace">MAINBOARD</text>
    </svg>
  );
}

function RamArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="RAM" className="h-full w-full">
      <defs>
        <linearGradient id="ramBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b2614" />
          <stop offset="1" stopColor="#1a160c" />
        </linearGradient>
        <linearGradient id="ramBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f3020" />
          <stop offset="1" stopColor="#241b12" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#ramBg)" />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={90 + i * 130} y="60" width="100" height="180" rx="8" fill="url(#ramBody)" stroke="#f59e0b" strokeWidth="2" />
          <path d={`M${100 + i * 130} 90 L${180 + i * 130} 90 L${180 + i * 130} 210 L${100 + i * 130} 210 Z`} fill="#0c0a06" />
          {[0, 1, 2, 3, 4, 5, 6].map((j) => (
            <g key={j}>
              <rect x={132 + i * 130} y={100 + j * 16} width="4" height="6" rx="1" fill="#f59e0b" />
              <rect x={142 + i * 130} y={100 + j * 16} width="4" height="6" rx="1" fill="#fbbf24" />
              <rect x={106 + i * 130} y={98 + j * 18} width="20" height="4" rx="1" fill="#78350f" />
            </g>
          ))}
          <rect x={106 + i * 130} y="228" width="68" height="8" rx="3" fill="#d97706" />
        </g>
      ))}
      <rect x="72" y="52" width="36" height="10" rx="3" fill="#b45309" stroke="#f59e0b" />
      <text x="200" y="272" textAnchor="middle" fill="#fcd34d" fontSize="15" fontWeight="bold" fontFamily="monospace">DDR5 6400MHz</text>
    </svg>
  );
}

function StorageArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Storage" className="h-full w-full">
      <defs>
        <linearGradient id="stBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14262e" />
          <stop offset="1" stopColor="#0a161c" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#stBg)" />
      <rect x="60" y="70" width="280" height="150" rx="14" fill="#1e3a47" stroke="#22d3ee" strokeWidth="2" />
      <rect x="80" y="90" width="240" height="110" rx="8" fill="#274b5c" />
      {[0, 1, 2, 3, 4].map((i) => (
        <polygon key={i} points={`${100 + i * 44},140 ${128 + i * 44},124 ${156 + i * 44},140 ${128 + i * 44},156`} fill="#0ea5e9" opacity="0.85" />
      ))}
      <rect x="95" y="180" width="210" height="4" rx="2" fill="#0c4a6e" />
      <rect x="95" y="176" width="120" height="3" rx="1.5" fill="#38bdf8" />
      <rect x="300" y="240" width="70" height="12" rx="4" fill="#164e63" stroke="#22d3ee" />
      <text x="200" y="66" textAnchor="middle" fill="#67e8f9" fontSize="16" fontWeight="bold" fontFamily="monospace">NVMe 1000GB/s</text>
      <text x="200" y="250" textAnchor="middle" fill="#67e8f9" fontSize="13" fontFamily="monospace">SSD M.2</text>
    </svg>
  );
}

function PsuArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="PSU" className="h-full w-full">
      <defs>
        <linearGradient id="psuBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2a2a" />
          <stop offset="1" stopColor="#171717" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#psuBg)" />
      <rect x="40" y="60" width="320" height="170" rx="12" fill="#262626" stroke="#525252" strokeWidth="2" />
      <circle cx="120" cy="145" r="40" fill="#0f0f0f" stroke="#44403c" strokeWidth="3" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${120 + 34 * Math.cos(i * 1.57)} ${145 + 34 * Math.sin(i * 1.57)} C${120 + 14 * Math.cos(i * 1.57)} ${145 + 14 * Math.sin(i * 1.57)} ${120 + 20 * Math.cos((i + 0.5) * 1.57)} ${145 + 20 * Math.sin((i + 0.5) * 1.57)} ${120 + 34 * Math.cos((i + 0.5) * 1.57)} ${145 + 34 * Math.sin((i + 0.5) * 1.57)}`} stroke="#ef4444" strokeWidth="5" fill="none" />
      ))}
      <circle cx="120" cy="145" r="12" fill="#3f3f3f" />
      <rect x="190" y="85" width="30" height="12" rx="2" fill="#dc2626" />
      <rect x="190" y="105" width="30" height="12" rx="2" fill="#fbbf24" />
      <rect x="190" y="125" width="30" height="12" rx="2" fill="#22c55e" />
      <text x="240" y="185" fill="#a3a3a3" fontSize="16" fontWeight="bold" fontFamily="monospace">850W 80+</text>
      <rect x="190" y="160" width="90" height="8" rx="4" fill="#eab308" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={150 + i * 34} y="200" width="26" height="12" rx="2" fill="#1c1c1c" stroke="#525252" />
        </g>
      ))}
      <text x="200" y="262" textAnchor="middle" fill="#a3a3a3" fontSize="14" fontFamily="monospace">POWER SUPPLY</text>
    </svg>
  );
}

function CaseArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Case" className="h-full w-full">
      <defs>
        <linearGradient id="caseBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b1215" />
          <stop offset="1" stopColor="#170a0c" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#caseBg)" />
      <path d="M100 50 L300 50 L340 90 L340 250 L60 250 L60 90 Z" fill="#1d0f12" stroke="#e11d48" strokeWidth="2" />
      <rect x="96" y="70" width="208" height="168" rx="6" fill="#0d0608" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="118" y={90 + i * 20} width="164" height="10" rx="3" fill="#29141a" stroke="#e11d48" />
      ))}
      <circle cx="232" cy="200" r="26" fill="#0d0608" stroke="#be123c" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${232 + 22 * Math.cos(i * 1.57)} ${200 + 22 * Math.sin(i * 1.57)} L${232 + 22 * Math.cos((i + 0.5) * 1.57)} ${200 + 22 * Math.sin((i + 0.5) * 1.57)} L${232 + 10 * Math.cos((i + 0.5) * 1.57)} ${200 + 10 * Math.sin((i + 0.5) * 1.57)} L${232 + 10 * Math.cos(i * 1.57)} ${200 + 10 * Math.sin(i * 1.57)} Z`} fill="#ef4444" />
      ))}
      <circle cx="302" cy="86" r="6" fill="#22d3ee" />
      <circle cx="318" cy="86" r="6" fill="#a78bfa" />
      <rect x="122" y="192" width="60" height="34" rx="4" fill="#38131c" stroke="#e11d48" />
      <text x="200" y="272" textAnchor="middle" fill="#fb7185" fontSize="15" fontWeight="bold" fontFamily="monospace">GAMING CASE RGB</text>
    </svg>
  );
}

function CoolingArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Cooling" className="h-full w-full">
      <defs>
        <linearGradient id="clBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0e2f33" />
          <stop offset="1" stopColor="#07191c" />
        </linearGradient>
        <linearGradient id="fanCenter" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#clBg)" />
      <circle cx="200" cy="150" r="96" fill="#0a1c20" stroke="#0891b2" strokeWidth="3" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a0 = (i / 6) * Math.PI * 2;
        const a1 = a0 + Math.PI * 0.42;
        return (
          <path
            key={i}
            d={`M${200 + 40 * Math.cos(a0)} ${150 + 40 * Math.sin(a0)} C${200 + 88 * Math.cos(a0)} ${150 + 88 * Math.sin(a0)} ${200 + 88 * Math.cos(a1)} ${150 + 88 * Math.sin(a1)} ${200 + 40 * Math.cos(a1)} ${150 + 40 * Math.sin(a1)} Z`}
            fill="#134e4a"
            stroke="#2dd4bf"
          />
        );
      })}
      <circle cx="200" cy="150" r="34" fill="url(#fanCenter)" />
      <circle cx="200" cy="150" r="14" fill="#0e7490" />
      <circle cx="200" cy="150" r="5" fill="#cffafe" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={30 + i * 36} y="54" width="26" height="10" rx="2" fill="#155e63" stroke="#2dd4bf" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={30 + i * 36} y="236" width="26" height="10" rx="2" fill="#155e63" stroke="#2dd4bf" />
      ))}
      <text x="200" y="40" textAnchor="middle" fill="#5eead4" fontSize="15" fontWeight="bold" fontFamily="monospace">AIO 240mm</text>
    </svg>
  );
}

function MonitorArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Monitor" className="h-full w-full">
      <defs>
        <linearGradient id="mnBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e2338" />
          <stop offset="1" stopColor="#111423" />
        </linearGradient>
        <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#mnBg)" />
      <rect x="45" y="45" width="310" height="185" rx="10" fill="#20263f" stroke="#6366f1" strokeWidth="2" />
      <rect x="58" y="58" width="284" height="159" rx="6" fill="url(#screen)" />
      <path d="M70 205 L330 205 L320 222 L80 222 Z" fill="#141a30" />
      <rect x="60" y="120" width="120" height="16" rx="4" fill="#1e3a8a" opacity="0.7" />
      <rect x="220" y="160" width="100" height="12" rx="4" fill="#312e81" opacity="0.7" />
      <circle cx="330" cy="80" r="5" fill="#c4b5fd" />
      <rect x="180" y="230" width="40" height="30" rx="4" fill="#1e2338" stroke="#6366f1" />
      <rect x="120" y="260" width="160" height="12" rx="4" fill="#2a3150" />
      <text x="200" y="288" textAnchor="middle" fill="#a5b4fc" fontSize="13" fontWeight="bold" fontFamily="monospace">144Hz GAMING</text>
    </svg>
  );
}

function LaptopArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Laptop" className="h-full w-full">
      <defs>
        <linearGradient id="lpBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#251a33" />
          <stop offset="1" stopColor="#150e1f" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#lpBg)" />
      <rect x="110" y="40" width="180" height="125" rx="10" fill="#1d122a" stroke="#8b5cf6" strokeWidth="2" />
      <rect x="122" y="52" width="156" height="100" rx="5" fill="#31284a" />
      <rect x="132" y="62" width="136" height="80" rx="3" fill="#0b0613" />
      <circle cx="280" cy="58" r="3" fill="#c4b5fd" />
      <path d="M90 175 L310 175 L340 235 L60 235 Z" fill="#1d122a" stroke="#8b5cf6" strokeWidth="2" />
      <rect x="108" y="184" width="184" height="8" rx="3" fill="#2a2140" />
      <rect x="202" y="186" width="12" height="4" rx="2" fill="#8b5cf6" />
      <rect x="170" y="200" width="120" height="16" rx="4" fill="#3b2f55" />
      <rect x="190" y="228" width="160" height="4" rx="2" fill="#251c36" />
      <text x="200" y="272" textAnchor="middle" fill="#c4b5fd" fontSize="14" fontWeight="bold" fontFamily="monospace">RTX GAMING LAPTOP</text>
    </svg>
  );
}

function PeripheralArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Peripheral" className="h-full w-full">
      <defs>
        <linearGradient id="peBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2017" />
          <stop offset="1" stopColor="#160f0a" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#peBg)" />
      <rect x="60" y="170" width="280" height="30" rx="8" fill="#241a12" stroke="#f59e0b" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <g key={i}>
          <rect x={72 + i * 26} y="162" width="18" height="22" rx="3" fill="#312416" stroke="#d97706" />
          <text x={72 + i * 26 + 9} y="177" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="monospace">{String.fromCharCode(65 + (i % 26))}</text>
        </g>
      ))}
      <ellipse cx="310" cy="205" rx="52" ry="30" fill="#1d140e" stroke="#e11d48" strokeWidth="2" />
      <ellipse cx="310" cy="205" rx="30" ry="16" fill="#0b0705" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={298 + i * 2} y="128" width="2" height="30" fill="#e11d48" opacity="0.5" />
      ))}
      <rect x="294" y="158" width="12" height="8" rx="2" fill="#45d483" />
      <rect x="314" y="158" width="12" height="8" rx="2" fill="#45d483" />
      <text x="200" y="268" textAnchor="middle" fill="#fcd34d" fontSize="14" fontWeight="bold" fontFamily="monospace">KEYBOARD + MOUSE</text>
    </svg>
  );
}

function GenericArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Linh kien" className="h-full w-full">
      <defs>
        <linearGradient id="geBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#27272a" />
          <stop offset="1" stopColor="#18181b" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#geBg)" />
      <circle cx="200" cy="150" r="90" fill="none" stroke="#ef4444" strokeWidth="10" strokeDasharray="18 14" />
      <text x="200" y="164" textAnchor="middle" fill="#fbbf24" fontSize="42" fontWeight="bold" fontFamily="monospace">LK</text>
    </svg>
  );
}

const ART: Record<string, () => React.ReactElement> = {
  cpu: CpuArt,
  gpu: GpuArt,
  mainboard: MainboardArt,
  ram: RamArt,
  storage: StorageArt,
  psu: PsuArt,
  case: CaseArt,
  cooling: CoolingArt,
  monitor: MonitorArt,
  laptop: LaptopArt,
  peripheral: PeripheralArt,
};

export function PartIllustration({ slug, product, className }: Props) {
  const [failed, setFailed] = useState(false);
  const byProduct = product ? PRODUCT_PHOTOS[product] : undefined;
  const photo = byProduct ?? (slug ? PHOTOS[slug] : undefined);
  const Fallback = (slug && ART[slug]) || GenericArt;

  if (photo && !failed) {
    return (
      <div className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${className ?? ''}`}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Fallback />
    </div>
  );
}