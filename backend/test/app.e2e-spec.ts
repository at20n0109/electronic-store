import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('returns ok with database connected', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect(({ body }) => {
          expect(body.status).toBe('ok');
          expect(body.database).toBe('connected');
          expect(body.timestamp).toBeTruthy();
        });
    });
  });

  describe('GET /api/v1/products', () => {
    it('returns paginated products', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?limit=5')
        .expect(200)
        .expect(({ body }) => {
          expect(Array.isArray(body.data)).toBe(true);
          expect(body.meta).toMatchObject({
            page: 1,
            limit: 5,
            totalPages: expect.any(Number),
            total: expect.any(Number),
          });
          expect(body.data.length).toBeLessThanOrEqual(5);
          if (body.data.length > 0) {
            expect(typeof body.data[0].price).toBe('number');
          }
        });
    });

    it('filters by category and price', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?category=gpu&minPrice=5000000')
        .expect(200)
        .expect(({ body }) => {
          expect(body.data.length).toBeGreaterThan(0);
          for (const product of body.data) {
            expect(product.category?.slug).toBe('gpu');
            expect(product.price).toBeGreaterThanOrEqual(5000000);
          }
        });
    });

    it('searches by keyword', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?search=rtx')
        .expect(200)
        .expect(({ body }) => {
          expect(body.data.length).toBeGreaterThan(0);
        });
    });

    it('rejects invalid sort values', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?sort=invalid')
        .expect(400);
    });
  });

  describe('CRUD flow', () => {
    const sku = `E2E-${Date.now()}`;

    it('creates, reads, updates and deletes a product', async () => {
      const server = app.getHttpServer();

      const created = await request(server)
        .post('/api/v1/products')
        .send({
          sku,
          name: 'E2E Test Product',
          description: 'Created by e2e test',
          price: 123456.5,
          stock: 2,
        })
        .expect(201);

      const productId: string = created.body.id;
      expect(created.body.price).toBe(123456.5);

      const found = await request(server)
        .get(`/api/v1/products/${productId}`)
        .expect(200);

      expect(found.body.sku).toBe(sku);

      const updated = await request(server)
        .patch(`/api/v1/products/${productId}`)
        .send({ stock: 5, price: 200000 })
        .expect(200);

      expect(updated.body.stock).toBe(5);
      expect(updated.body.price).toBe(200000);

      const removed = await request(server)
        .delete(`/api/v1/products/${productId}`)
        .expect(200);

      expect(removed.body.success).toBe(true);

      await request(server)
        .get(`/api/v1/products/${productId}`)
        .expect(404);
    });

    it('rejects duplicate SKUs', async () => {
      const dupeSku = `E2E-DUP-${Date.now()}`;

      const first = await request(app.getHttpServer())
        .post('/api/v1/products')
        .send({ sku: dupeSku, name: 'First', price: 1000, stock: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/products')
        .send({ sku: dupeSku, name: 'Duplicate', price: 1000, stock: 1 })
        .expect(409);

      await request(app.getHttpServer())
        .delete(`/api/v1/products/${first.body.id as string}`)
        .expect(200);
    });

    it('rejects invalid payloads', () => {
      return request(app.getHttpServer())
        .post('/api/v1/products')
        .send({ sku: 'X', name: 'X', price: -1, stock: 0 })
        .expect(400);
    });
  });

  describe('GET /api/v1/categories', () => {
    it('lists categories with product counts', () => {
      return request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200)
        .expect(({ body }) => {
          expect(Array.isArray(body)).toBe(true);
          expect(body.length).toBeGreaterThan(0);
          expect(body[0]).toHaveProperty('slug');
          expect(body[0]).toHaveProperty('_count');
        });
    });
  });
});