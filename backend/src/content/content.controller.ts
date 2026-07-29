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
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ContentService, CalendarFilterOptions } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ─── Monthly Content Strategy Endpoints ─────────────────────────────────────

  /** POST /content/strategy/generate — Generate monthly strategy using Business Context */
  @Post('strategy/generate')
  @HttpCode(HttpStatus.OK)
  async generateStrategy(@Body() body: { businessId: string }) {
    if (!body?.businessId) {
      throw new BadRequestException('businessId is required');
    }
    return this.contentService.generateMonthlyStrategy(body.businessId);
  }

  /** GET /content/strategy?businessId=xxx — Fetch active monthly strategy */
  @Get('strategy')
  async getStrategy(@Query('businessId') businessId: string) {
    if (!businessId) {
      throw new BadRequestException('businessId query parameter is required');
    }
    return this.contentService.getMonthlyStrategy(businessId);
  }

  // ─── Content Calendar Generation Endpoints ─────────────────────────────────

  /** POST /content/calendar/generate — Generate 30-day content calendar */
  @Post('calendar/generate')
  @HttpCode(HttpStatus.OK)
  async generateCalendar(
    @Body() body: { businessId: string; selectedDays?: string[]; durationWeeks?: number; industry?: string },
  ) {
    if (!body?.businessId) {
      throw new BadRequestException('businessId is required');
    }
    return this.contentService.generateMonthlyCalendar(body.businessId, {
      selectedDays: body.selectedDays,
      durationWeeks: body.durationWeeks,
      industry: body.industry,
    });
  }

  /** POST /content/generate-plan — Alias for backward compatibility */
  @Post('generate-plan')
  @HttpCode(HttpStatus.OK)
  async generatePlan(
    @Body() body: { businessId: string; selectedDays?: string[]; durationWeeks?: number; industry?: string },
  ) {
    if (!body?.businessId) {
      throw new BadRequestException('businessId is required');
    }
    return this.contentService.generateContentPlan(
      body.businessId,
      body.selectedDays,
      body.durationWeeks,
      body.industry,
    );
  }

  /** GET /content/calendar?businessId=xxx&page=1&limit=20... — Fetch calendar with pagination & filters */
  @Get('calendar')
  async getCalendar(
    @Query('businessId') businessId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
    @Query('platform') platform?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId query parameter is required');
    }

    const filters: CalendarFilterOptions = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      month,
      status,
      platform,
      category,
      search,
    };

    return this.contentService.getContentCalendar(businessId, filters);
  }

  /** GET /content/generated?businessId=xxx — Fetch all generated content assets */
  @Get('generated')
  async getGeneratedContent(@Query('businessId') businessId: string) {
    if (!businessId) {
      throw new BadRequestException('businessId query parameter is required');
    }
    return this.contentService.getGeneratedContent(businessId);
  }

  // ─── Post Operations & Approval Workflow ────────────────────────────────────

  /** PATCH /content/calendar/:id/approve & PATCH /content/:id/approve */
  @Patch('calendar/:id/approve')
  async approveCalendarPost(@Param('id') id: string, @Body() body?: { approvedBy?: string }) {
    return this.contentService.approvePost(id, body?.approvedBy);
  }

  @Patch(':id/approve')
  async approvePostShort(@Param('id') id: string, @Body() body?: { approvedBy?: string }) {
    return this.contentService.approvePost(id, body?.approvedBy);
  }

  @Post(':id/approve')
  async approvePostPost(@Param('id') id: string, @Body() body?: { approvedBy?: string }) {
    return this.contentService.approvePost(id, body?.approvedBy);
  }

  /** PATCH /content/calendar/:id/reject & PATCH /content/:id/reject */
  @Patch('calendar/:id/reject')
  async rejectCalendarPost(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.contentService.rejectPost(id, body?.reason);
  }

  @Patch(':id/reject')
  async rejectPostShort(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.contentService.rejectPost(id, body?.reason);
  }

  @Post(':id/reject')
  async rejectPostPost(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.contentService.rejectPost(id, body?.reason);
  }

  /** POST /content/bulk/approve & POST /content/calendar/bulk-approve */
  @Post('bulk/approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(@Body() body: { ids: string[]; approvedBy?: string }) {
    return this.contentService.bulkApprovePosts(body.ids, body.approvedBy);
  }

  @Post('calendar/bulk-approve')
  @HttpCode(HttpStatus.OK)
  async bulkApproveCalendar(@Body() body: { ids: string[]; approvedBy?: string }) {
    return this.contentService.bulkApprovePosts(body.ids, body.approvedBy);
  }

  /** POST /content/calendar/:id/duplicate & POST /content/:id/duplicate */
  @Post('calendar/:id/duplicate')
  async duplicateCalendarPost(@Param('id') id: string) {
    return this.contentService.duplicatePost(id);
  }

  @Post(':id/duplicate')
  async duplicatePostShort(@Param('id') id: string) {
    return this.contentService.duplicatePost(id);
  }

  /** PATCH /content/calendar/:id/reschedule & PATCH /content/:id/reschedule */
  @Patch('calendar/:id/reschedule')
  async rescheduleCalendarPost(@Param('id') id: string, @Body() body: { scheduledTime: string }) {
    if (!body?.scheduledTime) {
      throw new BadRequestException('scheduledTime is required');
    }
    return this.contentService.reschedulePost(id, body.scheduledTime);
  }

  @Patch(':id/reschedule')
  async reschedulePostShort(@Param('id') id: string, @Body() body: { scheduledTime: string }) {
    if (!body?.scheduledTime) {
      throw new BadRequestException('scheduledTime is required');
    }
    return this.contentService.reschedulePost(id, body.scheduledTime);
  }

  /** POST /content/calendar/:id/regenerate & POST /content/:id/regenerate */
  @Post('calendar/:id/regenerate')
  async regenerateCalendarEntry(@Param('id') id: string) {
    return this.contentService.regenerateSinglePost(id);
  }

  @Post(':id/regenerate')
  async regeneratePostShort(@Param('id') id: string) {
    return this.contentService.regenerateSinglePost(id);
  }

  /** DELETE /content/calendar/:id & DELETE /content/:id */
  @Delete('calendar/:id')
  async deleteCalendarEntry(@Param('id') id: string) {
    return this.contentService.deletePost(id);
  }

  @Delete(':id')
  async deletePostShort(@Param('id') id: string) {
    return this.contentService.deletePost(id);
  }

  /** PATCH /content/calendar/:id & PATCH /content/:id — Edit post details */
  @Patch('calendar/:id')
  async updateCalendarEntry(@Param('id') id: string, @Body() body: any) {
    return this.contentService.editPost(id, body);
  }

  @Patch(':id')
  async updatePostShort(@Param('id') id: string, @Body() body: any) {
    return this.contentService.editPost(id, body);
  }

  @Patch('calendar/:id/publish')
  async markPublished(@Param('id') id: string) {
    return this.contentService.markPublished(id);
  }

  /** POST /content/calendar — Create manual post entry */
  @Post('calendar')
  async createEntry(@Body() body: any) {
    return this.contentService.createCalendarEntry(body);
  }

  // ─── Deferred Endpoints (Return HTTP 501) ───────────────────────────────────

  /** POST /content/regenerate-week — Deferred */
  @Post('regenerate-week')
  async regenerateWeek(@Body() body: { businessId: string; weekNumber: number }) {
    return this.contentService.regenerateWeek(body.businessId, body.weekNumber);
  }

  /** POST /content/regenerate-month — Deferred */
  @Post('regenerate-month')
  async regenerateMonth(@Body() body: { businessId: string }) {
    return this.contentService.regenerateMonth(body.businessId);
  }
}
