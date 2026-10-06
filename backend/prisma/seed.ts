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
  specs: Record<string, string>;
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
    specs: {
      'Hãng sản xuất': 'AMD',
      'Dòng sản phẩm': 'Ryzen 7',
      Socket: 'AM5',
      'Nhân / Luồng': '8 nhân / 16 luồng',
      'Xung nhịp cơ bản': '4.2 GHz',
      'Xung nhịp turbo': '5.0 GHz',
      'Bộ nhớ đệm': '96MB (3D V-Cache)',
      'Công nghệ cache': 'AMD 3D V-Cache',
      'Tiến trình sản xuất': 'TSMC 5nm',
      'Công suất tiêu thụ (TDP)': '120W',
      'Đồ họa tích hợp': 'AMD Radeon Graphics (2 CU)',
      'Hỗ trợ bộ nhớ': 'DDR5',
      'Tản nhiệt đi kèm': 'Không (nên dùng tản nhiệt riêng)',
      'Phụ kiện hỗ trợ': 'Ép xung hỗ trợ (PBO)',
    },
  },
  {
    sku: 'CPU-R5-7600',
    name: 'AMD Ryzen 5 7600 - 6C/12T, 3.8GHz',
    category: 'cpu',
    description:
      'CPU 6 nhân/12 luồng, nền tảng AM5, tích hợp iGPU, TDP 65W, tiết kiệm điện năng.',
    price: 5490000,
    stock: 30,
    specs: {
      'Hãng sản xuất': 'AMD',
      'Dòng sản phẩm': 'Ryzen 5',
      Socket: 'AM5',
      'Nhân / Luồng': '6 nhân / 12 luồng',
      'Xung nhịp cơ bản': '3.8 GHz',
      'Xung nhịp turbo': '5.1 GHz',
      'Bộ nhớ đệm': '32MB L3',
      'Tiến trình sản xuất': 'TSMC 4nm',
      'Công suất tiêu thụ (TDP)': '65W',
      'Đồ họa tích hợp': 'AMD Radeon Graphics (2 CU)',
      'Hỗ trợ bộ nhớ': 'DDR5',
      'Tản nhiệt đi kèm': 'Không (nên dùng tản nhiệt riêng)',
      'Phụ kiện hỗ trợ': 'Ép xung hỗ trợ (PBO)',
    },
  },
  {
    sku: 'CPU-I5-14600KF',
    name: 'Intel Core i5-14600KF - 14C/20T, 3.5GHz',
    category: 'cpu',
    description:
      'CPU 14 nhân/20 luồng, socket LGA1700, không tích hợp GPU, ép xung được.',
    price: 7490000,
    stock: 18,
    specs: {
      'Hãng sản xuất': 'Intel',
      'Dòng sản phẩm': 'Core i5 (14th Gen)',
      Socket: 'LGA1700',
      'Nhân / Luồng': '14 nhân (6P + 8E) / 20 luồng',
      'Xung nhịp P-core': '3.5 GHz / Turbo 5.3 GHz',
      'Xung nhịp E-core': '2.6 GHz / Turbo 4.0 GHz',
      'Bộ nhớ đệm': '24MB Intel Smart Cache',
      'Tiến trình sản xuất': 'Intel 7',
      'Công suất tiêu thụ (TDP)': '125W (MTP 181W)',
      'Đồ họa tích hợp': 'Không (bản KF)',
      'Hỗ trợ bộ nhớ': 'DDR5 / DDR4',
      'Tản nhiệt đi kèm': 'Không',
      'Phụ kiện hỗ trợ': 'Hỗ trợ ép xung (K-series)',
    },
  },
  {
    sku: 'GPU-RTX4070-12G',
    name: 'Gigabyte RTX 4070 WINDFORCE OC 12GB',
    category: 'gpu',
    description:
      'Card đồ họa 12GB GDDR6X, nâng cấp DLSS 3, hiệu năng mạnh cho gaming 2K/4K.',
    price: 12490000,
    stock: 12,
    specs: {
      'Hãng sản xuất': 'Gigabyte',
      'Chip đồ họa': 'NVIDIA GeForce RTX 4070',
      'Bộ nhớ VRAM': '12GB GDDR6X',
      'Bus bộ nhớ': '192-bit',
      'CUDA Core': '5888',
      'Xung nhịp Boost': '2475 MHz (OC)',
      'Công nghệ': 'DLSS 3, Ray Tracing, Frame Generation',
      'Cổng xuất hình': '3x DisplayPort 1.4a, 1x HDMI 2.1',
      'Khe cắm': 'PCIe 4.0 x16',
      'Hệ thống tản nhiệt': '3 quạt WINDFORCE',
      'Kích thước': 'Dài ~300mm (2.5 slot)',
      'Công suất tiêu thụ (TDP)': '200W',
      'Nguồn khuyến nghị': '650W',
      'Nguồn cắm thêm': '1x 8-pin PCIe',
    },
  },
  {
    sku: 'GPU-RTX4060-8G',
    name: 'MSI RTX 4060 VENTUS 2X 8GB',
    category: 'gpu',
    description:
      'Card đồ họa 8GB GDDR6, hỗ trợ ray tracing và DLSS 3, tản nhiệt 2 quạt yên tĩnh.',
    price: 7990000,
    stock: 15,
    specs: {
      'Hãng sản xuất': 'MSI',
      'Chip đồ họa': 'NVIDIA GeForce RTX 4060',
      'Bộ nhớ VRAM': '8GB GDDR6',
      'Bus bộ nhớ': '128-bit',
      'CUDA Core': '3072',
      'Xung nhịp Boost': '2460 MHz',
      'Công nghệ': 'DLSS 3, Ray Tracing',
      'Cổng xuất hình': '3x DisplayPort, 1x HDMI 2.1',
      'Khe cắm': 'PCIe 4.0 x8',
      'Hệ thống tản nhiệt': '2 quạt VENTUS 2X',
      'Kích thước': 'Dài ~244mm (2 slot)',
      'Công suất tiêu thụ (TDP)': '115W',
      'Nguồn khuyến nghị': '550W',
      'Nguồn cắm thêm': '1x 8-pin PCIe',
    },
  },
  {
    sku: 'GPU-RX6600-8G',
    name: 'Sapphire RX 6600 PULSE 8GB',
    category: 'gpu',
    description:
      'Card đồ họa 8GB GDDR6, hiệu năng tốt cho gaming 1080p, giá phải chăng.',
    price: 5490000,
    stock: 20,
    specs: {
      'Hãng sản xuất': 'Sapphire',
      'Chip đồ họa': 'AMD Radeon RX 6600',
      'Bộ nhớ VRAM': '8GB GDDR6',
      'Bus bộ nhớ': '128-bit',
      'Stream Processor': '1792',
      'Xung nhịp Boost': '2491 MHz',
      'Công nghệ': 'FidelityFX, Ray Accelerator',
      'Cổng xuất hình': '1x HDMI 2.1, 3x DisplayPort 1.4',
      'Khe cắm': 'PCIe 4.0 x8',
      'Hệ thống tản nhiệt': '2 quạt PULSE',
      'Kích thước': 'Dài ~240mm (2 slot)',
      'Công suất tiêu thụ (TDP)': '132W',
      'Nguồn khuyến nghị': '500W',
      'Nguồn cắm thêm': '1x 8-pin PCIe',
    },
  },
  {
    sku: 'MB-B650-AORUS',
    name: 'Gigabyte B650 AORUS ELITE AX',
    category: 'mainboard',
    description:
      'Mainboard AM5, chipset B650, Wi-Fi 6E, hỗ trợ DDR5, PCIe 5.0, dành cho Ryzen 7000.',
    price: 4290000,
    stock: 14,
    specs: {
      'Hãng sản xuất': 'Gigabyte',
      'Chipset': 'AMD B650',
      Socket: 'AM5',
      'Form factor': 'ATX',
      'Khe cắm RAM': '4 khe DDR5 (Dual Channel)',
      'Dung lượng RAM tối đa': '128GB',
      'Tốc độ RAM hỗ trợ': 'DDR5 6600+ (OC)',
      'Khe cắm mở rộng': '1x PCIe 4.0 x16, 2x PCIe 3.0 x1',
      'Khe lưu trữ M.2': '3x M.2 (PCIe 4.0)',
      'Khe SATA': '4x SATA III',
      'Mạng LAN': '2.5GbE',
      'Kết nối không dây': 'Wi-Fi 6E, Bluetooth 5.2',
      'Cổng USB': 'USB 3.2 Gen 2x2 Type-C, nhiều cổng USB 3.2/2.0',
      'Âm thanh': 'Realtek ALC897',
      'Hỗ trợ CPU': 'AMD Ryzen 7000 / 8000 / 9000',
    },
  },
  {
    sku: 'MB-B760-F',
    name: 'ASUS TUF GAMING B760-PLUS WIFI',
    category: 'mainboard',
    description:
      'Mainboard LGA1700, chipset B760, Wi-Fi 6, hỗ trợ DDR5, 3 khe NVMe M.2.',
    price: 3690000,
    stock: 16,
    specs: {
      'Hãng sản xuất': 'ASUS',
      'Chipset': 'Intel B760',
      Socket: 'LGA1700',
      'Form factor': 'ATX',
      'Khe cắm RAM': '4 khe DDR5 (Dual Channel)',
      'Dung lượng RAM tối đa': '192GB',
      'Tốc độ RAM hỗ trợ': 'DDR5 7800+ (OC)',
      'Khe cắm mở rộng': '1x PCIe 5.0 x16, 1x PCIe 4.0 x16 (x4), 2x PCIe 3.0 x1',
      'Khe lưu trữ M.2': '3x M.2 (PCIe 4.0)',
      'Khe SATA': '4x SATA III',
      'Mạng LAN': '2.5GbE',
      'Kết nối không dây': 'Wi-Fi 6, Bluetooth 5.2',
      'Cổng USB': 'USB 3.2 Gen 2, USB Type-C',
      'Hỗ trợ CPU': 'Intel Core 12th / 13th / 14th Gen',
      'Tính năng': 'PCB 6 lớp, VRM kín gió, ASUS Aura Sync RGB',
    },
  },
  {
    sku: 'RAM-KF32G-6000',
    name: 'Kingston Fury Beast 32GB (2x16GB) DDR5 6000MHz',
    category: 'ram',
    description:
      'Bộ đôi RAM DDR5 32GB, tốc độ 6000MT/s, tản nhiệt nhôm, hỗ trợ EXPO/XMP.',
    price: 2790000,
    stock: 40,
    specs: {
      'Hãng sản xuất': 'Kingston',
      'Dòng sản phẩm': 'FURY Beast',
      'Dung lượng': '32GB (2x16GB)',
      'Loại bộ nhớ': 'DDR5',
      'Tốc độ': '6000 MT/s',
      'Độ trễ CAS': 'CL40',
      'Điện áp': '1.35V',
      'Profile ép xung': 'AMD EXPO, Intel XMP 3.0',
      'Tiêu chuẩn': 'JEDEC DDR5',
      'Tản nhiệt': 'Nhôm tản nhiệt đen',
      'Chiều cao module': '34.9mm',
      'Số lượng thanh': '2 (Dual Channel)',
    },
  },
  {
    sku: 'RAM-KF16G-3200',
    name: 'Corsair Vengeance LPX 16GB (1x16GB) DDR4 3200MHz',
    category: 'ram',
    description:
      'RAM DDR4 16GB, 3200MHz, profile thấp, tương thích nhiều mainboard.',
    price: 890000,
    stock: 35,
    specs: {
      'Hãng sản xuất': 'Corsair',
      'Dòng sản phẩm': 'Vengeance LPX',
      'Dung lượng': '16GB (1x16GB)',
      'Loại bộ nhớ': 'DDR4',
      'Tốc độ': '3200 MHz',
      'Độ trễ CAS': 'CL16',
      'Điện áp': '1.35V',
      'Profile ép xung': 'Intel XMP 2.0',
      'Tản nhiệt': 'Nhôm tản nhiệt',
      'Chiều cao module': '34mm (Low Profile)',
      'Số lượng thanh': '1 (Single Channel)',
    },
  },
  {
    sku: 'SSD-WD850-1TB',
    name: 'WD Black SN850X 1TB NVMe PCIe 4.0',
    category: 'storage',
    description:
      'SSD NVMe 1TB, đọc 7300MB/s, ghi 6300MB/s, lý tưởng cho hệ điều hành và game.',
    price: 2790000,
    stock: 22,
    specs: {
      'Hãng sản xuất': 'Western Digital',
      'Dòng sản phẩm': 'WD_BLACK SN850X',
      'Dung lượng': '1TB',
      'Giao diện': 'NVMe PCIe 4.0 x4',
      'Form factor': 'M.2 2280',
      'Tốc độ đọc': 'Up to 7300 MB/s',
      'Tốc độ ghi': 'Up to 6300 MB/s',
      'Loại NAND': '3D NAND TLC',
      'Bộ nhớ cache': 'DRAM Cache',
      'TBW': '600 TBW',
      'Độ bền': '1.75 triệu giờ MTBF',
      'Nhiệt độ hoạt động': '0°C - 85°C',
      'Bảo hành': '5 năm',
    },
  },
  {
    sku: 'SSD-SN770-500G',
    name: 'WD Blue SN580 500GB NVMe PCIe 4.0',
    category: 'storage',
    description:
      'SSD NVMe 500GB, đọc 4150MB/s, giá tốt cho máy cấu hình trung bình.',
    price: 1090000,
    stock: 28,
    specs: {
      'Hãng sản xuất': 'Western Digital',
      'Dòng sản phẩm': 'WD Blue SN580',
      'Dung lượng': '500GB',
      'Giao diện': 'NVMe PCIe 4.0 x4',
      'Form factor': 'M.2 2280',
      'Tốc độ đọc': 'Up to 4150 MB/s',
      'Tốc độ ghi': 'Up to 4150 MB/s',
      'Loại NAND': '3D NAND TLC',
      'Bộ nhớ cache': 'HMB (không DRAM)',
      'TBW': '300 TBW',
      'Độ bền': '1.75 triệu giờ MTBF',
      'Bảo hành': '5 năm',
    },
  },
  {
    sku: 'PSU-CM650-W',
    name: 'Cooler Master MWE 650W 80+ Bronze',
    category: 'psu',
    description:
      'Nguồn 650W 80+ Bronze, quạt 120mm, bảo vệ OVP/UVP/OPP, đủ cho cấu hình tầm trung.',
    price: 1490000,
    stock: 26,
    specs: {
      'Hãng sản xuất': 'Cooler Master',
      'Dòng sản phẩm': 'MWE Bronze',
      'Công suất': '650W',
      'Chứng nhận': '80 PLUS Bronze',
      'Loại module': 'Non-Modular (cáp cố định)',
      'Form factor': 'ATX',
      'Quạt': 'Quạt 120mm',
      'Bảo vệ': 'OVP, UVP, OPP, SCP, OTP',
      'Cổng PCIe': '2x PCIe (6+2 pin)',
      'Cổng CPU': '1x EPS/ATX12V 4+4 pin',
      'Cổng SATA': '6x SATA',
      'Bảo hành': '5 năm',
    },
  },
  {
    sku: 'PSU-RM850-G',
    name: 'Corsair RM850e 850W 80+ Gold', 
    category: 'psu',
    description:
      'Nguồn 850W 80+ Gold, modular hoàn toàn, quạt thấp tiếng ồn, ATX 3.0.',
    price: 2990000,
    stock: 10,
    specs: {
      'Hãng sản xuất': 'Corsair',
      'Dòng sản phẩm': 'RM850e',
      'Công suất': '850W',
      'Chứng nhận': '80 PLUS Gold',
      'Loại module': 'Full Modular',
      'Form factor': 'ATX 3.0',
      'Quạt': 'Quạt 135mm FDB (low-noise)',
      'Bảo vệ': 'OVP, UVP, OPP, SCP, OTP',
      'Cổng PCIe': 'Cáp 12VHPWR (16-pin) cho RTX 40 series',
      'Cổng CPU': '2x EPS/ATX12V 4+4 pin',
      'Công nghệ': 'Modern Standby, AWSM',
      'Bảo hành': '7 năm',
    },
  },
  {
    sku: 'CASE-L216',
    name: 'Lian Li LANCOOL 216 Black',
    category: 'case',
    description:
      'Vỏ máy ATX, 2 quạt 160mm ARGB, kính cường lực, khả năng thoát nhiệt tốt.',
    price: 1890000,
    stock: 12,
    specs: {
      'Hãng sản xuất': 'Lian Li',
      'Dòng sản phẩm': 'LANCOOL 216',
      'Kiểu vỏ': 'Mid-Tower',
      'Form factor hỗ trợ': 'ATX, Micro-ATX, Mini-ITX, E-ATX',
      'Màu sắc': 'Đen',
      'Chất liệu': 'Thép + Kính cường lực',
      'Quạt đi kèm': '2x quạt 160mm ARGB (mặt trước)',
      'Tản nhiệt CPU tối đa': '176mm',
      'GPU tối đa': '392mm',
      'Khe mở rộng': '7',
      'Khay lưu trữ': '2x 3.5", 3x 2.5"',
      'Cổng kết nối': 'USB 3.0, USB Type-C, Audio',
      'Quản lý cáp': 'Có (che cáp phía sau)',
      'Kích thước': '480 x 228 x 480 mm',
    },
  },
  {
    sku: 'CASE-H510',
    name: 'NZXT H510 Mid-Tower ATX',
    category: 'case',
    description:
      'Vỏ máy ATX phong cách tối giản, mặt trước solid, quản lý dây gọn gàng.',
    price: 1890000,
    stock: 8,
    specs: {
      'Hãng sản xuất': 'NZXT',
      'Dòng sản phẩm': 'H510',
      'Kiểu vỏ': 'Mid-Tower',
      'Form factor hỗ trợ': 'ATX, Micro-ATX, Mini-ITX',
      'Màu sắc': 'Matte Black',
      'Chất liệu': 'Thép + Kính cường lực',
      'Quạt đi kèm': '2x quạt 120mm',
      'Tản nhiệt CPU tối đa': '165mm',
      'GPU tối đa': '381mm',
      'Khe mở rộng': '7',
      'Khay lưu trữ': '2x 2.5", 3x 3.5"',
      'Cổng kết nối': 'USB 3.1 Type-A, USB 3.1 Type-C, Audio',
      'Quản lý cáp': 'Có (NZXT Cable Management)',
      'Điểm nhấn': 'Góc kính cường lực, thiết kế tối giản',
    },
  },
  {
    sku: 'COOL-AK500',
    name: 'DeepCool AK500 Digital',
    category: 'cooling',
    description:
      'Tản nhiệt khí 2 quạt 120mm, 6 ống dẫn nhiệt, hiển thị nhiệt độ kỹ thuật số.',
    price: 1290000,
    stock: 20,
    specs: {
      'Hãng sản xuất': 'DeepCool',
      'Dòng sản phẩm': 'AK500 Digital',
      'Loại tản nhiệt': 'Tản nhiệt khí (Air Cooler)',
      'Quạt': '2x quạt 120mm',
      'Ống dẫn nhiệt': '6 ống đồng heatpipe',
      'Chiều cao': '160mm',
      'TDP hỗ trợ': 'Lên đến 250W',
      'Tính năng': 'Màn hình hiển thị nhiệt độ CPU',
      'Điều khiển': 'Phần mềm DeepCool',
      'Socket hỗ trợ': 'AM5, AM4, LGA1700, LGA1200',
      'Độ ồn': 'Thấp (PWM)',
      'Màu sắc': 'Đen',
    },
  },
  {
    sku: 'COOL-ARCTIC-360',
    name: 'Arctic Liquid Freezer III 360 A-RGB',
    category: 'cooling',
    description:
      'Tản nhiệt nước AIO 360mm, 3 quạt A-RGB, giữ nhiệt tốt cho CPU hiệu năng cao.',
    price: 3490000,
    stock: 9,
    specs: {
      'Hãng sản xuất': 'Arctic',
      'Dòng sản phẩm': 'Liquid Freezer III 360 A-RGB',
      'Loại tản nhiệt': 'Tản nhiệt nước AIO',
      'Kích thước radiator': '360mm',
      'Quạt': '3x quạt 120mm A-RGB',
      'Tốc độ quạt': 'Up to 2000 RPM',
      'Bộ làm lạnh': 'Pump tích hợp VRM fan',
      'TDP hỗ trợ': 'Lên đến 350W',
      'Điều khiển': 'PWM',
      'Socket hỗ trợ': 'AM5, AM4, LGA1700, LGA1200, LGA115x',
      'Chiều dày radiator': '38mm (thick radiator)',
      'Bảo hành': '6 năm',
      'Chiều cao RAM': 'Không xung đột (fan thin)',
    },
  },
  {
    sku: 'CPU-R5-5600',
    name: 'AMD Ryzen 5 5600 - 6C/12T, 4.4GHz',
    category: 'cpu',
    description:
      'CPU AM4 6 nhân/12 luồng, 32MB cache, TDP 65W, kèm quạt Wraith Stealth. Giá tốt cho build gaming phổ thông.',
    price: 2290000,
    stock: 40,
    specs: {
      'Hãng sản xuất': 'AMD',
      'Dòng sản phẩm': 'Ryzen 5',
      Socket: 'AM4',
      'Nhân / Luồng': '6 nhân / 12 luồng',
      'Xung nhịp cơ bản': '3.5 GHz',
      'Xung nhịp turbo': '4.4 GHz',
      'Bộ nhớ đệm': '32MB L3',
      'Tiến trình sản xuất': 'TSMC 7nm',
      'Công suất tiêu thụ (TDP)': '65W',
      'Đồ họa tích hợp': 'Không (bản R)',
      'Hỗ trợ bộ nhớ': 'DDR4',
      'Tản nhiệt đi kèm': 'Quạt Wraith Stealth',
      'Phụ kiện hỗ trợ': 'Hỗ trợ ép xung (PBO)',
    },
  },
  {
    sku: 'CPU-I3-12100F',
    name: 'Intel Core i3-12100F - 4C/8T, 4.3GHz',
    category: 'cpu',
    description:
      'CPU 4 nhân/8 luồng, socket LGA1700, không tích hợp GPU, kèm quạt cooler. build văn phòng và gaming nhẹ.',
    price: 2490000,
    stock: 35,
    specs: {
      'Hãng sản xuất': 'Intel',
      'Dòng sản phẩm': 'Core i3 (12th Gen)',
      Socket: 'LGA1700',
      'Nhân / Luồng': '4 nhân / 8 luồng',
      'Xung nhịp cơ bản': '3.3 GHz',
      'Xung nhịp turbo': '4.3 GHz',
      'Bộ nhớ đệm': '12MB Intel Smart Cache',
      'Tiến trình sản xuất': 'Intel 7',
      'Công suất tiêu thụ (TDP)': '58W (MTP 89W)',
      'Đồ họa tích hợp': 'Không (bản F)',
      'Hỗ trợ bộ nhớ': 'DDR4 / DDR5',
      'Tản nhiệt đi kèm': 'Có (Laminar RM1)',
      'Phụ kiện hỗ trợ': 'Không hỗ trợ ép xung',
    },
  },
  {
    sku: 'CPU-I5-14400F',
    name: 'Intel Core i5-14400F - 10C/16T, 4.7GHz',
    category: 'cpu',
    description:
      'CPU 10 nhân (6P+4E)/16 luồng, socket LGA1700, không tích hợp GPU, hiệu năng gaming tốt cho phân khúc trung cấp.',
    price: 4290000,
    stock: 24,
    specs: {
      'Hãng sản xuất': 'Intel',
      'Dòng sản phẩm': 'Core i5 (14th Gen)',
      Socket: 'LGA1700',
      'Nhân / Luồng': '10 nhân (6P + 4E) / 16 luồng',
      'Xung nhịp P-core': '2.5 GHz / Turbo 4.7 GHz',
      'Xung nhịp E-core': '1.9 GHz / Turbo 3.5 GHz',
      'Bộ nhớ đệm': '20MB Intel Smart Cache',
      'Tiến trình sản xuất': 'Intel 7',
      'Công suất tiêu thụ (TDP)': '65W (MTP 148W)',
      'Đồ họa tích hợp': 'Không (bản F)',
      'Hỗ trợ bộ nhớ': 'DDR4 / DDR5',
      'Tản nhiệt đi kèm': 'Có (Laminar RM1)',
      'Phụ kiện hỗ trợ': 'Không hỗ trợ ép xung',
    },
  },
  {
    sku: 'MB-A520M-GIG',
    name: 'Gigabyte A520M S2H',
    category: 'mainboard',
    description:
      'Mainboard AM4 chipset A520, form mATX, DDR4, 1 khe M.2 - nền tảng giá rẻ cho Ryzen 3000/5000.',
    price: 1490000,
    stock: 30,
    specs: {
      'Hãng sản xuất': 'Gigabyte',
      'Chipset': 'AMD A520',
      Socket: 'AM4',
      'Form factor': 'mATX',
      'Khe cắm RAM': '2 khe DDR4 (Dual Channel)',
      'Dung lượng RAM tối đa': '64GB',
      'Tốc độ RAM hỗ trợ': 'DDR4 4600+ (OC)',
      'Khe cắm mở rộng': '1x PCIe 3.0 x16, 1x PCIe 3.0 x1',
      'Khe lưu trữ M.2': '1x M.2 (PCIe 3.0 x4)',
      'Khe SATA': '4x SATA III',
      'Mạng LAN': 'GbE',
      'Cổng USB': 'USB 3.2 Gen 1, USB 2.0',
      'Hỗ trợ CPU': 'AMD Ryzen 3000 / 4000G / 5000',
    },
  },
  {
    sku: 'MB-B660M-DDR4',
    name: 'MSI PRO B660M-A DDR4',
    category: 'mainboard',
    description:
      'Mainboard LGA1700 chipset B660, form mATX, DDR4, 2 khe M.2, VRM đủ cho i5-14400F.',
    price: 2690000,
    stock: 22,
    specs: {
      'Hãng sản xuất': 'MSI',
      'Chipset': 'Intel B660',
      Socket: 'LGA1700',
      'Form factor': 'mATX',
      'Khe cắm RAM': '2 khe DDR4 (Dual Channel)',
      'Dung lượng RAM tối đa': '128GB',
      'Tốc độ RAM hỗ trợ': 'DDR4 4800+ (OC)',
      'Khe cắm mở rộng': '1x PCIe 4.0 x16, 1x PCIe 3.0 x1',
      'Khe lưu trữ M.2': '2x M.2 (PCIe 4.0/3.0)',
      'Khe SATA': '4x SATA III',
      'Mạng LAN': '2.5GbE',
      'Cổng USB': 'USB 3.2 Gen 2, USB 2.0',
      'Hỗ trợ CPU': 'Intel Core 12th / 13th / 14th Gen',
    },
  },
  {
    sku: 'MB-H610M-ASR',
    name: 'ASRock H610M-HVS',
    category: 'mainboard',
    description:
      'Mainboard LGA1700 chipset H610, form mATX, DDR4 - lựa chọn tối giản cho cấu hình phổ thông.',
    price: 1390000,
    stock: 28,
    specs: {
      'Hãng sản xuất': 'ASRock',
      'Chipset': 'Intel H610',
      Socket: 'LGA1700',
      'Form factor': 'mATX',
      'Khe cắm RAM': '2 khe DDR4 (Dual Channel)',
      'Dung lượng RAM tối đa': '64GB',
      'Tốc độ RAM hỗ trợ': 'DDR4 3200 (JEDEC)',
      'Khe cắm mở rộng': '1x PCIe 4.0 x16, 1x PCIe 3.0 x1',
      'Khe lưu trữ M.2': '1x M.2 (PCIe 3.0 x4)',
      'Khe SATA': '4x SATA III',
      'Mạng LAN': 'GbE',
      'Cổng USB': 'USB 3.2 Gen 1, USB 2.0',
      'Hỗ trợ CPU': 'Intel Core 12th / 13th / 14th Gen',
    },
  },
  {
    sku: 'MB-B650M-DS3H',
    name: 'Gigabyte B650M DS3H',
    category: 'mainboard',
    description:
      'Mainboard AM5 chipset B650, form mATX, DDR5, 2 khe M.2 - vừa tầm cho Ryzen 7000.',
    price: 3190000,
    stock: 18,
    specs: {
      'Hãng sản xuất': 'Gigabyte',
      'Chipset': 'AMD B650',
      Socket: 'AM5',
      'Form factor': 'mATX',
      'Khe cắm RAM': '4 khe DDR5 (Dual Channel)',
      'Dung lượng RAM tối đa': '128GB',
      'Tốc độ RAM hỗ trợ': 'DDR5 6400+ (OC)',
      'Khe cắm mở rộng': '1x PCIe 4.0 x16, 1x PCIe 3.0 x1',
      'Khe lưu trữ M.2': '2x M.2 (PCIe 4.0)',
      'Khe SATA': '4x SATA III',
      'Mạng LAN': '2.5GbE',
      'Cổng USB': 'USB 3.2 Gen 2, USB Type-C',
      'Hỗ trợ CPU': 'AMD Ryzen 7000 / 8000 / 9000',
    },
  },
  {
    sku: 'GPU-RX6500XT-4G',
    name: 'Sapphire RX 6500 XT PULSE 4GB',
    category: 'gpu',
    description:
      'Card đồ họa 4GB GDDR6, gaming 1080p setting thấp-trung bình, giá rẻ, tiết kiệm điện.',
    price: 2390000,
    stock: 25,
    specs: {
      'Hãng sản xuất': 'Sapphire',
      'Chip đồ họa': 'AMD Radeon RX 6500 XT',
      'Bộ nhớ VRAM': '4GB GDDR6',
      'Bus bộ nhớ': '64-bit',
      'Stream Processor': '1024',
      'Xung nhịp Boost': '2825 MHz',
      'Cổng xuất hình': '1x HDMI, 1x DisplayPort',
      'Khe cắm': 'PCIe 4.0 x4',
      'Hệ thống tản nhiệt': '2 quạt PULSE',
      'Kích thước': 'Dài ~206mm (2 slot)',
      'Công suất tiêu thụ (TDP)': '107W',
      'Nguồn khuyến nghị': '400W',
      'Nguồn cắm thêm': '1x 6-pin PCIe',
    },
  },
  {
    sku: 'GPU-RX7600-8G',
    name: 'Gigabyte RX 7600 EAGLE OC 8GB',
    category: 'gpu',
    description:
      'Card đồ họa 8GB GDDR6, gaming 1080p max setting và 1440p setting trung bình, giá tốt.',
    price: 6290000,
    stock: 16,
    specs: {
      'Hãng sản xuất': 'Gigabyte',
      'Chip đồ họa': 'AMD Radeon RX 7600',
      'Bộ nhớ VRAM': '8GB GDDR6',
      'Bus bộ nhớ': '128-bit',
      'Stream Processor': '2048',
      'Xung nhịp Boost': '2655 MHz',
      'Cổng xuất hình': '2x HDMI 2.1, 2x DisplayPort 2.1',
      'Khe cắm': 'PCIe 4.0 x8',
      'Hệ thống tản nhiệt': '3 quạt EAGLE',
      'Kích thước': 'Dài ~302mm (2.5 slot)',
      'Công suất tiêu thụ (TDP)': '165W',
      'Nguồn khuyến nghị': '550W',
      'Nguồn cắm thêm': '1x 8-pin PCIe',
    },
  },
  {
    sku: 'PSU-CV550',
    name: 'Corsair CV550 550W 80+ Bronze',
    category: 'psu',
    description:
      'Nguồn 550W 80+ Bronze, quạt 120mm, đủ cho cấu hình gaming phổ thông tới trung cấp.',
    price: 890000,
    stock: 40,
    specs: {
      'Hãng sản xuất': 'Corsair',
      'Dòng sản phẩm': 'CV Series',
      'Công suất': '550W',
      'Chứng nhận': '80 PLUS Bronze',
      'Loại module': 'Non-Modular (cáp cố định)',
      'Form factor': 'ATX',
      'Quạt': 'Quạt 120mm',
      'Bảo vệ': 'OVP, UVP, OPP, SCP',
      'Cổng PCIe': '2x PCIe (6+2 pin)',
      'Cổng CPU': '1x EPS/ATX12V 4+4 pin',
      'Cổng SATA': '4x SATA',
      'Bảo hành': '3 năm',
    },
  },
  {
    sku: 'CASE-MC300',
    name: 'Mars Gaming MC300 Mid-Tower',
    category: 'case',
    description:
      'Vỏ máy Mid-Tower hỗ trợ ATX/mATX, kính cường lực bên hông, quản lý cáp gọn gàng, giá tốt.',
    price: 850000,
    stock: 30,
    specs: {
      'Hãng sản xuất': 'Mars Gaming',
      'Dòng sản phẩm': 'MC300',
      'Kiểu vỏ': 'Mid-Tower',
      'Form factor hỗ trợ': 'ATX, Micro-ATX, Mini-ITX',
      'Màu sắc': 'Đen',
      'Chất liệu': 'Thép + Kính cường lực',
      'Quạt đi kèm': '1x quạt 120mm (sau)',
      'Tản nhiệt CPU tối đa': '160mm',
      'GPU tối đa': '330mm',
      'Khe mở rộng': '7',
      'Khay lưu trữ': '1x 3.5", 2x 2.5"',
      'Cổng kết nối': 'USB 3.0, USB 2.0, Audio',
      'Quản lý cáp': 'Có',
    },
  },
  {
    sku: 'SSD-NV2-1TB',
    name: 'Kingston NV2 1TB NVMe PCIe 4.0',
    category: 'storage',
    description:
      'SSD NVMe 1TB PCIe 4.0 tốc độ cao, giá tốt cho build gaming và làm việc.',
    price: 1390000,
    stock: 45,
    specs: {
      'Hãng sản xuất': 'Kingston',
      'Dòng sản phẩm': 'NV2',
      'Dung lượng': '1TB',
      'Giao diện': 'NVMe PCIe 4.0 x4',
      'Form factor': 'M.2 2280',
      'Tốc độ đọc': 'Up to 3500 MB/s',
      'Tốc độ ghi': 'Up to 2800 MB/s',
      'Loại NAND': '3D NAND QLC',
      'Bộ nhớ cache': 'HMB (không DRAM)',
      'TBW': '300 TBW',
      'Bảo hành': '3 năm',
    },
  },
];

