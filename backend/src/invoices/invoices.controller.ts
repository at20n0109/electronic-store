import { Controller, Get, Param, ParseUUIDPipe, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InvoicesService } from './invoices.service.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get('orders/:id')
  @UseGuards(JwtGuard)
  getByOrder(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.invoices.getOrCreate(user.id, id);
  }

  @Get(':id/pdf')
  @UseGuards(JwtGuard)
  async pdf(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    const { content, filename } = await this.invoices.getPdf(id, user.id);
    res
      .type('application/pdf')
      .setHeader('Content-Disposition', `inline; filename="${filename}"`)
      .end(content);
  }
}
