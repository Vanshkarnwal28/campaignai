import { Global, Module } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';

/**
 * OpenRouterModule — Global module that provides OpenRouterService
 * to every module in the application for AI-powered features.
 */
@Global()
@Module({
  providers: [OpenRouterService],
  exports: [OpenRouterService],
})
export class OpenRouterModule {}