type SeedPcBuildItem = {
  slot: string;
  sku: string;
  sortOrder: number;
};

type SeedPcBuild = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  budget: number;
  tier: number;
  sortOrder: number;
  items: SeedPcBuildItem[];
};

const pcBuilds: SeedPcBuild[] = [
  {
    slug: 'pc-10-trieu',
    name: 'Cấu hình 10 triệu',
    tagline: 'Văn phòng & Gaming nhẹ',
    description:
      'Bộ máy cân bằng cho học tập, làm việc và gaming 1080p setting thấp-trung bình. Nền tảng AM4 giá rẻ, dễ nâng cấp sau này.',
    budget: 10000000,
    tier: 10,
    sortOrder: 1,
    items: [
      { slot: 'cpu', sku: 'CPU-R5-5600', sortOrder: 1 },
      { slot: 'gpu', sku: 'GPU-RX6500XT-4G', sortOrder: 2 },
      { slot: 'mainboard', sku: 'MB-A520M-GIG', sortOrder: 3 },
      { slot: 'ram', sku: 'RAM-KF16G-3200', sortOrder: 4 },
      { slot: 'storage', sku: 'SSD-SN770-500G', sortOrder: 5 },
      { slot: 'psu', sku: 'PSU-CV550', sortOrder: 6 },
      { slot: 'case', sku: 'CASE-MC300', sortOrder: 7 },
    ],
  },
  {
    slug: 'pc-20-trieu',
    name: 'Cấu hình 20 triệu',
    tagline: 'Gaming 1080p cao cấp',
    description:
      'Cấu hình gaming 1080p max setting với RTX 4060 và i5-14400F. Mạnh mẽ cho mọi tựa game eSports và AAA hiện nay.',
    budget: 20000000,
    tier: 20,
    sortOrder: 2,
    items: [
      { slot: 'cpu', sku: 'CPU-I5-14400F', sortOrder: 1 },
      { slot: 'gpu', sku: 'GPU-RTX4060-8G', sortOrder: 2 },
      { slot: 'mainboard', sku: 'MB-B660M-DDR4', sortOrder: 3 },
      { slot: 'ram', sku: 'RAM-KF16G-3200', sortOrder: 4 },
      { slot: 'storage', sku: 'SSD-SN770-500G', sortOrder: 5 },
      { slot: 'psu', sku: 'PSU-CV550', sortOrder: 6 },
      { slot: 'case', sku: 'CASE-H510', sortOrder: 7 },
    ],
  },
  {
    slug: 'pc-30-trieu',
    name: 'Cấu hình 30 triệu',
    tagline: 'Gaming 1440p hiệu năng cao',
    description:
      'Cấu hình 1440p mạnh với RTX 4070, Ryzen 5 7600 và 32GB DDR5. Sẵn sàng cho game AAA và công việc sáng tạo.',
    budget: 30000000,
    tier: 30,
    sortOrder: 3,
    items: [
      { slot: 'cpu', sku: 'CPU-R5-7600', sortOrder: 1 },
      { slot: 'gpu', sku: 'GPU-RTX4070-12G', sortOrder: 2 },
      { slot: 'mainboard', sku: 'MB-B650M-DS3H', sortOrder: 3 },
      { slot: 'ram', sku: 'RAM-KF32G-6000', sortOrder: 4 },
      { slot: 'storage', sku: 'SSD-NV2-1TB', sortOrder: 5 },
      { slot: 'psu', sku: 'PSU-CM650-W', sortOrder: 6 },
      { slot: 'case', sku: 'CASE-L216', sortOrder: 7 },
    ],
  },
  {
    slug: 'pc-40-trieu',
    name: 'Cấu hình 40 triệu',
    tagline: 'Cao cấp / Streaming',
    description:
      'Bộ máy cao cấp với Ryzen 7 7800X3D - vua gaming, RTX 4070, tản nhiệt khí AK500 và nguồn modular 850W. Gaming 1440p/4K và streaming mượt mà.',
    budget: 40000000,
    tier: 40,
    sortOrder: 4,
    items: [
      { slot: 'cpu', sku: 'CPU-R7-7800X3D', sortOrder: 1 },
      { slot: 'gpu', sku: 'GPU-RTX4070-12G', sortOrder: 2 },
      { slot: 'mainboard', sku: 'MB-B650-AORUS', sortOrder: 3 },
      { slot: 'ram', sku: 'RAM-KF32G-6000', sortOrder: 4 },
      { slot: 'storage', sku: 'SSD-WD850-1TB', sortOrder: 5 },
      { slot: 'psu', sku: 'PSU-RM850-G', sortOrder: 6 },
      { slot: 'case', sku: 'CASE-L216', sortOrder: 7 },
      { slot: 'cooling', sku: 'COOL-AK500', sortOrder: 8 },
    ],
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
        specs: product.specs,
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
        specs: product.specs,
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

  console.log(`Seeding ${pcBuilds.length} PC builds...`);

  const skuRows = await prisma.product.findMany({
    select: { id: true, sku: true },
  });
  const skuToId = new Map(skuRows.map((row) => [row.sku, row.id]));

  for (const build of pcBuilds) {
    const missing = build.items.filter((item) => !skuToId.has(item.sku));
    if (missing.length > 0) {
      throw new Error(
        `Build ${build.slug} references unknown SKUs: ${missing
          .map((item) => item.sku)
          .join(', ')}`,
      );
    }

    const pcBuild = await prisma.pcBuild.upsert({
      where: { slug: build.slug },
      update: {
        name: build.name,
        tagline: build.tagline,
        description: build.description,
        budget: build.budget,
        tier: build.tier,
        sortOrder: build.sortOrder,
      },
      create: {
        slug: build.slug,
        name: build.name,
        tagline: build.tagline,
        description: build.description,
        budget: build.budget,
        tier: build.tier,
        sortOrder: build.sortOrder,
      },
    });

    await prisma.pcBuildItem.deleteMany({ where: { buildId: pcBuild.id } });
    await prisma.pcBuildItem.createMany({
      data: build.items.map((item) => ({
        buildId: pcBuild.id,
        productId: skuToId.get(item.sku)!,
        slot: item.slot,
        sortOrder: item.sortOrder,
      })),
    });
  }

  const buildCount = await prisma.pcBuild.count();
  console.log(`Done. ${buildCount} PC builds seeded.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });