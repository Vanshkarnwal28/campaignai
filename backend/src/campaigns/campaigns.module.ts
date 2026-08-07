import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { BusinessModule } from '../business/business.module';
import { ContentModule } from '../content/content.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { ReportGeneratorService } from './report-generator.service';

@Module({
  imports: [AuthModule, IntegrationsModule, BusinessModule, ContentModule],
  providers: [CampaignsService, ReportGeneratorService],
  controllers: [CampaignsController],
  exports: [CampaignsService, ReportGeneratorService],
})
export class CampaignsModule {}
