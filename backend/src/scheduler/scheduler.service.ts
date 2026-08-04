import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FirebaseService } from '../firebase/firebase.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { calculateNext10AMSlot } from '../utils/timezone-scheduler';
import { publishOrganicSimultaneously } from '../lib/meta/organic-publisher';
import { generateScheduleSlots, calculateNext10AM, ScheduleRule, isValidScheduleRule } from '../lib/scheduler/time-engine';
import { PublishLogEntry } from '../firebase/firestore.schema';

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
    imageOverlayText?: string;
    profileBio?: string;
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
      imageOverlayText: data.imageOverlayText || '',
      profileBio: data.profileBio || '',
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

  /**
   * Publishes a single scheduled post by document ID (invoked by Cloud Tasks HTTP webhook).
   */
  async publishSinglePost(postId: string) {
    this.logger.log(`[SchedulerService] Publishing single post ${postId} via Cloud Task webhook execution`);

    const post = (await this.firebase.getScheduledPostById(postId)) || (await this.firebase.socialPostsDao?.findById(postId));
    if (!post) {
      throw new NotFoundException(`Scheduled post ${postId} not found`);
    }

    // Mark as PUBLISHING
    await this.firebase.updateScheduledPost(postId, { status: 'PUBLISHING' });

    let publishResult: any = null;
    try {
      publishResult = await this.publishToMeta(post);
    } catch (metaErr: any) {
      this.logger.warn(`Meta API publish failed for post ${postId}: ${metaErr.message}`);
      publishResult = { success: false, error: metaErr.message };
    }

    // Mark as PUBLISHED or FAILED based on publishResult
    const isSuccess = publishResult?.success !== false;
    const finalStatus = isSuccess ? 'PUBLISHED' : 'FAILED';

    const updatedPost = await this.firebase.updateScheduledPost(postId, {
      status: finalStatus,
      publishedAt: isSuccess ? new Date() : null,
      publishResult,
    });

    if (post.calendarEntryId && isSuccess) {
      try {
        await this.firebase.updateContentCalendarEntry(post.calendarEntryId, {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        });
      } catch { /* ignore */ }
    }

    return {
      success: isSuccess,
      postId,
      status: finalStatus,
      post: updatedPost,
      publishResult,
    };
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

        const publishSucceeded = publishResult?.success !== false;
        const finalStatus = publishSucceeded ? 'PUBLISHED' : 'FAILED';

        // Only mark a post as published when Meta confirmed the requested publish.
        await this.firebase.updateScheduledPost(post.id, {
          status: finalStatus,
          ...(publishSucceeded ? { publishedAt: new Date() } : {}),
          publishResult,
        });

        // Also update linked calendar entry if exists
        if (post.calendarEntryId && publishSucceeded) {
          try {
            await this.firebase.updateContentCalendarEntry(post.calendarEntryId, {
              status: 'PUBLISHED',
              publishedAt: new Date(),
            });
          } catch { /* calendar entry may not exist */ }
        }

        if (publishSucceeded) {
          processed.push(post.id);
          this.logger.log(`Published post ${post.id} on ${post.platform}`);
        } else {
          failed.push(post.id);
          this.logger.warn(`Post ${post.id} was not published on ${post.platform}`);
        }
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
    const targetWorkspaceId = post.workspaceId || post.businessId;
    const workspace = (await this.firebase.workspacesDao?.findById(targetWorkspaceId)) || (await this.firebase.getBusinessById(targetWorkspaceId));
    const ownerId = workspace?.ownerId || (workspace as any)?.memberIds?.[0];
    const userDoc = ownerId && this.firebase.usersDao ? await this.firebase.usersDao.findById(ownerId) : null;

    const accessToken = workspace?.metaAccessToken || userDoc?.metaAccessToken;

    if (!accessToken && !this.integrations.isMock) {
      return { success: false, error: 'Meta not connected' };
    }

    const fullCaption = post.hashtags?.length
      ? `${post.caption}\n\n${post.hashtags.join(' ')}`
      : post.caption;

    const platform = (post.platform || 'instagram').toLowerCase();

    const publishFacebook = async () => {
      try {
        const result = await this.integrations.publishPagePost(targetWorkspaceId, fullCaption, post.imageUrl || null);
        if (result.success === false) {
          this.logger.error(`Facebook publish returned failure: ${result.error || 'unknown Meta Page error'}`);
        }
        return { success: true, platform: 'Facebook', ...result };
      } catch (err: any) {
        this.logger.error(`Facebook publish failed: ${err.message}`);
        return { success: false, platform: 'Facebook', error: err.message };
      }
    };

    const publishInstagram = async () => {
      try {
        const result = await this.integrations.publishInstagramPost(targetWorkspaceId, fullCaption, post.imageUrl || null);
        if (result.success === false) {
          this.logger.error(`Instagram publish returned failure: ${result.error || 'unknown Meta Instagram error'}`);
        }
        return { success: true, platform: 'Instagram', ...result };
      } catch (err: any) {
        this.logger.error(`Instagram publish failed: ${err.message}`);
        return { success: false, platform: 'Instagram', error: err.message };
      }
    };

    if (platform === 'both') {
      const [facebook, instagram] = await Promise.all([publishFacebook(), publishInstagram()]);
      return { success: facebook.success && instagram.success, platform: 'both', facebook, instagram };
    }

    if (platform === 'facebook') return publishFacebook();
    if (platform === 'instagram') return publishInstagram();

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

  /**
   * Schedules an organic post to target exactly 10:00 AM in the user's local timezone.
   */
  async scheduleOrganicPost(data: {
    businessId: string;
    caption: string;
    imageUrl?: string;
    headline?: string;
    hashtags?: string[];
    timezone?: string;
    platforms?: string; // 'both' | 'facebook' | 'instagram'
  }) {
    const slotResult = calculateNext10AMSlot(data.timezone);
    const scheduledTime = slotResult.targetDate;

    const post = await this.firebase.createScheduledPost({
      businessId: data.businessId,
      caption: data.caption,
      headline: data.headline || '',
      hashtags: data.hashtags || [],
      imageUrl: data.imageUrl || null,
      platform: data.platforms || 'both',
      scheduledTime,
      postType: 'Organic 10AM Post',
      status: 'SCHEDULED',
      publishResult: null,
      timezone: data.timezone || 'local',
    } as any);

    this.logger.log(`Organic post scheduled for 10:00 AM slot: ${post.id} at ${slotResult.formattedLocal} (${slotResult.isoString})`);

    return {
      success: true,
      post,
      scheduledTime: slotResult.targetDate.toISOString(),
      scheduledSlot: slotResult,
    };
  }

  /**
   * Schedules a batch of organic posts at computed 10:00 AM slots using a schedule rule.
   * Creates multiple Firestore documents — one for each time slot.
   */
  async scheduleOrganicBatch(data: {
    businessId: string;
    caption: string;
    imageUrl?: string;
    headline?: string;
    hashtags?: string[];
    timezone?: string;
    platforms?: string; // 'both' | 'facebook' | 'instagram'
    scheduleRule?: string;
    count?: number;
  }) {
    const rule: ScheduleRule = isValidScheduleRule(data.scheduleRule || '') 
      ? (data.scheduleRule as ScheduleRule) 
      : 'daily_10am';
    const tz = data.timezone || 'UTC';
    const count = Math.min(data.count || 10, 30); // Cap at 30 slots

    const batchResult = generateScheduleSlots(rule, tz, count);
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const posts: any[] = [];

    for (const slot of batchResult.slots) {
      const post = await this.firebase.createScheduledPost({
        businessId: data.businessId,
        caption: data.caption,
        headline: data.headline || '',
        hashtags: data.hashtags || [],
        imageUrl: data.imageUrl || null,
        platform: data.platforms || 'both',
        scheduledTime: slot.targetDate,
        postType: 'Organic 10AM Post',
        status: 'SCHEDULED',
        publishResult: null,
        publishLogs: [{
          timestamp: new Date().toISOString(),
          action: 'BATCH_SCHEDULED',
          details: `Slot ${slot.slotIndex + 1}/${count} via rule '${rule}' for ${slot.formattedLocal}`,
        }],
        timezone: tz,
        scheduleRule: rule,
        batchId,
      } as any);

      posts.push(post);
      this.logger.log(`[OrganicBatch] Post ${post.id} scheduled for slot ${slot.slotIndex + 1}: ${slot.formattedLocal}`);
    }

    return {
      success: true,
      batchId,
      rule,
      timezone: tz,
      count: posts.length,
      posts,
      slots: batchResult.slots.map((s) => ({
        index: s.slotIndex,
        scheduledTime: s.isoString,
        formattedLocal: s.formattedLocal,
        timestampMs: s.timestampMs,
      })),
    };
  }

  /**
   * Worker handler executed at 10:00 AM: fetches post payload and calls Facebook & Instagram simultaneous endpoints using Promise.all().
   * Enhanced with detailed publish logs for audit trail.
   */
  async executeOrganicPublishWorker(postId: string) {
    this.logger.log(`[Organic Publish Worker] Executing 10:00 AM worker task for post: ${postId}`);
    const publishLogs: PublishLogEntry[] = [];

    publishLogs.push({
      timestamp: new Date().toISOString(),
      action: 'PUBLISH_START',
      platform: 'both',
      details: `Worker initiated for post ${postId}`,
    });

    const post = (await this.firebase.getScheduledPostById(postId)) || (await this.firebase.socialPostsDao?.findById(postId));
    if (!post) {
      throw new NotFoundException(`Organic post document ${postId} not found`);
    }

    // Mark status as PUBLISHING
    await this.firebase.updateScheduledPost(postId, {
      status: 'PUBLISHING',
      publishLogs: [...(post.publishLogs || []), ...publishLogs],
    });

    const targetWorkspaceId = post.workspaceId || post.businessId;
    const workspace = (await this.firebase.workspacesDao?.findById(targetWorkspaceId)) || (await this.firebase.getBusinessById(targetWorkspaceId));
    const ownerId = workspace?.ownerId || (workspace as any)?.memberIds?.[0];
    const userDoc = ownerId && this.firebase.usersDao ? await this.firebase.usersDao.findById(ownerId) : null;

    const pageId = workspace?.metaPageId || workspace?.selectedPageId;
    const pageAccessToken = workspace?.metaAccessToken || userDoc?.metaAccessToken;
    const instagramAccountId = workspace?.metaIgBusinessAccountId || workspace?.selectedInstagramAccountId || userDoc?.metaIgBusinessAccountId;

    const fullCaption = post.hashtags?.length
      ? `${post.caption}\n\n${post.hashtags.join(' ')}`
      : post.caption;

    const isMock = this.integrations.isMock || !pageAccessToken || pageAccessToken.startsWith('mock_');

    publishLogs.push({
      timestamp: new Date().toISOString(),
      action: 'API_CALL_START',
      platform: 'both',
      details: `Calling Meta Graph API (mock=${isMock}, pageId=${pageId || 'none'}, igId=${instagramAccountId || 'none'})`,
    });

    // Call Facebook and Instagram endpoints simultaneously using Promise.all() via publishOrganicSimultaneously
    const publishResult = await publishOrganicSimultaneously({
      pageId: pageId || 'mock_page_id',
      pageAccessToken,
      instagramAccountId: instagramAccountId || 'mock_ig_id',
      imageUrl: post.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      caption: fullCaption,
      isMock,
    });

    // Log per-platform results
    if (publishResult.facebook) {
      publishLogs.push({
        timestamp: new Date().toISOString(),
        action: publishResult.facebook.success ? 'FB_SUCCESS' : 'FB_FAILED',
        platform: 'facebook',
        postId: publishResult.facebook.postId || null,
        error: publishResult.facebook.error || null,
        details: `Facebook photo publish ${publishResult.facebook.success ? 'succeeded' : 'failed'}`,
      });
    }

    if (publishResult.instagram) {
      publishLogs.push({
        timestamp: new Date().toISOString(),
        action: publishResult.instagram.success ? 'IG_SUCCESS' : 'IG_FAILED',
        platform: 'instagram',
        postId: publishResult.instagram.postId || null,
        error: publishResult.instagram.error || null,
        details: `Instagram publish ${publishResult.instagram.success ? 'succeeded' : 'failed'}${publishResult.instagram.containerId ? ` (container: ${publishResult.instagram.containerId})` : ''}`,
      });
    }

    const isFbSuccess = !publishResult.facebook || publishResult.facebook.success;
    const isIgSuccess = !publishResult.instagram || publishResult.instagram.success;
    const isOverallSuccess = isFbSuccess && isIgSuccess;

    const finalStatus = isOverallSuccess ? 'PUBLISHED' : 'FAILED';

    publishLogs.push({
      timestamp: new Date().toISOString(),
      action: isOverallSuccess ? 'PUBLISH_COMPLETE' : 'PUBLISH_FAILED',
      platform: 'both',
      details: `Final status: ${finalStatus}`,
    });

    const allLogs = [...(post.publishLogs || []), ...publishLogs];

    const updatedPost = await this.firebase.updateScheduledPost(postId, {
      status: finalStatus,
      publishedAt: isOverallSuccess ? new Date() : null,
      publishResult,
      publishLogs: allLogs,
    });

    this.logger.log(`[Organic Publish Worker] Completed post ${postId} with status: ${finalStatus}`);

    return {
      success: isOverallSuccess,
      postId,
      status: finalStatus,
      publishResult,
      publishLogs: allLogs,
      post: updatedPost,
    };
  }

  /**
   * Returns all scheduled posts for a business organized by date for the calendar dashboard.
   */
  async getCalendarView(businessId: string) {
    const posts = await this.firebase.getScheduledPostsByBusinessId(businessId);

    // Group posts by date (YYYY-MM-DD)
    const byDate: Record<string, any[]> = {};
    for (const post of posts) {
      const scheduledTime = post.scheduledTime instanceof Date
        ? post.scheduledTime
        : new Date(post.scheduledTime?._seconds ? post.scheduledTime._seconds * 1000 : post.scheduledTime);

      const dateKey = scheduledTime.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push({
        ...post,
        scheduledTimeISO: scheduledTime.toISOString(),
        dateKey,
      });
    }

    // Sort dates
    const sortedDates = Object.keys(byDate).sort();
    const calendar = sortedDates.map((date) => ({
      date,
      posts: byDate[date],
      count: byDate[date].length,
      statuses: [...new Set(byDate[date].map((p: any) => p.status))],
    }));

    return {
      businessId,
      totalPosts: posts.length,
      totalDays: calendar.length,
      calendar,
    };
  }
}
