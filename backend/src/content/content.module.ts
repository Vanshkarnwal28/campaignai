import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessModule } from '../business/business.module';
import { PromptBuilderModule } from '../prompt-builder/prompt-builder.module';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { GraphicGeneratorService } from './graphic-generator.service';

@Module({
  imports: [AuthModule, BusinessModule, PromptBuilderModule],
  providers: [ContentService, GraphicGeneratorService],
  controllers: [ContentController],
  exports: [ContentService, GraphicGeneratorService],
})
export class ContentModule {}
