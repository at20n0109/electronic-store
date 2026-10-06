import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CartModule } from './cart/cart.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { CryptoModule } from './crypto/crypto.module.js';
import { HealthModule } from './health/health.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { OrderModule } from './order/order.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PcBuildsModule } from './pc-builds/pc-builds.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { UploadsModule } from './uploads/uploads.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validate: (env) => {
        if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
        if (!env.JWT_ACCESS_SECRET || env.JWT_ACCESS_SECRET.length < 32) {
          throw new Error('JWT_ACCESS_SECRET must be a random value of at least 32 characters');
        }
        if (env.NODE_ENV === 'production' && !env.CORS_ORIGIN) {
          throw new Error('CORS_ORIGIN is required in production');
        }
        if (!env.ENCRYPTION_KEY) {
          throw new Error(
            'ENCRYPTION_KEY is required (base64 of 32 bytes)',
          );
        }
        return env;
      },
    }),
    PrismaModule,
    HealthModule,
    CryptoModule,
    CategoriesModule,
    ProductsModule,
    AuthModule,
    CartModule,
    OrderModule,
    UploadsModule,
    PaymentsModule,
    InvoicesModule,
    PcBuildsModule,
  ],
})
export class AppModule {}
