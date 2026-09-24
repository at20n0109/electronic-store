import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

const FREE_SHIPPING_MIN = 300000;
const SHIPPING_FEE = 30000;

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
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
          receiverName: dto.receiverName,
          receiverPhone: dto.receiverPhone,
          receiverAddress: dto.receiverAddress,
          note: dto.note ?? null,
          items: { create: lineItems },
        },
        include: { items: { include: { product: true } } },
      });

      await tx.cartItem.deleteMany({
        where: { cart: { userId } },
      });

      return created;
    });
  }

  async myOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      shipping: Number(o.shipping),
      total: Number(o.total),
    }));
  }

  async myOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      ...order,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      total: Number(order.total),
    };
  }
}
