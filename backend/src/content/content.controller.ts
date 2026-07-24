import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /** POST /content/generate-plan — generate a 5-day content calendar */
  @Post('generate-plan')
  async generatePlan(
    @Body() body: { businessId: string; industry?: string },
  ) {
    return this.contentService.generateContentPlan(body.businessId, body.industry);
  }

  /** GET /content/calendar?businessId=xxx — fetch content calendar entries */
  @Get('calendar')
  async getCalendar(@Query('businessId') businessId: string) {
    return this.contentService.getContentCalendar(businessId);
  }

  /** GET /content/generated?businessId=xxx — fetch all generated content */
  @Get('generated')
  async getGeneratedContent(@Query('businessId') businessId: string) {
    return this.contentService.getGeneratedContent(businessId);
  }

  /** PATCH /content/calendar/:id/publish — mark a calendar entry as published */
  @Patch('calendar/:id/publish')
  async markPublished(@Param('id') id: string) {
    return this.contentService.markPublished(id);
  }

  /** PUT /content/calendar/:id — update/reschedule a calendar entry */
  @Patch('calendar/:id')
  async updateCalendarEntry(
    @Param('id') id: string,
    @Body() body: { caption?: string; scheduledTime?: Date; status?: string },
  ) {
    return this.contentService.updateCalendarEntry(id, body);
  }
}
