import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PaymentModule } from '../payment/payment.module';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { BusinessIntelligenceService } from './business-intelligence.service';

/**
 * BusinessModule
 *
 * Provides:
 *  - BusinessService          — onboarding, profile CRUD, subscription management
 *  - BusinessIntelligenceService — blueprint generation, versioning, approval, business context
 *
 * Both services are exported so other modules (ContentModule, CampaignsModule,
 * LeadsModule, AssistantModule, PromptBuilderModule) can consume them.
 */
@Module({
  imports: [AuthModule, IntegrationsModule, PaymentModule],
  providers: [BusinessService, BusinessIntelligenceService],
  controllers: [BusinessController],
  exports: [BusinessService, BusinessIntelligenceService],
})
export class BusinessModule {}
