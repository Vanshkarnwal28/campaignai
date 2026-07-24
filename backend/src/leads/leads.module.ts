import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeadsService } from './leads.service';
import { LeadAssistantService } from './lead-assistant.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadAssistantService],
})
export class LeadsModule {}
