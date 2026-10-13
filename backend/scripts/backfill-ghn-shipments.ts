import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { CryptoService } from '../src/crypto/crypto.service.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const crypto = new CryptoService();

async function main() {
  const stuck = await prisma.order.findMany({
    where: {
      status: 'PAID',
      shipment: null,
      receiverDistrictId: { not: null },
      receiverWardCode: { not: null },
    },
    include: { payment: true, items: true },
    orderBy: { paidAt: 'asc' },
  });

  console.log(`Found ${stuck.length} PAID order(s) with address but no GHN shipment.`);

  for (const order of stuck) {
    const label = order.id.slice(0, 8);
    const phone = crypto.decrypt(order.receiverPhone);
    console.log(`\n[${label}] paidAt=${order.paidAt?.toISOString()} phone=${phone} provider=${order.payment?.provider}`);
    if (!phone || !/^0[35789]\d{8}$/.test(phone)) {
      console.log(`  SKIP: phone "${phone}" is not a valid 10-digit VN mobile. Fix the phone in the DB (receiverPhone is AES-256-GCM encrypted) or cancel and recreate the order.`);
      continue;
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        // minimal inline of GhnService.createShipment's payload + POST, because
        // instantiating the Nest service outside a module context is awkward.
        const settings = {
          baseUrl: (process.env.GHN_BASE_URL ?? 'https://online-gateway.ghn.vn').replace(/\/+$/, ''),
          token: process.env.GHN_TOKEN ?? '',
          shopId: Number(process.env.GHN_SHOP_ID ?? '0'),
          fromName: process.env.GHN_FROM_NAME ?? '',
          fromPhone: process.env.GHN_FROM_PHONE ?? '',
          fromAddress: process.env.GHN_FROM_ADDRESS ?? '',
          fromWardCode: process.env.GHN_FROM_WARD_CODE ?? '',
          fromDistrictId: Number(process.env.GHN_FROM_DISTRICT_ID ?? '0'),
          serviceId: Number(process.env.GHN_SERVICE_ID ?? '0'),
          serviceTypeId: Number(process.env.GHN_SERVICE_TYPE_ID ?? '2'),
          defaultWeight: Number(process.env.GHN_DEFAULT_WEIGHT ?? '500'),
          defaultLength: Number(process.env.GHN_DEFAULT_LENGTH ?? '30'),
          defaultWidth: Number(process.env.GHN_DEFAULT_WIDTH ?? '20'),
          defaultHeight: Number(process.env.GHN_DEFAULT_HEIGHT ?? '10'),
        };
        const items = order.items ?? [];
        const body: Record<string, unknown> = {
          payment_type_id: 2,
          note: 'GHN integration',
          required_note: 'CHOTHUHANG',
          from_name: settings.fromName,
          from_phone: settings.fromPhone,
          from_address: settings.fromAddress,
          from_ward_name: '',
          from_district_name: '',
          from_province_name: '',
          return_phone: settings.fromPhone,
          return_address: settings.fromAddress,
          return_district_id: settings.fromDistrictId,
          return_ward_code: settings.fromWardCode,
          client_order_code: order.id,
          to_name: crypto.decrypt(order.receiverName),
          to_phone: phone,
          to_address: crypto.decrypt(order.receiverAddress),
          to_ward_code: String(order.receiverWardCode),
          to_district_id: order.receiverDistrictId,
          cod_amount: order.payment?.provider === 'COD' ? Math.round(Number(order.total)) : 0,
          content: `Don hang ${order.id.slice(0, 8)}`,
          weight: settings.defaultWeight,
          length: settings.defaultLength,
          width: settings.defaultWidth,
          height: settings.defaultHeight,
          insurance_value: Math.round(Number(order.total)),
          service_type_id: settings.serviceTypeId,
          items: items.map((item) => ({
            name: item.name,
            code: item.productId,
            quantity: item.quantity,
            price: Math.round(Number(item.price)),
            length: settings.defaultLength,
            width: settings.defaultWidth,
            height: settings.defaultHeight,
            weight: settings.defaultWeight,
          })),
        };
        if (settings.serviceId > 0) {
          body.service_id = settings.serviceId;
          delete body.service_type_id;
        }

        const res = await fetch(`${settings.baseUrl}/shiip/public-api/v2/shipping-order/create`, {
          method: 'POST',
          headers: {
            Token: settings.token,
            ShopId: String(settings.shopId),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const data = await res.json() as { code: number; message: string; data?: { order_code?: string; total_fee?: number; expected_delivery_time?: string; service_id?: number } };
        if (data.code !== 200 || !data.data?.order_code) {
          throw new Error(`GHN ${data.code}: ${data.message}`);
        }
        await tx.ghnShipment.create({
          data: {
            orderId: order.id,
            ghnOrderCode: data.data.order_code,
            serviceId: data.data.service_id ?? (settings.serviceId || null),
            fee: Number.isFinite(data.data.total_fee) ? data.data.total_fee : null,
            codAmount: typeof body.cod_amount === 'number' ? body.cod_amount : null,
            insuranceValue: typeof body.insurance_value === 'number' ? body.insurance_value : null,
            status: 'ready_to_pick',
            expectedDeliveryTime: data.data.expected_delivery_time ? new Date(data.data.expected_delivery_time) : null,
            createdById: 'backfill',
          },
        });
        return data.data.order_code;
      });
      console.log(`  OK: created consignment ${result}`);
    } catch (err) {
      console.log(`  FAIL: ${err instanceof Error ? err.message : err}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
