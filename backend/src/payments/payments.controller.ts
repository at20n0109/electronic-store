import { Body, Controller, Get, Headers, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import type { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtGuard)
  checkout(@Req() req: Request, @Body() dto: CheckoutDto) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.payments.createCheckout(user.id, dto.orderId, req);
  }

  @Get('return')
  @UseGuards(JwtGuard)
  vnpayReturn(@Query() query: Record<string, string>, @Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.payments.handleVnpayReturn(user.id, query);
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    return this.payments.handleWebhook(rawBody, signature);
  }
}
