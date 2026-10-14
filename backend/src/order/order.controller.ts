import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderService } from './order.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/guards/roles.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';

@Controller('orders')
@UseGuards(JwtGuard)
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  @UseGuards(CsrfGuard)
  async create(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.orders.create(user.id, dto);
  }

  @Get()
  async myOrders(@Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.orders.myOrders(user.id);
  }

  // Declared before :id so the literal path wins over the uuid param.
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF')
  async adminOrders(@Query('status') status?: string) {
    return this.orders.listAll(status);
  }

  /**
   * Settles a COD order after the cash is actually collected. Unlike the
   * provider return/webhook routes, this one is a deliberate staff action, so
   * it carries CsrfGuard on top of the role check.
   */
  @Post(':id/cod-confirm')
  @UseGuards(RolesGuard, CsrfGuard)
  @Roles('ADMIN', 'STAFF')
  async codConfirm(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.orders.confirmCod(id, user.id);
  }

  @Get(':id')
  async myOrder(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.orders.myOrder(user.id, id);
  }

  /**
   * Lets the order's owner pull a fresh GHN status for their own consignment.
   * Ownership is enforced in the service; CSRF is required because this
   * triggers a carrier-side API call whose result is persisted.
   */
  @Post(':id/shipment/refresh')
  @UseGuards(CsrfGuard)
  async refreshShipment(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.orders.refreshMyShipment(user.id, id);
  }
}
