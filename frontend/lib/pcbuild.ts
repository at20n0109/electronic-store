import type { PcBuildItem, PcBuildSlot, Product } from './types';

export const SLOT_LABELS: Record<string, string> = {
  cpu: 'Bộ xử lý (CPU)',
  gpu: 'Card đồ họa (GPU)',
  mainboard: 'Mainboard',
  ram: 'Bộ nhớ RAM',
  storage: 'Ổ cứng',
  psu: 'Nguồn',
  case: 'Vỏ máy',
  cooling: 'Tản nhiệt',
};

export const SLOT_ICONS: Record<string, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  mainboard: 'MB',
  ram: 'RAM',
  storage: 'SSD',
  psu: 'PSU',
  case: 'Case',
  cooling: 'Cool',
};

export const ALL_SLOTS: PcBuildSlot[] = [
  'cpu',
  'gpu',
  'mainboard',
  'ram',
  'storage',
  'psu',
  'case',
  'cooling',
];

const KEY_SPEC_FIELDS: Record<string, string[]> = {
  cpu: ['Nhân / Luồng', 'Xung nhịp turbo', 'Socket'],
  gpu: ['Bộ nhớ VRAM', 'Chip đồ họa', 'Công suất tiêu thụ (TDP)'],
  mainboard: ['Chipset', 'Socket', 'Form factor'],
  ram: ['Dung lượng', 'Tốc độ', 'Loại bộ nhớ'],
  storage: ['Dung lượng', 'Tốc độ đọc', 'Giao diện'],
  psu: ['Công suất', 'Chứng nhận', 'Loại module'],
  case: ['Kiểu vỏ', 'Form factor hỗ trợ', 'GPU tối đa'],
  cooling: ['Loại tản nhiệt', 'Kích thước radiator', 'TDP hỗ trợ'],
};

export function getKeySpecs(product: Product, slot: string): string[] {
  const fields = KEY_SPEC_FIELDS[slot] ?? [];
  const preferred = fields
    .map((field) => product.specs?.[field])
    .filter((value): value is string => Boolean(value));
  if (preferred.length > 0) return preferred.slice(0, 2);
  return Object.values(product.specs ?? {}).slice(0, 2);
}

export type CompatIssue = {
  slot: string;
  message: string;
};

function spec(product: Product, key: string): string | undefined {
  return product.specs?.[key];
}

