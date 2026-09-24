import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderService } from './order.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';

@Controller('orders')
@UseGuards(JwtGuard)
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  @UseGuards(CsrfGuard)
  async create(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const user = (req as any).user;
    return this.orders.create(user.id, dto);
  }

  @Get()
  async myOrders(@Req() req: Request) {
    const user = (req as any).user;
    return this.orders.myOrders(user.id);
  }

  @Get(':id')
  async myOrder(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user;
    return this.orders.myOrder(user.id, id);
  }
}
