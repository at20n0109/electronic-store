import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { parseCorsOrigins } from './common/cors.js';

async function bootstrap() {
  // rawBody is required by payment providers (Stripe, ZaloPay, MoMo) to verify
  // webhook signatures. Without it signature verification silently no-ops.
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['error', 'warn', 'log'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.use(cookieParser());

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains',
      );
    }
    next();
  });

  app.setGlobalPrefix('api/v1');

  // CORS is an exact-match origin list. Building a RegExp from configuration
  // would put operator-supplied pattern syntax into the request path (a ReDoS
  // surface) for no benefit here, so wildcards are rejected outright and
  // origins are compared as plain strings.
  const cors = parseCorsOrigins(process.env.CORS_ORIGIN ?? 'http://localhost:3000');

  if (cors.error) {
    throw new Error(cors.error);
  }

  if (process.env.NODE_ENV === 'production' && cors.origins.size === 0) {
    throw new Error('CORS_ORIGIN must contain one or more trusted HTTPS origins');
  }

  const allowedOrigins = cors.origins;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // A preflight or no-origin request (curl, same-origin) is not a CORS
      // grant; only an origin that is on the list is echoed back.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-csrf-token',
    ],
  });

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  Logger.log(`Application running on port ${port}`, 'Bootstrap');
}

bootstrap();
