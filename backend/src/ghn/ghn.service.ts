import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { OrderStatus } from '../generated/prisma/enums.js';

/**
 * GHN exposes its data sets on a different path prefix than its order/fee
 * endpoints: the order and fee routes live under /shiip/public-api/v2 while
 * province/district/ward live under /shiip/public-api (no version segment).
 */
const MASTER_BASE = '/shiip/public-api/master-data';
const ORDER_BASE = '/shiip/public-api/v2/shipping-order';

const REQUEST_TIMEOUT_MS = 15000;

/** GHN reports failures as a 200 carrying a non-zero `code`. */
interface GhnEnvelope<T> {
  code: number;
  message: string;
  data: T;
  code_message?: string;
}

export interface GhnAddress {
  /**
   * Province and district IDs are integers; ward codes are alphanumeric GHN
   * identifiers (e.g. "1B1731"), so this field stays a string everywhere.
   */
  id: string | number;
  name: string;
}

interface ShopSettings {
  baseUrl: string;
  token: string;
  shopId: number;
  fromName: string;
  fromPhone: string;
  fromAddress: string;
  fromWardCode: string;
  fromDistrictId: number;
  serviceId: number;
  serviceTypeId: number;
  defaultWeight: number;
  defaultLength: number;
  defaultWidth: number;
  defaultHeight: number;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

@Injectable()
export class GhnService {
  /**
   * Master data (provinces, districts, wards) barely changes, so answers are
   * memoised for the lifetime of the process. The cache is per-instance, which
   * on a serverless runtime means it only helps warm invocations, but it keeps
   * a customer cascading province -> district -> ward from hammering GHN.
   */
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Resolved on first use rather than in the constructor so a deployment that
   * has not configured GHN still boots ΓÇö every other feature keeps working and
   * only the GHN endpoints report that they are unconfigured.
   */
  private settings(): ShopSettings {
    const token = this.config.get<string>('GHN_TOKEN') ?? '';
    const shopId = Number(this.config.get<string>('GHN_SHOP_ID') ?? '0');

    if (!token || !Number.isFinite(shopId) || shopId <= 0) {
      throw new BadRequestException(
        'GHN ch╞░a ─æ╞░ß╗úc cß║Ñu h├¼nh. Vui l├▓ng li├¬n hß╗ç quß║ún trß╗ï vi├¬n ─æß╗â bß║¡t t├¡ch hß╗úp giao h├áng.',
      );
    }

    return {
      baseUrl: (
        this.config.get<string>('GHN_BASE_URL') ??
        'https://online-gateway.ghn.vn'
      ).replace(/\/+$/, ''),
      token,
      shopId,
      fromName: this.config.get<string>('GHN_FROM_NAME') ?? '',
      fromPhone: this.config.get<string>('GHN_FROM_PHONE') ?? '',
      fromAddress: this.config.get<string>('GHN_FROM_ADDRESS') ?? '',
      fromWardCode: this.config.get<string>('GHN_FROM_WARD_CODE') ?? '',
      fromDistrictId: Number(
        this.config.get<string>('GHN_FROM_DISTRICT_ID') ?? '0',
      ),
      serviceId: Number(this.config.get<string>('GHN_SERVICE_ID') ?? '0'),
      serviceTypeId: Number(this.config.get<string>('GHN_SERVICE_TYPE_ID') ?? '2'),
      defaultWeight: Number(this.config.get<string>('GHN_DEFAULT_WEIGHT') ?? '500'),
      defaultLength: Number(this.config.get<string>('GHN_DEFAULT_LENGTH') ?? '30'),
      defaultWidth: Number(this.config.get<string>('GHN_DEFAULT_WIDTH') ?? '20'),
      defaultHeight: Number(this.config.get<string>('GHN_DEFAULT_HEIGHT') ?? '10'),
    };
  }