function parseIntFrom(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/\s/g, '').match(/(\d{2,5})/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function getSocket(product: Product): string | null {
  return spec(product, 'Socket') ?? null;
}

export function getMemoryType(product: Product): 'DDR4' | 'DDR5' | null {
  const ramType = spec(product, 'Loại bộ nhớ');
  if (ramType === 'DDR4' || ramType === 'DDR5') return ramType;

  const candidates = [
    spec(product, 'Khe cắm RAM'),
    spec(product, 'Hỗ trợ bộ nhớ'),
  ].filter(Boolean) as string[];

  if (candidates.some((value) => value.includes('DDR4'))) return 'DDR4';
  if (candidates.some((value) => value.includes('DDR5'))) return 'DDR5';
  return null;
}

export function getCpuTdp(product: Product): number | null {
  if (!product.category || product.category.slug !== 'cpu') return null;
  return parseIntFrom(spec(product, 'Công suất tiêu thụ (TDP)'));
}

export function getGpuTdp(product: Product): number | null {
  if (!product.category || product.category.slug !== 'gpu') return null;
  return parseIntFrom(spec(product, 'Công suất tiêu thụ (TDP)'));
}

export function getPsuWatt(product: Product): number | null {
  if (!product.category || product.category.slug !== 'psu') return null;
  return parseIntFrom(spec(product, 'Công suất'));
}

export function hasStockCooler(product: Product): boolean {
  const cooler = spec(product, 'Tản nhiệt đi kèm');
  if (!cooler) return true;
  return !cooler.trim().toLowerCase().startsWith('không');
}

export function getGpuLengthMm(product: Product): number | null {
  const size = spec(product, 'Kích thước');
  if (!size) return null;
  const match = size.match(/(\d{3})\s*mm/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function getCaseGpuClearanceMm(product: Product): number | null {
  if (!product.category || product.category.slug !== 'case') return null;
  return parseIntFrom(spec(product, 'GPU tối đa'));
}

function findItem(
  items: PcBuildItem[],
  slot: PcBuildSlot,
): PcBuildItem | undefined {
  return items.find((item) => item.slot === slot);
}

export function checkCompatibility(items: PcBuildItem[]): CompatIssue[] {
  const issues: CompatIssue[] = [];

  const cpu = findItem(items, 'cpu')?.product;
  const mainboard = findItem(items, 'mainboard')?.product;
  const ram = findItem(items, 'ram')?.product;
  const psu = findItem(items, 'psu')?.product;
  const gpu = findItem(items, 'gpu')?.product;
  const pcCase = findItem(items, 'case')?.product;
  const cooling = findItem(items, 'cooling')?.product;

  if (cpu && mainboard) {
    const cpuSocket = getSocket(cpu);
    const boardSocket = getSocket(mainboard);
    if (cpuSocket && boardSocket && cpuSocket !== boardSocket) {
      issues.push({
        slot: 'mainboard',
        message: `Socket không khớp: CPU dùng ${cpuSocket}, mainboard dùng ${boardSocket}. Hãy chọn mainboard cùng socket.`,
      });
    }
  }

  if (ram && mainboard) {
    const ramType = getMemoryType(ram);
    const boardType = getMemoryType(mainboard);
    if (ramType && boardType && ramType !== boardType) {
      issues.push({
        slot: 'ram',
        message: `Loại RAM không khớp: ${ramType} với mainboard hỗ trợ ${boardType}.`,
      });
    }
  }

  if (psu && (cpu || gpu)) {
    const psuWatt = getPsuWatt(psu);
    const cpuTdp = cpu ? getCpuTdp(cpu) : null;
    const gpuTdp = gpu ? getGpuTdp(gpu) : null;
    const totalTdp = (cpuTdp ?? 0) + (gpuTdp ?? 0);

    if (psuWatt && totalTdp > 0) {
      const recommended = Math.ceil((totalTdp / 0.7) / 50) * 50;
      if (psuWatt < recommended) {
        issues.push({
          slot: 'psu',
          message: `Nguồn ${psuWatt}W có thể thiếu dư địa cho cấu hình (khuyến nghị từ ~${recommended}W cho CPU + GPU).`,
        });
      }
    }
  }

  if (cpu && !cooling && !hasStockCooler(cpu)) {
    issues.push({
      slot: 'cooling',
      message: `${cpu.name} không kèm tản nhiệt - bạn nên bổ sung tản nhiệt phù hợp.`,
    });
  }

  if (gpu && pcCase) {
    const gpuLength = getGpuLengthMm(gpu);
    const clearance = getCaseGpuClearanceMm(pcCase);
    if (gpuLength && clearance && gpuLength > clearance) {
      issues.push({
        slot: 'case',
        message: `GPU dài ${gpuLength}mm vượt quá giới hạn ${clearance}mm của vỏ máy.`,
      });
    }
  }

  return issues;
}

export type Recommendation = {
  kind: 'compat' | 'upgrade' | 'downgrade' | 'accessory';
  slot: string;
  product?: Product;
  replaceProductId?: string;
  reason: string;
};

export function getRecommendations(
  items: PcBuildItem[],
  alternatives: Partial<Record<string, Product[]>>,
  budget: number,
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const total = items.reduce((sum, item) => sum + item.product.price, 0);
  const over = total - budget;
  const under = budget - total;
  const issues = checkCompatibility(items);

  for (const issue of issues) {
    const current = findItem(items, issue.slot as PcBuildSlot)?.product;
    const pool = alternatives[issue.slot] ?? [];
    const fix =
      current != null
        ? pool.find((candidate) => {
            const swapped = items.map((item) =>
              item.slot === issue.slot ? { ...item, product: candidate } : item,
            );
            return !checkCompatibility(swapped).some(
              (next) => next.slot === issue.slot,
            );
          })
        : pool[0];

    recommendations.push({
      kind: 'compat',
      slot: issue.slot,
      product: fix,
      replaceProductId:
        fix && current && fix.id !== current.id ? current.id : undefined,
      reason: fix
        ? `${issue.message} Đề xuất: ${fix.name} (${fix.price.toLocaleString('vi-VN')}đ).`
        : issue.message,
    });
  }

  if (over > 0) {
    const downgrades: Recommendation[] = [];

    for (const item of items) {
      const pool = alternatives[item.slot] ?? [];
      for (const candidate of pool) {
        const saving = item.product.price - candidate.price;
        if (saving <= 0) continue;
        if (candidate.stock <= 0) continue;
        downgrades.push({
          kind: 'downgrade',
          slot: item.slot,
          product: candidate,
          replaceProductId: item.product.id,
          reason: `Thay ${item.product.name} bằng ${candidate.name} để tiết kiệm ${saving.toLocaleString('vi-VN')}đ.`,
        });
      }
    }

    downgrades.sort((a, b) => {
      const saveA = items.find((i) => i.slot === a.slot)!.product.price - a.product!.price;
      const saveB = items.find((i) => i.slot === b.slot)!.product.price - b.product!.price;
      const gapA = Math.abs(saveA - over);
      const gapB = Math.abs(saveB - over);
      return gapA - gapB;
    });

    recommendations.push(...downgrades.slice(0, 3));
  } else if (under > 500000) {
    const upgrades: Array<{ rec: Recommendation; gain: number }> = [];

    for (const item of items) {
      const pool = alternatives[item.slot] ?? [];
      for (const candidate of pool) {
        const extra = candidate.price - item.product.price;
        if (extra <= 0 || extra > under || candidate.stock <= 0) continue;
        const swapped = items.map((it) =>
          it.slot === item.slot ? { ...it, product: candidate } : it,
        );
        const stillCompatible = checkCompatibility(swapped).every(
          (next) => next.slot !== item.slot,
        );
        if (!stillCompatible) continue;

        upgrades.push({
          rec: {
            kind: 'upgrade',
            slot: item.slot,
            product: candidate,
            replaceProductId: item.product.id,
            reason: `Nâng cấp ${SLOT_LABELS[item.slot] ?? item.slot} còn ${under.toLocaleString('vi-VN')}đ dư ngân sách.`,
          },
          gain: extra,
        });
      }
    }

    upgrades.sort((a, b) => b.gain - a.gain);
    recommendations.push(...upgrades.slice(0, 3).map((entry) => entry.rec));
  }

  const cpu = findItem(items, 'cpu')?.product;
  const hasCooling = Boolean(findItem(items, 'cooling'));
  if (cpu && !hasCooling && !hasStockCooler(cpu)) {
    const coolingPool = alternatives.cooling ?? [];
    const suggestion = coolingPool.find(
      (product) => product.price <= budget - total && product.stock > 0,
    );
    if (
      !recommendations.some(
        (rec) => rec.kind === 'compat' && rec.slot === 'cooling',
      )
    ) {
      recommendations.push({
        kind: 'accessory',
        slot: 'cooling',
        product: suggestion,
        reason: `${cpu.name} không đi kèm quạt CPU - nên thêm tản nhiệt để máy hoạt động ổn định.`,
      });
    }
  }

  return recommendations.slice(0, 6);
}
