import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessModule } from '../business/business.module';
import { PromptBuilderModule } from '../prompt-builder/prompt-builder.module';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';

@Module({
  imports: [AuthModule, BusinessModule, PromptBuilderModule],
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
