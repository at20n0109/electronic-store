import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AddCartItemDto } from './dto/add-cart-item.dto.js';
import type { AddCartItemsDto } from './dto/add-cart-items.dto.js';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

const ACTIVE = 'ACTIVE';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                name: true,
                price: true,
                stock: true,
                status: true,
                images: { select: { url: true }, take: 1 },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const items = cart.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      product: i.product,
    }));

    const itemCount = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce(
      (s, i) => s + Number(i.product.price) * i.quantity,
      0,
    );

    return {
      id: cart.id,
      items,
      itemCount,
      subtotal: Number(subtotal.toFixed(2)),
    };
  }

  async getOrCreate(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || product.status !== ACTIVE) {
      throw new NotFoundException('Product not found');
    }

    const qty = dto.quantity ?? 1;
    if (qty < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }
    if (qty > product.stock) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    const cart = await this.getOrCreate(userId);

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    });

    if (existing) {
      const next = existing.quantity + qty;
      if (next > product.stock) {
        throw new BadRequestException('Quantity exceeds available stock');
      }
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: next },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: qty,
        },
      });
    }

    return this.getCart(userId);
  }

  async addItems(userId: string, dto: AddCartItemsDto) {
    const cart = await this.getOrCreate(userId);

    for (const entry of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: entry.productId },
      });
      if (!product || product.status !== ACTIVE) continue;

      const qty = entry.quantity ?? 1;
      if (qty < 1) continue;
      if (qty > product.stock) continue;

      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      });

      if (existing) {
        const next = existing.quantity + qty;
        if (next > product.stock) continue;
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: next },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            quantity: qty,
          },
        });
      }
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const qty = dto.quantity;
    if (qty < 0) {
      throw new BadRequestException('Quantity must be at least 1');
    }
    if (qty === 0) {
      return this.removeItem(userId, itemId);
    }

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, product: true },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }
    if (qty > item.product.stock) {
      throw new BadRequestException('Quantity exceeds available stock');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: qty },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getCart(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreate(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getCart(userId);
  }
}