  async listProvinces(): Promise<GhnAddress[]> {
    return this.cached('provinces', async () => {
      const payload = await this.get<{
        ProvinceID: number;
        ProvinceName: string;
      }[]>(`${MASTER_BASE}/province`);
      return payload
        .map((row) => ({ id: String(row.ProvinceID), name: row.ProvinceName }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    });
  }

  async listDistricts(provinceId: number): Promise<GhnAddress[]> {
    return this.cached(`districts:${provinceId}`, async () => {
      const payload = await this.get<{
        DistrictID: number;
        DistrictName: string;
      }[]>(
        `${MASTER_BASE}/district?province_id=${encodeURIComponent(provinceId)}`,
      );
      return payload
        .map((row) => ({ id: String(row.DistrictID), name: row.DistrictName }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    });
  }

  async listWards(districtId: number): Promise<GhnAddress[]> {
    return this.cached(`wards:${districtId}`, async () => {
      // Unlike provinces and districts, wards are read with a body carrying the
      // district, so a POST is required even though no state changes.
      const payload = await this.post<{ WardCode: string; WardName: string }[]>(
        `${MASTER_BASE}/ward?district_id=${encodeURIComponent(districtId)}`,
        { district_id: districtId },
      );
      return payload
        .map((row) => ({
          id: String(row.WardCode),
          name: row.WardName,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    });
  }

  /**
   * Quotes the delivery fee for a parcel to a receiver. Used by checkout to
   * show the shipping cost before the order exists.
   */
  async quoteFee(input: {
    toDistrictId: number;
    toWardCode: string;
    weight?: number;
    codValue?: number;
    insuranceValue?: number;
  }) {
    const settings = this.settings();
    const body = {
      from_district_id: settings.fromDistrictId,
      service_id: settings.serviceId || undefined,
      service_type_id: settings.serviceId
        ? undefined
        : settings.serviceTypeId,
      to_district_id: input.toDistrictId,
      to_ward_code: String(input.toWardCode),
      weight: input.weight ?? settings.defaultWeight,
      length: settings.defaultLength,
      width: settings.defaultWidth,
      height: settings.defaultHeight,
      insurance_value: input.insuranceValue,
      cod_value: input.codValue,
    };

    const data = await this.post<{ total?: number; service_fee?: number }>(
      `${ORDER_BASE}/fee`,
      body,
    );

    return {
      fee: Number(data.total ?? data.service_fee ?? 0),
      insuranceFee: undefined,
    };
  }

  /**
   * Pushes an order to GHN and records the consignment. Only a PAID order may
   * reach here: GHN takes physical custody the moment a consignment exists, so
   * dispatching an order with no payment behind it would put goods in a
   * courier's hands for free. The button in the UI is gated the same way, but
   * the decision has to be enforced here because the UI is not a boundary.
   */
  async createShipment(orderId: string, createdById: string) {
    const settings = this.settings();
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        'Chß╗ë tß║ío vß║¡n ─æ╞ín GHN cho ─æ╞ín ─æ├ú thanh to├ín.',
      );
    }

    if (
      !order.receiverDistrictId ||
      !order.receiverWardCode ||
      !order.receiverProvinceId
    ) {
      throw new BadRequestException(
        '─É╞ín h├áng ch╞░a c├│ m├ú tß╗ënh/quß║¡n/ph╞░ß╗¥ng. Chß╗ë ─æ╞ín ─æß║╖t sau khi bß║¡t chß╗ìn ─æß╗ïa chß╗ë chuß║⌐n mß╗¢i tß║ío ─æ╞░ß╗úc vß║¡n ─æ╞ín GHN.',
      );
    }

    if (
      !settings.fromDistrictId ||
      !settings.fromWardCode ||
      !settings.fromName ||
      !settings.fromPhone ||
      !settings.fromAddress
    ) {
      throw new BadRequestException(
        'Ch╞░a cß║Ñu h├¼nh ─æß╗ïa chß╗ë kho gß╗¡i h├áng (GHN_FROM_*). Vui l├▓ng cß║¡p nhß║¡t th├┤ng tin shop tr├¬n portal GHN tr╞░ß╗¢c.',
      );
    }

    const existing = await this.prisma.ghnShipment.findUnique({
      where: { orderId },
    });
    if (existing) {
      return {
        ok: true,
        alreadyCreated: true,
        ghnOrderCode: existing.ghnOrderCode,
        status: existing.status,
        fee: existing.fee,
      };
    }

    const items = order.items.map((item) => ({
      name: item.name,
      code: item.productId,
      quantity: item.quantity,
      price: Math.round(Number(item.price)),
      length: settings.defaultLength,
      width: settings.defaultWidth,
      height: settings.defaultHeight,
      weight: settings.defaultWeight,
    }));

    const body = {
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
      client_order_code: orderId,
      to_name: this.decrypt(order.receiverName),
      to_phone: this.decrypt(order.receiverPhone),
      to_address: this.decrypt(order.receiverAddress),
      to_ward_code: String(order.receiverWardCode),
      to_district_id: order.receiverDistrictId,
      cod_amount:
        order.payment?.provider === 'COD' ? Math.round(Number(order.total)) : 0,
      content: `Don hang ${orderId.slice(0, 8)}`,
      weight: settings.defaultWeight,
      length: settings.defaultLength,
      width: settings.defaultWidth,
      height: settings.defaultHeight,
      insurance_value: Math.round(Number(order.total)),
      service_id: settings.serviceId,
      service_type_id: settings.serviceId
        ? undefined
        : settings.serviceTypeId,
      items,
    };

    const data = await this.post<{
      order_code: string;
      total_fee?: number;
      expected_delivery_time?: string;
      service_id?: number;
    }>(`${ORDER_BASE}/create`, body);

    await this.prisma.$transaction(async (tx) => {
      await tx.ghnShipment.create({
        data: {
          orderId,
          ghnOrderCode: data.order_code,
          serviceId: data.service_id ?? settings.serviceId ?? null,
          fee: Number.isFinite(data.total_fee) ? data.total_fee : null,
          codAmount: body.cod_amount || null,
          insuranceValue: body.insurance_value || null,
          status: 'ready_to_pick',
          expectedDeliveryTime: data.expected_delivery_time
            ? new Date(data.expected_delivery_time)
            : null,
          createdById,
        },
      });
    });

    return {
      ok: true,
      ghnOrderCode: data.order_code,
      fee: data.total_fee ?? null,
      expectedDeliveryTime: data.expected_delivery_time ?? null,
    };
  }

  async getShipment(orderId: string) {
    const shipment = await this.prisma.ghnShipment.findUnique({
      where: { orderId },
    });
    if (!shipment) return null;
    return shipment;
  }

  /**
   * Re-reads the consignment status from GHN. Polled on demand rather than
   * through a webhook because the admin list is the only reader, and a webhook
   * would need a public callback URL registered with GHN plus its own
   * signature checks before it would be safe to trust.
   */
  async refreshShipment(orderId: string) {
    const shipment = await this.prisma.ghnShipment.findUnique({
      where: { orderId },
    });
    if (!shipment) throw new NotFoundException('No GHN shipment for this order');

    const data = await this.post<{
      status?: string;
      order_code?: string;
      total_fee?: number;
      expected_delivery_time?: string;
    }>(`${ORDER_BASE}/detail`, {
      order_code: shipment.ghnOrderCode,
    });

    const status = data.status ?? shipment.status ?? null;
    await this.prisma.ghnShipment.update({
      where: { id: shipment.id },
      data: {
        status,
        fee:
          typeof data.total_fee === 'number' ? data.total_fee : shipment.fee,
        expectedDeliveryTime: data.expected_delivery_time
          ? new Date(data.expected_delivery_time)
          : shipment.expectedDeliveryTime,
      },
    });

    return { ghnOrderCode: shipment.ghnOrderCode, status, fee: shipment.fee };
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key) as CacheEntry<T> | undefined;
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const value = await load();
    // Ten minutes: long enough that a slow customer browsing cascades is cheap,
    // short enough that a ward GHN adds shows up without a redeploy.
    this.cache.set(key, { expiresAt: Date.now() + 600_000, value });
    return value;
  }

  private headers(): Record<string, string> {
    const settings = this.settings();
    return {
      Token: settings.token,
      ShopId: String(settings.shopId),
      'Content-Type': 'application/json',
    };
  }

  /**
   * Receiver details are stored encrypted on the order. GHN needs them in the
   * clear to run a consignment, so this is the one place the module reads them,
   * and a row that fails authentication surfaces as null rather than a partial
   * address that would send a courier to the wrong place.
   */
  private decrypt(value: string | null): string {
    if (!value) return '';
    try {
      return this.crypto.decrypt(value) ?? '';
    } catch {
      return '';
    }
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const settings = this.settings();
    const url = `${settings.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // The token is never logged, and neither is the full URL: it is sent in a
    // header precisely so it stays out of anything that records a request line.
    if (!response.ok) {
      throw new BadRequestException(
        `GHN trß║ú vß╗ü lß╗ùi ${response.status}. Vui l├▓ng kiß╗âm tra cß║Ñu h├¼nh t├¡ch hß╗úp.`,
      );
    }

    const payload = (await response.json()) as GhnEnvelope<T>;
    if (payload.code !== 200 && payload.code !== 201) {
      throw new BadRequestException(
        payload.message || 'GHN tß╗½ chß╗æi y├¬u cß║ºu.',
      );
    }

    return payload.data;
  }
}
