import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OtpService } from './otp.service.js';
import { JwtGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';
import { CoreModule } from '../core/core.module.js';

@Module({
  imports: [
    ConfigModule,
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
    CoreModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtGuard,
    RolesGuard,
    CsrfGuard,
  ],
  exports: [
    AuthService,
    JwtModule,
    JwtGuard,
    RolesGuard,
    CsrfGuard,
  ],
})
export class AuthModule {}
