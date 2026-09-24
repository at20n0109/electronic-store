import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UploadsService } from './uploads.service.js';
import { CreateImageUploadDto } from './dto/create-image-upload.dto.js';
import { JwtGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/guards/roles.guard.js';
import { CsrfGuard } from '../common/guards/csrf.guard.js';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('images')
  @UseGuards(JwtGuard, RolesGuard, CsrfGuard)
  @Roles('STAFF', 'ADMIN')
  createImagePresigned(@Body() dto: CreateImageUploadDto) {
    return this.uploads.createImagePresigned(dto);
  }
}
