import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { SchedulerService } from './scheduler.service';
import { SchedulerController, ApiScheduleController, ApiWorkerController } from './scheduler.controller';
import { IntegrationsModule } from '../integrations/integrations.module';
import { CloudTasksService } from './cloud-tasks.service';

import { SpecialEventsService } from './special-events.service';
import { RabbitMqService } from './rabbitmq.service';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule, IntegrationsModule, BusinessModule],
  controllers: [SchedulerController, ApiScheduleController, ApiWorkerController],
  providers: [SchedulerService, CloudTasksService, SpecialEventsService, RabbitMqService],
  exports: [SchedulerService, CloudTasksService, SpecialEventsService, RabbitMqService],
})
export class SchedulerModule {}
