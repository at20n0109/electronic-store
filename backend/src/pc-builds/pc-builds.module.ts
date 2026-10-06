import { Module } from '@nestjs/common';
import { PcBuildsController } from './pc-builds.controller.js';
import { PcBuildsService } from './pc-builds.service.js';

@Module({
  controllers: [PcBuildsController],
  providers: [PcBuildsService],
  exports: [PcBuildsService],
})
export class PcBuildsModule {}
