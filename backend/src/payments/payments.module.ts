import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GhnModule } from '../ghn/ghn.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [AuthModule, GhnModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
