import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { MetaController } from './meta.controller';

@Module({
  controllers: [MetaController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
