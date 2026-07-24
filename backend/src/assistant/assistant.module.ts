import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { RagService } from './rag.service';

@Module({
  imports: [AuthModule],
  providers: [AssistantService, RagService],
  controllers: [AssistantController],
  exports: [AssistantService, RagService],
})
export class AssistantModule {}
