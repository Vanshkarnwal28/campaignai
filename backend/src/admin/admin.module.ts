import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SeoCrawlerService } from './seo-crawler.service';

@Module({
  imports: [AuthModule],
  providers: [AdminService, SeoCrawlerService],
  controllers: [AdminController],
  exports: [AdminService, SeoCrawlerService],
})
export class AdminModule {}
