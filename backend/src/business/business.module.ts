import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PaymentModule } from '../payment/payment.module';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';

@Module({
  imports: [AuthModule, IntegrationsModule, PaymentModule],
  providers: [BusinessService],
  controllers: [BusinessController],
  exports: [BusinessService],
})
export class BusinessModule {}
