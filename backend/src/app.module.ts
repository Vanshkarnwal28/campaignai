import { Module } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { BusinessModule } from './business/business.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SupportModule } from './support/support.module';
import { AdminModule } from './admin/admin.module';
import { AssistantModule } from './assistant/assistant.module';
import { ContentModule } from './content/content.module';
import { LeadsModule } from './leads/leads.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { PaymentModule } from './payment/payment.module';
// AI — OpenRouter replaces Gemini
import { OpenRouterModule } from './openrouter/openrouter.module';

@Module({
  imports: [
    // Core infrastructure
    FirebaseModule,
    OpenRouterModule,     // Global AI service (OpenRouter)
    // Feature modules
    AuthModule,
    IntegrationsModule,
    BusinessModule,
    CampaignsModule,
    SupportModule,
    AdminModule,
    AssistantModule,
    PaymentModule,
    // Phase 7 — future features
    ContentModule,
    LeadsModule,
    SchedulerModule,
  ],
})
export class AppModule {}
