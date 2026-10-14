import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { GhnService } from '../ghn/ghn.service.js';
import { OrderStatus, PaymentProvider, PaymentStatus } from '../generated/prisma/enums.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

const FREE_SHIPPING_MIN = 300000;
const SHIPPING_FEE = 30000;

interface OrderRecord {
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note: string | null;
  subtotal: unknown;
  shipping: unknown;
  total: unknown;
  payment?: { amount: unknown } | null;
  items?: unknown;
  user?: unknown;
  shipment?: unknown;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly crypto: CryptoService,
    private readonly ghn: GhnService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const cart = await this.cart.getCart(userId);
    if (cart.itemCount === 0) {
      throw new BadRequestException('Cart is empty');
    }

    return this.prisma.$transaction(async (tx) => {
      const lineItems = [];

      for (const item of cart.items) {
        const product = item.product;
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}`,
          );
        }
        // The predicate makes stock reservation atomic, preventing concurrent
        // checkouts from overselling the same inventory.
        const reservation = await tx.product.updateMany({
          where: {
            id: product.id,
            status: 'ACTIVE',
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (reservation.count !== 1) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}`,
          );
        }
        lineItems.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
        });
      }

      const subtotal = cart.subtotal;
      const shipping = subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
      const total = subtotal + shipping;

      const created = await tx.order.create({
        data: {
          userId,
          status: 'PENDING',
          subtotal,
          shipping,
          total,
          receiverName: this.crypto.encrypt(dto.receiverName),
          receiverPhone: this.crypto.encrypt(dto.receiverPhone),
          receiverAddress: this.crypto.encrypt(dto.receiverAddress),
          note: dto.note ? this.crypto.encrypt(dto.note) : null,
          // Nullable on purpose: an order placed before these existed (or one
          // abandoned mid-checkout) still has a working human-readable address,
          // it just cannot be pushed to a courier until someone fills them in.
          receiverProvinceId: dto.receiverProvinceId ?? null,
          receiverDistrictId: dto.receiverDistrictId ?? null,
          receiverWardCode: dto.receiverWardCode ?? null,
          items: { create: lineItems },
        },
        include: { items: { include: { product: true } } },
      });

      await tx.cartItem.deleteMany({
        where: { cart: { userId } },
      });

      return this.toView(created);
    });
  }

  async myOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: { include: { product: true } },
        payment: true,
        shipment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.toView(o));
  }

  async myOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: true } },
        payment: true,
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.toView(order);
  }

  /**
   * Re-reads the GHN consignment status for an order the caller owns. The
   * ownership check happens here rather than in the controller because the
   * GHN service only knows the order id, and the refresh route is the one
   * customer-facing endpoint that can trigger a carrier API call.
   */
  async refreshMyShipment(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.ghn.refreshShipment(orderId);
  }

  /**
   * Staff/Admin view of all orders, optionally narrowed to one status. The
   * caller is validated by the RolesGuard; this method is deliberately user-
   * agnostic and returns every matching order with the buyer + payment rows.
   */
  async listAll(status?: string) {
    const where =
      status && status in OrderStatus
        ? { status: status as OrderStatus }
        : undefined;

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payment: true,
        shipment: true,
        user: {
          select: { id: true, email: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.toView(o));
  }

  /**
   * Confirms that a COD order was settled — the shipper handed over the cash,
   * so the order is closed as paid by a human rather than by a provider
   * callback. The caller is validated by the RolesGuard, so this method only
   * has to keep the state machine itself consistent.
   *
   * Only COD orders are approvable here: every other provider marks its own
   * orders paid through a signature-verified return/webhook path, and letting
   * a staff member approve those by hand would let a paid-but-uncaptured order
   * be released.
   */
  async confirmCod(orderId: string, confirmedBy: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Idempotent: a double tap, or one staff member racing another, must not
      // fail or overwrite the first confirmation.
      if (order.status === OrderStatus.PAID) {
        return { ok: true, alreadyConfirmed: true };
      }
      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException(
          'A cancelled order cannot be approved',
        );
      }
      if (!order.payment || order.payment.provider !== PaymentProvider.COD) {
        throw new BadRequestException('Only COD orders can be approved here');
      }

      const now = new Date();
      const confirmedAt = now.toISOString();

      // Annotated in place rather than in a new column: Payment.payload is a
      // JSON column already written by every provider, so the audit trail adds
      // no schema change and ids are recorded even if the row is re-pushed.
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          payload: {
            ...(typeof order.payment.payload === 'object' &&
            order.payment.payload !== null
              ? order.payment.payload
              : {}),
            codConfirmedAt: confirmedAt,
            codConfirmedBy: confirmedBy,
          },
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, paidAt: now },
      });

      return {
        ok: true,
        status: 'confirmed',
        orderId: order.id,
        confirmedAt,
      };
    });

    // Outside the transaction on purpose: GHN is a network call whose latency
    // must not extend the window in which the row lock is held, and a courier
    // outage must not roll back a payment a human has already accepted.
    if (result.ok && !result.alreadyConfirmed) {
      await this.tryCreateShipment(orderId, confirmedBy);
    }

    return result;
  }

  /**
   * Pushes a GHN consignment for a paid order, swallowing every failure. The
   * caller is a payment path whose result the customer waits on, so a courier
   * outage is logged and left for the admin panel's re-push button rather than
   * surfaced as a checkout error.
   */
  private async tryCreateShipment(orderId: string, createdById: string) {
    try {
      await this.ghn.createShipment(orderId, createdById);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `Khong the tao van don GHN cho don ${orderId}`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  private toView(order: OrderRecord) {
    // Order payloads are stored encrypted with AES-256-GCM. A row that fails
    // authentication is tampered with or was written under a rotated key, so
    // surface a failure instead of returning ciphertext as if it were data.
    const dec = (value: string | null) => {
      try {
        return this.crypto.decrypt(value) ?? null;
      } catch {
        return null;
      }
    };
    return {
      ...order,
      receiverName: dec(order.receiverName),
      receiverPhone: dec(order.receiverPhone),
      receiverAddress: dec(order.receiverAddress),
      note: dec(order.note),
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      total: Number(order.total),
      ...(order.payment
        ? {
            payment: {
              ...order.payment,
              amount: Number(order.payment.amount),
            },
          }
        : {}),
    };
  }
}
