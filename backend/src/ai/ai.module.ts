import { Global, Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiAdCampaignService } from './ai-ad-campaign.service';
import { AiAdCampaignController, ApiAiAdCampaignController } from './ai-ad-campaign.controller';
import { GraphicGeneratorService } from '../content/graphic-generator.service';

import { BusinessModule } from '../business/business.module';

/**
 * AiModule — Global module that provides AIService and AiAdCampaignService.
 */
@Global()
@Module({
  imports: [BusinessModule],
  controllers: [AiAdCampaignController, ApiAiAdCampaignController],
  providers: [AiService, AiAdCampaignService, GraphicGeneratorService],
  exports: [AiService, AiAdCampaignService, GraphicGeneratorService],
})
export class AiModule {}
