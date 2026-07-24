import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  /** POST /scheduler/trigger — manually trigger the content posting job */
  @Post('trigger')
  async triggerScheduler() {
    return this.schedulerService.triggerAutomatedPosting();
  }

  /** GET /scheduler/pending — count of SCHEDULED items waiting */
  @Get('pending')
  async getPending() {
    return this.schedulerService.getPendingCount();
  }

  /** POST /scheduler/schedule — schedule a new post */
  @Post('schedule')
  async schedulePost(@Body() body: {
    businessId: string;
    calendarEntryId?: string;
    caption: string;
    headline?: string;
    hashtags?: string[];
    imageUrl?: string;
    platform: string;
    scheduledTime: string;
    postType?: string;
  }) {
    return this.schedulerService.schedulePost(body);
  }

  /** GET /scheduler/posts?businessId=xxx — list all scheduled posts */
  @Get('posts')
  async getScheduledPosts(@Query('businessId') businessId: string) {
    return this.schedulerService.getScheduledPosts(businessId);
  }

  /** PATCH /scheduler/:id/pause — pause a scheduled post */
  @Patch(':id/pause')
  async pausePost(@Param('id') id: string) {
    return this.schedulerService.pausePost(id);
  }

  /** PATCH /scheduler/:id/resume — resume a paused post */
  @Patch(':id/resume')
  async resumePost(@Param('id') id: string) {
    return this.schedulerService.resumePost(id);
  }

  /** PATCH /scheduler/:id/cancel — cancel a post */
  @Patch(':id/cancel')
  async cancelPost(@Param('id') id: string) {
    return this.schedulerService.cancelPost(id);
  }

  /** PATCH /scheduler/:id/reschedule — reschedule a post */
  @Patch(':id/reschedule')
  async reschedulePost(
    @Param('id') id: string,
    @Body() body: { scheduledTime: string },
  ) {
    return this.schedulerService.reschedulePost(id, body.scheduledTime);
  }
}
