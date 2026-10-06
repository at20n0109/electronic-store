import { Controller, Get, Param } from '@nestjs/common';
import { PcBuildsService } from './pc-builds.service.js';

@Controller('pc-builds')
export class PcBuildsController {
  constructor(private readonly pcBuildsService: PcBuildsService) {}

  @Get()
  findAll() {
    return this.pcBuildsService.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.pcBuildsService.findBySlug(slug);
  }
}
