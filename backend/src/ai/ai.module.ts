import { Global, Module } from '@nestjs/common';
import { AiService } from './ai.service';

/**
 * AiModule — Global module that provides AIService to every module.
 *
 * Marked @Global() so that no feature module needs to explicitly import it.
 * AIService is the single gateway for all OpenRouter communication.
 *
 * Prompt flow:
 *   BusinessIntelligenceService → PromptBuilderService → AIService → OpenRouter
 */
@Global()
@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
