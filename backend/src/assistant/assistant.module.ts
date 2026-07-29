import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PromptBuilderModule } from '../prompt-builder/prompt-builder.module';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { RagService } from './rag.service';

/**
 * AssistantModule
 *
 * Imports PromptBuilderModule so AssistantService can call
 * PromptBuilderService.buildBusinessPrompt() for business-context-aware responses.
 */
@Module({
  imports: [AuthModule, PromptBuilderModule],
  providers: [AssistantService, RagService],
  controllers: [AssistantController],
  exports: [AssistantService, RagService],
})
export class AssistantModule {}
