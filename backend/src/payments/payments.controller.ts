import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { AtmSubmitDto } from './dto/atm.dto.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/guards/roles.guard.js';
import { Public } from '../common/decorators/public.decorator.js';
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
  @Public()
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
  @Public()
  async zalopayReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.payments.handleZalopayReturn(query);
    res.redirect(result.returnUrl);
  }

  @Post('zalopay/callback')
  @HttpCode(200)
  @Public()
  async zalopayCallback(@Req() req: Request) {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    return this.payments.handleZalopayCallback(rawBody);
  }

  // POST only: an IPN is a server-to-server call. A GET lets an attacker
  // settle an order by simply having the user click a link.
  @Post('vnpay/ipn')
  @HttpCode(200)
  @Public()
  vnpayIpn(@Query() query: Record<string, string>) {
    return this.payments.handleVnpayIpn(query);
  }

  @Post('webhook')
  @HttpCode(200)
  @Public()
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    return this.payments.handleWebhook(rawBody, signature);
  }

  @Get('atm/submissions')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  atmSubmissions(@Query('status') status?: string) {
    return this.payments.listAtmSubmissions(status);
  }

  @Post(':orderId/atm-submit')
  @UseGuards(JwtGuard)
  atmSubmit(
    @Req() req: Request,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AtmSubmitDto,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.payments.submitAtm(user.id, orderId, dto);
  }

  @Post(':paymentId/atm-confirm')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  atmConfirm(
    @Req() req: Request,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() body: { note?: string } = {},
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.payments.confirmAtm(paymentId, user.id, body.note);
  }
}
