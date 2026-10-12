import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { GhnService } from './ghn.service.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles, RolesGuard } from '../auth/guards/roles.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';

@Controller('ghn')
export class GhnController {
  constructor(private readonly ghn: GhnService) {}

  /**
   * Address master data is public reference data that GHN itself serves to any
   * authenticated caller, so mirroring it publicly costs nothing secret. It is
   * proxied rather than fetched from the browser because the Token header must
   * never reach a client.
   */
  @Get('master/provinces')
  @Public()
  provinces() {
    return this.ghn.listProvinces();
  }

  @Get('master/districts')
  @Public()
  districts(@Query('province_id', ParseIntPipe) provinceId: number) {
    return this.ghn.listDistricts(provinceId);
  }

  @Get('master/wards')
  @Public()
  wards(@Query('district_id', ParseIntPipe) districtId: number) {
    return this.ghn.listWards(districtId);
  }

  @Post('orders/:orderId/shipment')
  @UseGuards(RolesGuard, CsrfGuard)
  @Roles('ADMIN', 'STAFF')
  createShipment(
    @Req() req: Request,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.ghn.createShipment(orderId, user.id);
  }

  @Get('orders/:orderId/shipment')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'STAFF')
  getShipment(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.ghn.getShipment(orderId);
  }

  /**
   * Re-reads the consignment status from GHN. The Express-level JwtGuard is
   * applied at the class level below; the extra guards here mirror the create
   * route so a status refresh is treated as a mutation, not a read.
   */
  @Post('orders/:orderId/shipment/refresh')
  @UseGuards(JwtGuard, RolesGuard, CsrfGuard)
  @Roles('ADMIN', 'STAFF')
  refreshShipment(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.ghn.refreshShipment(orderId);
  }
}
