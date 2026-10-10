import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { slugify } from '../common/slug.util.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductsDto } from './dto/query-products.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize<T extends { price: unknown }>(row: T) {
    return {
      ...row,
      price: Number(row.price),
    };
  }

  async findAll(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = this.buildWhere(query);

    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: this.buildOrderBy(query.sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.serialize(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Staff/Admin catalogue listing. Unlike {@link findAll} it does not filter by
   * status, so DRAFT/HIDDEN rows are visible for management. The route is
   * protected by the RolesGuard.
   */
  async findAllAdmin(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where = this.buildWhere(query, true);

    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: this.buildOrderBy(query.sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.serialize(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  private buildWhere(query: QueryProductsDto, includeAll = false) {
    const where: Record<string, unknown> = includeAll ? {} : { status: 'ACTIVE' };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = { slug: query.category };
    }

    const price: Record<string, number> = {};
    if (query.minPrice !== undefined) price.gte = query.minPrice;
    if (query.maxPrice !== undefined) price.lte = query.maxPrice;
    if (Object.keys(price).length > 0) where.price = price;

    if (query.inStock === 'true') where.stock = { gt: 0 };

    return where;
  }

  private buildOrderBy(
    sort?: QueryProductsDto['sort'],
  ): Record<string, 'asc' | 'desc'> {
    switch (sort) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'name_asc':
        return { name: 'asc' };
      default:
        return { createdAt: 'desc' };
    }
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundException('Product not found');
    }

    return this.serialize(product);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.serialize(product);
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });

    if (existing) {
      throw new ConflictException('SKU already exists');
    }

    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }

    const slug = `${slugify(dto.name)}-${Date.now()}`;

    return this.serialize(
      await this.prisma.product.create({
        data: {
          sku: dto.sku,
          name: dto.name,
          slug,
          description: dto.description,
          specs: dto.specs ?? undefined,
          price: dto.price,
          stock: dto.stock,
          categoryId: dto.categoryId ?? null,
          images: dto.images?.length
            ? {
                create: dto.images.map((image, index) => ({
                  url: image.url,
                  alt: image.alt,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
    );
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.sku && dto.sku !== product.sku) {
      const taken = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });

      if (taken) {
        throw new ConflictException('SKU already exists');
      }
    }

    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }

    const baseData: Record<string, unknown> = {
      sku: dto.sku ?? product.sku,
      name: dto.name ?? product.name,
      description: dto.description ?? product.description,
      specs: dto.specs !== undefined ? dto.specs : undefined,
      price: dto.price ?? product.price,
      stock: dto.stock ?? product.stock,
      categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
    };

    if (dto.name && dto.name !== product.name) {
      baseData.slug = `${slugify(dto.name)}-${Date.now()}`;
    }

    if (dto.images) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });

      baseData.images = dto.images.length
        ? {
            create: dto.images.map((image, index) => ({
              url: image.url,
              alt: image.alt,
              sortOrder: index,
            })),
          }
        : undefined;
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: baseData,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return this.serialize(updated);
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.delete({ where: { id } });

    return { success: true };
  }

  private async ensureCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }
}