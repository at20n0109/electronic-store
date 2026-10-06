import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  category: { select: { id: true, name: true, slug: true } },
} as const;

type BuildRow = Awaited<
  ReturnType<PrismaService['pcBuild']['findFirst']>
> & {
  items: Array<{
    slot: string;
    sortOrder: number;
    product: unknown;
  }>;
};

@Injectable()
export class PcBuildsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize<T extends { price: unknown }>(row: T) {
    return {
      ...row,
      price: Number(row.price),
    };
  }

  private serializeBuild(build: NonNullable<BuildRow>) {
    const items = build.items.map((item) => {
      const product = this.serialize(
        item.product as { price: unknown; id: string },
      );
      return {
        slot: item.slot,
        sortOrder: item.sortOrder,
        product,
      };
    });

    const total = items.reduce((sum, item) => sum + item.product.price, 0);

    return {
      id: build.id,
      slug: build.slug,
      name: build.name,
      tagline: build.tagline,
      description: build.description,
      budget: build.budget,
      tier: build.tier,
      sortOrder: build.sortOrder,
      total,
      remaining: build.budget - total,
      items,
    };
  }

  async findAll() {
    const builds = await this.prisma.pcBuild.findMany({
      orderBy: [{ sortOrder: 'asc' }, { tier: 'asc' }],
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { product: { include: productInclude } },
        },
      },
    });

    return builds.map((build) => this.serializeBuild(build));
  }

  async findBySlug(slug: string) {
    const build = await this.prisma.pcBuild.findUnique({
      where: { slug },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { product: { include: productInclude } },
        },
      },
    });

    if (!build) {
      throw new NotFoundException('PC build not found');
    }

    const serialized = this.serializeBuild(build);

    const categorySlugs = [
      ...new Set(
        build.items
          .map((item) => item.product.category?.slug)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const pool =
      categorySlugs.length > 0
        ? await this.prisma.product.findMany({
            where: {
              status: 'ACTIVE',
              category: { slug: { in: categorySlugs } },
            },
            include: productInclude,
          })
        : [];

    const alternatives: Record<
      string,
      Array<ReturnType<PcBuildsService['serialize']>>
    > = {};

    for (const item of build.items) {
      const categorySlug = item.product.category?.slug;
      if (!categorySlug) continue;

      alternatives[item.slot] = pool
        .filter(
          (product) =>
            product.category?.slug === categorySlug &&
            product.id !== item.productId,
        )
        .map((product) => this.serialize(product));
    }

    return { ...serialized, alternatives };
  }
}
