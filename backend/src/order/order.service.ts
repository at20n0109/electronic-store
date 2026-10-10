import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { OrderStatus } from '../generated/prisma/enums.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

const FREE_SHIPPING_MIN = 300000;
const SHIPPING_FEE = 30000;

interface OrderRecord {
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note: string | null;  subtotal: unknown;
  shipping: unknown;
  total: unknown;
  payment?: { amount: unknown } | null;
  items?: unknown;
  user?: unknown;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly crypto: CryptoService,
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
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.toView(o));
  }

  async myOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.toView(order);
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
        user: {
          select: { id: true, email: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.toView(o));
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
