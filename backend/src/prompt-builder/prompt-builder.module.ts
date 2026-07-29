import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { PromptBuilderService } from './prompt-builder.service';

/**
 * PromptBuilderModule
 *
 * Exports PromptBuilderService for use by any feature module that needs
 * centralised prompt building (AssistantModule, ContentModule, CampaignsModule, etc.).
 */
@Module({
  imports: [BusinessModule],
  providers: [PromptBuilderService],
  exports: [PromptBuilderService],
})
export class PromptBuilderModule {}
