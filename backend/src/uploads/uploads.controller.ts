import { Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UploadsService } from './uploads.service.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/guards/roles.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('images')
  @UseGuards(JwtGuard, RolesGuard, CsrfGuard)
  @Roles('STAFF', 'ADMIN')
  createImageUpload(@Req() req: Request) {
    return this.uploads.uploadImage(req);
  }

  /**
   * Serving the stored bytes back through the API is what lets an uploaded
   * image render without the bucket being public: `<img>` points at this
   * origin. The id is validated against the stored-naming pattern before the
   * bucket is touched, and the response is immutable because every upload gets
   * a fresh uuid key.
   */
  @Get('images/:id')
  @Public()
  async readImage(@Param('id') id: string, @Res() res: Response) {
    const image = await this.uploads.readImage(id);
    res.setHeader(
      'Content-Type',
      image.contentType ?? 'application/octet-stream',
    );
    // Overrides the global no-store, which would otherwise defeat caching.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.end(image.body);
  }
}
