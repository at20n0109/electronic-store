import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import { PublicGuard } from '../common/guards/public.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';

/**
 * Authentication is registered globally so every route is protected by default.
 * PublicGuard runs first, this lets @Public() routes through; JwtGuard then
 * requires a valid token for every other route (default-deny auth). CsrfGuard
 * protects cookie-authenticated state changes.
 *
 * The global guards are instantiated here, so their dependencies must be
 * resolvable in this module: JwtModule, ConfigModule and the global PrismaModule.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: Number(config.get<string>('JWT_ACCESS_TTL') ?? 900),
          algorithm: 'HS256',
          issuer: config.get<string>('JWT_ISSUER') ?? 'pc-store-api',
          audience: config.get<string>('JWT_AUDIENCE') ?? 'pc-store-web',
        },
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PublicGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    CsrfGuard,
    PublicGuard,
    Reflector,
  ],
  exports: [Reflector, JwtModule, CsrfGuard, PublicGuard],
})
export class CoreModule {}
