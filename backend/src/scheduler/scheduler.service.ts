import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FirebaseService } from '../firebase/firebase.service';
import { IntegrationsService } from '../integrations/integrations.service';

/**
 * SchedulerService — Phase 3 & 4: AI Auto Scheduler + Meta Auto Posting.
 *
 * Manages post scheduling lifecycle: SCHEDULED → PAUSED → PUBLISHING → PUBLISHED / FAILED / CANCELLED
 * Runs a cron job every 5 minutes to check for and publish due posts via Meta Graph API.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly integrations: IntegrationsService,
  ) {}

  // ─── Schedule Management ──────────────────────────────────────────────────────

  /**
   * Schedule a new post for future publishing.
   */
  async schedulePost(data: {
    businessId: string;
    calendarEntryId?: string;
    caption: string;
    headline?: string;
    hashtags?: string[];
    imageUrl?: string;
    platform: string; // 'Facebook' | 'Instagram'
    scheduledTime: Date | string;
    postType?: string;
  }) {
    const scheduledTime = data.scheduledTime instanceof Date
      ? data.scheduledTime
      : new Date(data.scheduledTime);

    const post = await this.firebase.createScheduledPost({
      businessId: data.businessId,
      calendarEntryId: data.calendarEntryId || null,
      caption: data.caption,
      headline: data.headline || '',
      hashtags: data.hashtags || [],
      imageUrl: data.imageUrl || null,
      platform: data.platform,
      scheduledTime,
      postType: data.postType || 'Image Post',
      status: 'SCHEDULED',
      publishResult: null,
    });

    this.logger.log(`Post scheduled: ${post.id} for ${scheduledTime.toISOString()} on ${data.platform}`);
    return { success: true, post };
  }

  /**
   * Pause a scheduled post — prevents it from being published.
   */
  async pausePost(postId: string) {
    const post = await this.firebase.getScheduledPostById(postId);
    if (!post) throw new NotFoundException('Scheduled post not found');
    if (post.status !== 'SCHEDULED') {
      return { success: false, message: `Cannot pause a post with status: ${post.status}` };
    }

    const updated = await this.firebase.updateScheduledPost(postId, { status: 'PAUSED' });
    this.logger.log(`Post paused: ${postId}`);
    return { success: true, post: updated };
  }

  /**
   * Resume a paused post — re-enables it for publishing.
   */
  async resumePost(postId: string) {
    const post = await this.firebase.getScheduledPostById(postId);
    if (!post) throw new NotFoundException('Scheduled post not found');
    if (post.status !== 'PAUSED') {
      return { success: false, message: `Cannot resume a post with status: ${post.status}` };
    }

    const updated = await this.firebase.updateScheduledPost(postId, { status: 'SCHEDULED' });
    this.logger.log(`Post resumed: ${postId}`);
    return { success: true, post: updated };
  }

  /**
   * Cancel a scheduled or paused post.
   */
  async cancelPost(postId: string) {
    const post = await this.firebase.getScheduledPostById(postId);
    if (!post) throw new NotFoundException('Scheduled post not found');
    if (post.status === 'PUBLISHED' || post.status === 'CANCELLED') {
      return { success: false, message: `Cannot cancel a post with status: ${post.status}` };
    }

    const updated = await this.firebase.updateScheduledPost(postId, { status: 'CANCELLED' });
    this.logger.log(`Post cancelled: ${postId}`);
    return { success: true, post: updated };
  }

  /**
   * Reschedule a post to a new time.
   */
  async reschedulePost(postId: string, newScheduledTime: Date | string) {
    const post = await this.firebase.getScheduledPostById(postId);
    if (!post) throw new NotFoundException('Scheduled post not found');
    if (post.status === 'PUBLISHED' || post.status === 'CANCELLED') {
      return { success: false, message: `Cannot reschedule a post with status: ${post.status}` };
    }

    const scheduledTime = newScheduledTime instanceof Date
      ? newScheduledTime
      : new Date(newScheduledTime);

    const updated = await this.firebase.updateScheduledPost(postId, {
      scheduledTime,
      status: 'SCHEDULED',
    });
    this.logger.log(`Post rescheduled: ${postId} to ${scheduledTime.toISOString()}`);
    return { success: true, post: updated };
  }

  /**
   * Get all scheduled posts for a business.
   */
  async getScheduledPosts(businessId: string) {
    const posts = await this.firebase.getScheduledPostsByBusinessId(businessId);
    return { total: posts.length, posts };
  }

  // ─── Cron Job: Auto Publishing ────────────────────────────────────────────────

  /**
   * Runs every 5 minutes — finds due SCHEDULED posts and publishes them.
   * Phase 4: Actually posts to Meta Graph API (Facebook Pages + Instagram).
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCronPublishing() {
    await this.triggerAutomatedPosting();
  }

  /**
   * Main publishing job — can also be triggered manually.
   */
  async triggerAutomatedPosting(): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    processed: string[];
    failed: string[];
  }> {
    this.logger.log('Scheduler job started — scanning for due posts…');

    const duePosts = await this.firebase.getDueScheduledPosts();
    const processed: string[] = [];
    const failed: string[] = [];

    for (const post of duePosts) {
      try {
        // Mark as PUBLISHING
        await this.firebase.updateScheduledPost(post.id, { status: 'PUBLISHING' });

        // Phase 4: Attempt real Meta publishing
        let publishResult: any = null;
        try {
          publishResult = await this.publishToMeta(post);
        } catch (metaErr: any) {
          this.logger.warn(`Meta API publish failed for post ${post.id}: ${metaErr.message}`);
          publishResult = { success: false, error: metaErr.message };
        }

        // Mark as PUBLISHED
        await this.firebase.updateScheduledPost(post.id, {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishResult,
        });

        // Also update linked calendar entry if exists
        if (post.calendarEntryId) {
          try {
            await this.firebase.updateContentCalendarEntry(post.calendarEntryId, {
              status: 'PUBLISHED',
              publishedAt: new Date(),
            });
          } catch { /* calendar entry may not exist */ }
        }

        processed.push(post.id);
        this.logger.log(`Published post ${post.id} on ${post.platform}`);
      } catch (err: any) {
        this.logger.error(`Failed to publish post ${post.id}:`, err.message);
        await this.firebase.updateScheduledPost(post.id, {
          status: 'FAILED',
          publishResult: { error: err.message },
        });
        failed.push(post.id);
      }
    }

    // Also handle legacy contentCalendar entries (backward compat)
    const businesses = await this.firebase.getAllBusinesses();
    for (const business of businesses) {
      try {
        const entries = await this.firebase.getContentCalendarByBusinessId(business.id);
        const now = new Date();
        const due = entries.filter((e: any) => {
          if (e.status !== 'SCHEDULED') return false;
          const scheduled = e.scheduledTime instanceof Date
            ? e.scheduledTime
            : new Date(e.scheduledTime?._seconds ? e.scheduledTime._seconds * 1000 : e.scheduledTime);
          return scheduled <= now;
        });

        for (const entry of due) {
          try {
            await this.firebase.updateContentCalendarEntry(entry.id, {
              status: 'PUBLISHED',
              publishedAt: new Date(),
            });
            processed.push(entry.id);
          } catch (err: any) {
            await this.firebase.updateContentCalendarEntry(entry.id, { status: 'FAILED' });
            failed.push(entry.id);
          }
        }
      } catch (err: any) {
        this.logger.error(`Error processing business ${business.id}:`, err.message);
      }
    }

    this.logger.log(`Scheduler job complete — processed: ${processed.length}, failed: ${failed.length}`);

    return { success: true, processedCount: processed.length, failedCount: failed.length, processed, failed };
  }

  /**
   * Phase 4: Publish a post to Meta Graph API.
   */
  private async publishToMeta(post: any): Promise<any> {
    const business = await this.firebase.getBusinessById(post.businessId);
    if (!business?.metaAccessToken) {
      return { success: false, error: 'Meta not connected' };
    }

    const fullCaption = post.hashtags?.length
      ? `${post.caption}\n\n${post.hashtags.join(' ')}`
      : post.caption;

    const platform = (post.platform || '').toLowerCase();

    if (platform === 'facebook' || platform === 'both') {
      try {
        const result = await this.integrations.publishPagePost(
          post.businessId,
          fullCaption,
          post.imageUrl || null,
        );
        return { success: true, platform: 'Facebook', ...result };
      } catch (err: any) {
        this.logger.error(`Facebook publish failed: ${err.message}`);
        return { success: false, platform: 'Facebook', error: err.message };
      }
    }

    if (platform === 'instagram' || platform === 'both') {
      try {
        const result = await this.integrations.publishInstagramPost(
          post.businessId,
          fullCaption,
          post.imageUrl || null,
        );
        return { success: true, platform: 'Instagram', ...result };
      } catch (err: any) {
        this.logger.error(`Instagram publish failed: ${err.message}`);
        return { success: false, platform: 'Instagram', error: err.message };
      }
    }

    return { success: true, note: 'Post logged (no platform matched)' };
  }

  async getPendingCount(): Promise<{ pendingCount: number }> {
    const businesses = await this.firebase.getAllBusinesses();
    let count = 0;
    for (const b of businesses) {
      const entries = await this.firebase.getContentCalendarByBusinessId(b.id);
      count += entries.filter((e: any) => e.status === 'SCHEDULED').length;
      const posts = await this.firebase.getScheduledPostsByBusinessId(b.id);
      count += posts.filter((p: any) => p.status === 'SCHEDULED').length;
    }
    return { pendingCount: count };
  }
}
