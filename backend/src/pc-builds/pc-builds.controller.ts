import { Controller, Get, Param } from '@nestjs/common';
import { PcBuildsService } from './pc-builds.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('pc-builds')
export class PcBuildsController {
  constructor(private readonly pcBuildsService: PcBuildsService) {}

  @Get()
  @Public()
  findAll() {
    return this.pcBuildsService.findAll();
  }

  @Get(':slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.pcBuildsService.findBySlug(slug);
  }
}
