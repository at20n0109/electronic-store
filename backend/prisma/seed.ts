import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});

const prisma = new PrismaClient({ adapter });

const categories = [
  { name: 'CPU', slug: 'cpu' },
  { name: 'Mainboard', slug: 'mainboard' },
  { name: 'GPU', slug: 'gpu' },
  { name: 'RAM', slug: 'ram' },
  { name: 'Ổ cứng', slug: 'storage' },
  { name: 'Nguồn', slug: 'psu' },
  { name: 'Vỏ máy', slug: 'case' },
  { name: 'Tản nhiệt', slug: 'cooling' },
];

type SeedProduct = {
  sku: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
};

const products: SeedProduct[] = [
  {
    sku: 'CPU-R7-7800X3D',
    name: 'AMD Ryzen 7 7800X3D - 8C/16T, 4.2GHz',
    category: 'cpu',
    description:
      'CPU 8 nhân/16 luồng, 3D V-Cache 96MB, nền tảng AM5, TDP 120W. Lựa chọn hàng đầu cho gaming.',
    price: 10990000,
    stock: 25,
  },
  {
    sku: 'CPU-R5-7600',
    name: 'AMD Ryzen 5 7600 - 6C/12T, 3.8GHz',
    category: 'cpu',
    description:
      'CPU 6 nhân/12 luồng, nền tảng AM5, tích hợp iGPU, TDP 65W, tiết kiệm điện năng.',
    price: 5490000,
    stock: 30,
  },
  {
    sku: 'CPU-I5-14600KF',
    name: 'Intel Core i5-14600KF - 14C/20T, 3.5GHz',
    category: 'cpu',
    description:
      'CPU 14 nhân/20 luồng, socket LGA1700, không tích hợp GPU, ép xung được.',
    price: 7490000,
    stock: 18,
  },
  {
    sku: 'GPU-RTX4070-12G',
    name: 'Gigabyte RTX 4070 WINDFORCE OC 12GB',
    category: 'gpu',
    description:
      'Card đồ họa 12GB GDDR6X, nâng cấp DLSS 3, hiệu năng mạnh cho gaming 2K/4K.',
    price: 12490000,
    stock: 12,
  },
  {
    sku: 'GPU-RTX4060-8G',
    name: 'MSI RTX 4060 VENTUS 2X 8GB',
    category: 'gpu',
    description:
      'Card đồ họa 8GB GDDR6, hỗ trợ ray tracing và DLSS 3, tản nhiệt 2 quạt yên tĩnh.',
    price: 7990000,
    stock: 15,
  },
  {
    sku: 'GPU-RX6600-8G',
    name: 'Sapphire RX 6600 PULSE 8GB',
    category: 'gpu',
    description:
      'Card đồ họa 8GB GDDR6, hiệu năng tốt cho gaming 1080p, giá phải chăng.',
    price: 5490000,
    stock: 20,
  },
  {
    sku: 'MB-B650-AORUS',
    name: 'Gigabyte B650 AORUS ELITE AX',
    category: 'mainboard',
    description:
      'Mainboard AM5, chipset B650, Wi-Fi 6E, hỗ trợ DDR5, PCIe 5.0, dành cho Ryzen 7000.',
    price: 4290000,
    stock: 14,
  },
  {
    sku: 'MB-B760-F',
    name: 'ASUS TUF GAMING B760-PLUS WIFI',
    category: 'mainboard',
    description:
      'Mainboard LGA1700, chipset B760, Wi-Fi 6, hỗ trợ DDR5, 3 khe NVMe M.2.',
    price: 3690000,
    stock: 16,
  },
  {
    sku: 'RAM-KF32G-6000',
    name: 'Kingston Fury Beast 32GB (2x16GB) DDR5 6000MHz',
    category: 'ram',
    description:
      'Bộ đôi RAM DDR5 32GB, tốc độ 6000MT/s, tản nhiệt nhôm, hỗ trợ EXPO/XMP.',
    price: 2790000,
    stock: 40,
  },
  {
    sku: 'RAM-KF16G-3200',
    name: 'Corsair Vengeance LPX 16GB (1x16GB) DDR4 3200MHz',
    category: 'ram',
    description:
      'RAM DDR4 16GB, 3200MHz, profile thấp, tương thích nhiều mainboard.',
    price: 890000,
    stock: 35,
  },
  {
    sku: 'SSD-WD850-1TB',
    name: 'WD Black SN850X 1TB NVMe PCIe 4.0',
    category: 'storage',
    description:
      'SSD NVMe 1TB, đọc 7300MB/s, ghi 6300MB/s, lý tưởng cho hệ điều hành và game.',
    price: 2790000,
    stock: 22,
  },
  {
    sku: 'SSD-SN770-500G',
    name: 'WD Blue SN580 500GB NVMe PCIe 4.0',
    category: 'storage',
    description:
      'SSD NVMe 500GB, đọc 4150MB/s, giá tốt cho máy cấu hình trung bình.',
    price: 1090000,
    stock: 28,
  },
  {
    sku: 'PSU-CM650-W',
    name: 'Cooler Master MWE 650W 80+ Bronze',
    category: 'psu',
    description:
      'Nguồn 650W 80+ Bronze, quạt 120mm, bảo vệ OVP/UVP/OPP, đủ cho cấu hình tầm trung.',
    price: 1490000,
    stock: 26,
  },
  {
    sku: 'PSU-RM850-G',
    name: 'Corsair RM850e 850W 80+ Gold', 
    category: 'psu',
    description:
      'Nguồn 850W 80+ Gold, modular hoàn toàn, quạt thấp tiếng ồn, ATX 3.0.',
    price: 2990000,
    stock: 10,
  },
  {
    sku: 'CASE-L216',
    name: 'Lian Li LANCOOL 216 Black',
    category: 'case',
    description:
      'Vỏ máy ATX, 2 quạt 160mm ARGB, kính cường lực, khả năng thoát nhiệt tốt.',
    price: 1890000,
    stock: 12,
  },
  {
    sku: 'CASE-H510',
    name: 'NZXT H510 Mid-Tower ATX',
    category: 'case',
    description:
      'Vỏ máy ATX phong cách tối giản, mặt trước solid, quản lý dây gọn gàng.',
    price: 1890000,
    stock: 8,
  },
  {
    sku: 'COOL-AK500',
    name: 'DeepCool AK500 Digital',
    category: 'cooling',
    description:
      'Tản nhiệt khí 2 quạt 120mm, 6 ống dẫn nhiệt, hiển thị nhiệt độ kỹ thuật số.',
    price: 1290000,
    stock: 20,
  },
  {
    sku: 'COOL-ARCTIC-360',
    name: 'Arctic Liquid Freezer III 360 A-RGB',
    category: 'cooling',
    description:
      'Tản nhiệt nước AIO 360mm, 3 quạt A-RGB, giữ nhiệt tốt cho CPU hiệu năng cao.',
    price: 3490000,
    stock: 9,
  },
];

async function main() {
  console.log('Seeding categories...');

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
  }

  console.log(`Seeding ${products.length} products...`);

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        status: 'ACTIVE',
        category: {
          connect: { slug: product.category },
        },
      },
      create: {
        sku: product.sku,
        name: product.name,
        slug: product.sku.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: {
          connect: { slug: product.category },
        },
      },
    });
  }

  const count = await prisma.product.count({ where: { status: 'ACTIVE' } });
  console.log(`Done. ${count} active products seeded.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });