export const PHOTOS: Record<string, { src: string; alt: string }> = {
  cpu: { src: '/images/photos/cpu.jpg', alt: 'CPU' },
  gpu: { src: '/images/photos/gpu.png', alt: 'VGA - Card đồ họa' },
  mainboard: { src: '/images/photos/mainboard.jpg', alt: 'Bo mạch chủ' },
  ram: { src: '/images/photos/ram.png', alt: 'RAM' },
  storage: { src: '/images/photos/storage.jpg', alt: 'Ổ cứng SSD' },
  psu: { src: '/images/photos/psu.jpg', alt: 'Nguồn máy tính' },
  case: { src: '/images/photos/case.jpg', alt: 'Vỏ case' },
  cooling: { src: '/images/photos/cooling.jpg', alt: 'Tản nhiệt' },
  monitor: { src: '/images/photos/monitor.jpg', alt: 'Màn hình' },
  laptop: { src: '/images/photos/laptop.png', alt: 'Laptop' },
  peripheral: { src: '/images/photos/peripheral.jpg', alt: 'Phụ kiện' },
};

export const PRODUCT_PHOTOS: Record<string, { src: string; alt: string }> = {
  'cpu-r7-7800x3d': { src: '/images/photos/cpu-r7-7800x3d.jpg', alt: 'AMD Ryzen 7 7800X3D' },
  'cpu-r5-7600': { src: '/images/photos/cpu-r5-7600.jpg', alt: 'AMD Ryzen 5 7600' },
  'cpu-r5-5600': { src: '/images/photos/cpu-r5-5600.jpg', alt: 'AMD Ryzen 5 5600' },
  'cpu-i5-14600kf': { src: '/images/photos/cpu-i5-14600kf.png', alt: 'Intel Core i5-14600KF' },
  'cpu-i3-12100f': { src: '/images/photos/cpu-i3-12100f.png', alt: 'Intel Core i3-12100F' },
  'cpu-i5-14400f': { src: '/images/photos/cpu-i5-14400f.png', alt: 'Intel Core i5-14400F' },
  'gpu-rtx4070-12g': { src: '/images/photos/gpu-rtx4070-12g.png', alt: 'Gigabyte RTX 4070 WINDFORCE OC 12GB' },
  'gpu-rtx4060-8g': { src: '/images/photos/gpu-rtx4060-8g.webp', alt: 'MSI RTX 4060 VENTUS 2X 8GB' },
  'gpu-rx6600-8g': { src: '/images/photos/gpu-rx6600-8g.jpg', alt: 'Sapphire RX 6600 PULSE 8GB' },
  'gpu-rx6500xt-4g': { src: '/images/photos/gpu-rx6500xt-4g.jpg', alt: 'Sapphire RX 6500 XT PULSE 4GB' },
  'gpu-rx7600-8g': { src: '/images/photos/gpu-rx7600-8g.png', alt: 'Gigabyte RX 7600 EAGLE OC 8GB' },
  'mb-b650-aorus': { src: '/images/photos/mb-b650-aorus.png', alt: 'Gigabyte B650 AORUS ELITE AX' },
  'mb-b650m-ds3h': { src: '/images/photos/mb-b650m-ds3h.png', alt: 'Gigabyte B650M DS3H' },
  'mb-a520m-gig': { src: '/images/photos/mb-a520m-gig.png', alt: 'Gigabyte A520M S2H' },
  'mb-b760-f': { src: '/images/photos/mb-b760-f.png', alt: 'ASUS TUF GAMING B760-PLUS WIFI' },
  'mb-b660m-ddr4': { src: '/images/photos/mb-b660m-ddr4.webp', alt: 'MSI PRO B660M-A DDR4' },
  'mb-h610m-asr': { src: '/images/photos/mb-h610m-asr.jpg', alt: 'ASRock H610M-HVS' },
  'ram-kf32g-6000': { src: '/images/photos/ram-kf32g-6000.jpg', alt: 'Kingston Fury Beast 32GB DDR5 6000MHz' },
  'ram-kf16g-3200': { src: '/images/photos/ram-kf16g-3200.png', alt: 'Corsair Vengeance LPX 16GB DDR4 3200MHz' },
  'ssd-wd850-1tb': { src: '/images/photos/ssd-wd850-1tb.png', alt: 'WD Black SN850X 1TB NVMe' },
  'ssd-sn770-500g': { src: '/images/photos/ssd-sn770-500g.png', alt: 'WD Blue SN580 500GB NVMe' },
  'ssd-nv2-1tb': { src: '/images/photos/ssd-nv2-1tb.jpg', alt: 'Kingston NV2 1TB NVMe' },
  'psu-cm650-w': { src: '/images/photos/psu-cm650-w.png', alt: 'Cooler Master MWE 650W 80+ Bronze' },
  'psu-rm850-g': { src: '/images/photos/psu-rm850-g.png', alt: 'Corsair RM850e 850W 80+ Gold' },
  'psu-cv550': { src: '/images/photos/psu-cv550.png', alt: 'Corsair CV550 550W 80+ Bronze' },
  'case-l216': { src: '/images/photos/case-l216.jpg', alt: 'Lian Li LANCOOL 216 Black' },
  'case-h510': { src: '/images/photos/case-h510.png', alt: 'NZXT H510 Mid-Tower ATX' },
  'case-mc300': { src: '/images/photos/case-mc300.png', alt: 'Mars Gaming MC300 Mid-Tower' },
  'cool-ak500': { src: '/images/photos/cool-ak500.jpg', alt: 'DeepCool AK500 Digital' },
  'cool-arctic-360': { src: '/images/photos/cool-arctic-360.png', alt: 'Arctic Liquid Freezer III 360 A-RGB' },
};

export function getProductPhoto(
  product?: { slug?: string | null } | null,
): { src: string; alt: string } | undefined {
  if (!product?.slug) return undefined;
  return PRODUCT_PHOTOS[product.slug];
}