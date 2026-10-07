import { Body, Controller, Get, Headers, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import type { Request, Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtGuard)
  checkout(@Req() req: Request, @Body() dto: CheckoutDto) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.payments.createCheckout(
      user.id,
      dto.orderId,
      dto.provider,
      req,
    );
  }

  @Get('methods')
  methods() {
    return this.payments.availableMethods();
  }

  @Get('return')
  @UseGuards(JwtGuard)
  vnpayReturn(@Query() query: Record<string, string>, @Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.payments.handleVnpayReturn(user.id, query);
  }

  @Get('momo/return')
  @UseGuards(JwtGuard)
  async momoReturn(
    @Query() query: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    const result = await this.payments.handleMomoReturn(user.id, query);
    res.redirect(result.returnUrl);
  }

  @Get('paypal/return')
  @UseGuards(JwtGuard)
  async paypalReturn(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    const result = await this.payments.handlePaypalReturn(user.id, token);
    res.redirect(result.returnUrl);
  }

  @Get('zalopay/return')
  async zalopayReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.payments.handleZalopayReturn(query);
    res.redirect(result.returnUrl);
  }

  @Post('zalopay/callback')
  @HttpCode(200)
  async zalopayCallback(@Req() req: Request) {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    return this.payments.handleZalopayCallback(rawBody);
  }

  @Get('vnpay/ipn')
  @Post('vnpay/ipn')
  @HttpCode(200)
  vnpayIpn(@Query() query: Record<string, string>) {
    return this.payments.handleVnpayIpn(query);
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
