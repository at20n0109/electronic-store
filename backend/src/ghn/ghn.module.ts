import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { GhnService } from './ghn.service.js';
import { GhnController } from './ghn.controller.js';

@Module({
  imports: [PrismaModule, CryptoModule],
  controllers: [GhnController],
  providers: [GhnService],
  exports: [GhnService],
})
export class GhnModule {}
