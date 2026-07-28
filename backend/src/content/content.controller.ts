import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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

  /** POST /content/generate-plan — generate a content calendar with posting days and duration */
  @Post('generate-plan')
  async generatePlan(
    @Body() body: { 
      businessId: string; 
      selectedDays?: string[]; 
      durationWeeks?: number; 
      industry?: string;
    },
  ) {
    const selectedDays = body.selectedDays || ['Monday', 'Wednesday', 'Friday'];
    const durationWeeks = body.durationWeeks || 1;
    return this.contentService.generateContentPlan(
      body.businessId, 
      selectedDays, 
      durationWeeks, 
      body.industry
    );
  }

  /** DELETE /content/calendar/:id — delete a calendar row */
  @Delete('calendar/:id')
  async deleteCalendarEntry(@Param('id') id: string) {
    return this.contentService.deleteCalendarEntry(id);
  }

  /** POST /content/calendar/:id/regenerate — regenerate calendar post content with AI */
  @Post('calendar/:id/regenerate')
  async regenerateCalendarEntry(@Param('id') id: string) {
    return this.contentService.regenerateCalendarEntry(id);
  }

  /** POST /content/calendar — create a single calendar entry */
  @Post('calendar')
  async createEntry(@Body() body: any) {
    return this.contentService.createCalendarEntry(body);
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
