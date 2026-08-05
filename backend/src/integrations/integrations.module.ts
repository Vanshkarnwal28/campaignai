import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { MetaController, ApiMetaController } from './meta.controller';

@Module({
  controllers: [MetaController, ApiMetaController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
