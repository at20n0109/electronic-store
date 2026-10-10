import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { AddCartItemsDto } from './dto/add-cart-items.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';

@Controller('cart')
@UseGuards(JwtGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  async getCart(@Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.cart.getCart(user.id);
  }

  @Post('items/bulk')
  @UseGuards(CsrfGuard)
  async addItems(@Req() req: Request, @Body() dto: AddCartItemsDto) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.cart.addItems(user.id, dto);
  }

  @Post('items')
  @UseGuards(CsrfGuard)
  async addItem(@Req() req: Request, @Body() dto: AddCartItemDto) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.cart.addItem(user.id, dto);
  }

  @Patch('items/:itemId')
  @UseGuards(CsrfGuard)
  async updateItem(
    @Req() req: Request,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.cart.updateItem(user.id, itemId, dto);
  }

  @Delete('items/:itemId')
  @UseGuards(CsrfGuard)
  async removeItem(
    @Req() req: Request,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.cart.removeItem(user.id, itemId);
  }

  @Delete()
  @UseGuards(CsrfGuard)
  async clear(@Req() req: Request) {
    const user = (req as any).user;
    return this.cart.clear(user.id);
  }
}
