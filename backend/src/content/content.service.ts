import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  NotImplementedException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { AiService } from '../ai/ai.service';
import { BusinessIntelligenceService } from '../business/business-intelligence.service';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service';

export interface ContentStrategyData {
  monthlyMarketingStrategy: string;
  monthlyCampaignFocus: string;
  recommendedPostingFrequency: string;
  recommendedPlatforms: string[];
  weeklyThemes: { weekNumber: number; theme: string; objective: string }[];
}

export interface CalendarFilterOptions {
  page?: number;
  limit?: number;
  month?: string;
  status?: string;
  platform?: string;
  category?: string;
  search?: string;
}

/**
 * ContentService — Handles Content Strategy, Calendar Generation, and Content Operations.
 *
 * All business context is sourced from BusinessIntelligenceService.getBusinessContext(businessId).
 * All AI calls flow through PromptBuilderService → AiService → OpenRouter.
 */
import { GraphicGeneratorService } from './graphic-generator.service';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly aiService: AiService,
    private readonly businessIntelligence: BusinessIntelligenceService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly graphicGenerator: GraphicGeneratorService,
  ) {}

  /**
   * Generates a 1080x1080 pixel branded social graphic customized to the business vibe,
   * overlays business name & offer text, uploads PNG buffer to Firebase Storage,
   * and returns the public download URL.
   */
  async generateBrandedGraphic(
    businessId: string,
    offerTextOverride?: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }

    // 1. Fetch business workspace and profile parameters from Firestore
    const workspace = (await this.firebase.workspacesDao?.findById(businessId)) || (await this.firebase.getBusinessById(businessId));
    if (!workspace) {
      throw new NotFoundException(`Workspace for business ${businessId} not found in Firestore`);
    }

    const profile = await this.firebase.getBusinessProfile(businessId);

    const businessName = workspace.name || profile?.businessName || 'Our Business';
    const vibe = workspace.vibe || profile?.brandTone || profile?.brandVoice || 'Professional & Trustworthy';
    const niche = workspace.niche || profile?.businessCategory || profile?.industry || 'Exclusive Promotion';
    const offerText = offerTextOverride || workspace.currentOffer || profile?.currentOffer || profile?.businessUSP || 'SPECIAL 30% OFF PROMOTION!';

    this.logger.log(`Generating 1080x1080 graphic for ${businessName} | Vibe: ${vibe} | Offer: "${offerText.substring(0, 40)}..."`);

    // 2. Generate 1080x1080 PNG Buffer via GraphicGeneratorService (@napi-rs/canvas)
    const pngBuffer = await this.graphicGenerator.generateBrandedGraphicBuffer({
      businessName,
      offerText,
      vibe,
      niche,
    });

    // 3. Upload PNG Buffer to Firebase Storage
    const timestamp = Date.now();
    const destinationPath = `graphics/${businessId}/${timestamp}_branded_graphic.png`;

    const uploadResult = await this.firebase.uploadFileBuffer(pngBuffer, destinationPath, 'image/png');

    return {
      success: true,
      publicUrl: uploadResult.publicUrl,
      storagePath: uploadResult.storagePath,
      businessId,
      businessName,
      vibe,
      niche,
      offerText,
      dimensions: '1080x1080',
    };
  }

  /**
   * Generates Instagram-ready content (caption + 15 hashtags) by pulling
   * business context (niche, vibe, currentOffer) directly from Firestore.
   */
  async generateInstagramPost(
    businessId: string,
    topic?: string,
    offerOverride?: string,
  ) {
    if (!businessId) {
      throw new BadRequestException('businessId is required');
    }

    // 1. Fetch business workspace and profile from Firestore
    const workspace = (await this.firebase.workspacesDao?.findById(businessId)) || (await this.firebase.getBusinessById(businessId));
    if (!workspace) {
      throw new NotFoundException(`Workspace for business ${businessId} not found in Firestore`);
    }

    const profile = await this.firebase.getBusinessProfile(businessId);

    const businessContext = {
      businessName: workspace.name || profile?.businessName || 'Our Business',
      niche: workspace.niche || profile?.businessCategory || profile?.industry || 'General Business',
      vibe: workspace.vibe || profile?.brandTone || profile?.brandVoice || 'Professional & Engaging',
      currentOffer: offerOverride || workspace.currentOffer || profile?.currentOffer || profile?.businessUSP || 'Special Promotional Offer',
      targetAudience: profile?.targetAudience || 'General Audience',
      location: profile?.location || 'Nationwide',
    };

    this.logger.log(`Generating Instagram post with Firestore context for business ${businessId} (Niche: ${businessContext.niche}, Vibe: ${businessContext.vibe})`);

    // 2. Call Gemini AI generator with 15-second timeout and strict JSON schema
    const result = await this.aiService.generateInstagramContent(businessContext, {
      topic,
      offer: offerOverride,
    });

    // 2b. Generate AI creative image via OpenRouter
    const imagePrompt = `High quality social media ad creative for ${businessContext.businessName} in ${businessContext.niche} industry. ${topic ? `Topic: ${topic}.` : ''} Vibe: ${businessContext.vibe}`;
    const imageResult = await this.aiService.generateImage(imagePrompt);

    // 3. Save post draft to Firestore social_posts collection using SocialPostsDao
    let savedPost: any = null;
    if (this.firebase.socialPostsDao) {
      try {
        savedPost = await this.firebase.socialPostsDao.create({
          workspaceId: businessId,
          authorId: (workspace as any).ownerId || 'system',
          caption: `${result.caption}\n\n${result.hashtags.join(' ')}`,
          imageUrl: imageResult.imageUrl,
          scheduleTime: new Date(Date.now() + 24 * 3600 * 1000),
          status: 'DRAFT',
        });
      } catch (e: any) {
        this.logger.warn(`Could not save post draft to social_posts: ${e.message}`);
      }
    }

    return {
      caption: result.caption,
      hashtags: result.hashtags,
      imageUrl: imageResult.imageUrl,
      imageModel: imageResult.model,
      businessId,
      workspaceName: businessContext.businessName,
      niche: businessContext.niche,
      vibe: businessContext.vibe,
      postId: savedPost?.id || null,
    };
  }

  // ─── Validation Helpers ───────────────────────────────────────────────────

  /**
   * Validates that the business workspace exists, business context is available,
   * and the Business Blueprint is approved.
   */
  async validateBusinessAndBlueprint(businessId: string) {
    if (!businessId) {
      throw new BadRequestException('Business ID is required');
    }

    const business = await this.firebase.getBusinessById(businessId);
    if (!business) {
      throw new NotFoundException(`Business workspace ${businessId} not found`);
    }

    const context = await this.businessIntelligence.getBusinessContext(businessId);
    if (!context) {
      throw new NotFoundException(`Business context for ${businessId} not found`);
    }

    if (!context.blueprintApproved) {
      throw new BadRequestException(
        'Business Blueprint must be approved before generating content strategy or content calendar',
      );
    }

    return { business, context };
  }

  /**
   * Enforces valid status transitions for content calendar posts.
   */
  private validateStatusTransition(currentStatus: string, targetStatus: string) {
    const validTransitions: Record<string, string[]> = {
      PENDING: ['SCHEDULED', 'DRAFT', 'PENDING'],
      DRAFT: ['APPROVED', 'REJECTED', 'DRAFT'],
      REJECTED: ['DRAFT', 'APPROVED', 'REJECTED'],
      APPROVED: ['SCHEDULED', 'DRAFT', 'REJECTED', 'APPROVED'],
      SCHEDULED: ['PUBLISHED', 'FAILED', 'APPROVED', 'DRAFT', 'SCHEDULED'],
      PUBLISHED: ['PUBLISHED'],
      FAILED: ['DRAFT', 'SCHEDULED', 'FAILED'],
    };

    const allowed = validTransitions[currentStatus?.toUpperCase()] || [];
    if (!allowed.includes(targetStatus.toUpperCase())) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'`,
      );
    }
  }

  // ─── Step 1: Monthly Content Strategy ─────────────────────────────────────

  /**
   * Generates a structured 30-day Monthly Content Strategy using the approved Business Context.
   */
  async generateMonthlyStrategy(businessId: string): Promise<any> {
    this.logger.log(`Generating Monthly Content Strategy for business: ${businessId}`);
    await this.validateBusinessAndBlueprint(businessId);

    const prompts = await this.promptBuilder.buildMonthlyStrategyPrompt(businessId);

    let strategyData: ContentStrategyData | null = null;
    try {
      const response = await this.aiService.generateStructuredJson<ContentStrategyData>(
        prompts.systemPrompt,
        prompts.userPrompt,
        { temperature: 0.7, maxTokens: 2048 },
        'ContentService.generateMonthlyStrategy',
      );
      strategyData = response.data;
    } catch (err: any) {
      this.logger.warn(`AI strategy generation error: ${err.message}`);
    }

    // Fallback if AI call failed
    if (!strategyData || !strategyData.weeklyThemes?.length) {
      const context = await this.businessIntelligence.getBusinessContext(businessId);
      strategyData = {
        monthlyMarketingStrategy: `Drive brand authority and acquisition for ${context.businessName} across digital channels.`,
        monthlyCampaignFocus: `${context.businessCategory || 'Product'} Launch & Brand Positioning`,
        recommendedPostingFrequency: '5 posts per week (20 posts per month)',
        recommendedPlatforms: ['Instagram', 'Facebook', 'LinkedIn'],
        weeklyThemes: [
          { weekNumber: 1, theme: 'Brand Foundations & Value Prop', objective: 'Educate audience on core offering & USP' },
          { weekNumber: 2, theme: 'Customer Pain Points & Solutions', objective: 'Highlight key customer problems and how we solve them' },
          { weekNumber: 3, theme: 'Social Proof & Community', objective: 'Build trust with testimonials, reviews, and behind-the-scenes' },
          { weekNumber: 4, theme: 'Conversion & Promotional Offers', objective: 'Drive lead generation and direct sales with strong CTAs' },
        ],
      };
    }

    const savedStrategy = await this.firebase.upsertContentStrategy(businessId, strategyData);
    this.logger.log(`Monthly Content Strategy saved (${savedStrategy.version}) for business: ${businessId}`);
    return savedStrategy;
  }

  /**
   * Fetches the current active Monthly Content Strategy for a business.
   */
  async getMonthlyStrategy(businessId: string) {
    if (!businessId) throw new BadRequestException('Business ID is required');
    const strategy = await this.firebase.getContentStrategyByBusinessId(businessId);
    if (!strategy) {
      throw new NotFoundException(`No monthly strategy found for business ${businessId}`);
    }
    return strategy;
  }

  // ─── Step 2 & 3: Monthly Content Calendar Generation ─────────────────────

  /**
   * Generates a complete 30-day (or multi-week) content calendar balancing all content types.
   */
  async generateMonthlyCalendar(
    businessId: string,
    options: { selectedDays?: string[]; durationWeeks?: number; industry?: string } = {},
  ) {
    const selectedDays = options.selectedDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const durationWeeks = options.durationWeeks || 4;

    this.logger.log(
      `Generating Content Calendar | Business: ${businessId} | Days: ${selectedDays.join(', ')} | Weeks: ${durationWeeks}`,
    );

    const { context } = await this.validateBusinessAndBlueprint(businessId);

    // Get or auto-generate monthly strategy
    let strategy = await this.firebase.getContentStrategyByBusinessId(businessId);
    if (!strategy) {
      strategy = await this.generateMonthlyStrategy(businessId);
    }

    // Start date calculation: Next Monday at 10:00 AM
    const now = new Date();
    const startMonday = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    startMonday.setDate(now.getDate() + daysToMonday);
    startMonday.setHours(10, 0, 0, 0);

    const daysOffsetMap: Record<string, number> = {
      Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
    };

    const createdEntries: any[] = [];
    const postTypesList = ['Reel', 'Carousel', 'Image', 'Video', 'Story'];
    const categoriesList = [
      'Educational', 'Promotional', 'Brand Awareness', 'Customer Story',
      'Testimonials', 'Behind the Scenes', 'Industry Tips', 'FAQs', 'Offers',
      'Seasonal Content', 'Festival Content',
    ];

    for (let week = 1; week <= durationWeeks; week++) {
      this.logger.log(`Generating Week ${week}/${durationWeeks} calendar posts...`);

      const promptInfo = await this.promptBuilder.buildMonthlyCalendarPrompt(
        businessId,
        strategy,
        week,
        selectedDays,
      );

      let weekPosts: any[] = [];
      try {
        const response = await this.aiService.generateStructuredJson<any[]>(
          promptInfo.systemPrompt,
          promptInfo.userPrompt,
          { temperature: 0.8, maxTokens: 3000 },
          `ContentService.generateMonthlyCalendar.week${week}`,
        );
        if (response.data && Array.isArray(response.data)) {
          weekPosts = response.data;
        }
      } catch (err: any) {
        this.logger.error(`Failed AI generation for Week ${week}: ${err.message}`);
      }

      // Fallback for missing or failed week generation
      if (!weekPosts.length) {
        weekPosts = selectedDays.map((day, idx) => ({
          dayName: day,
          platform: idx % 2 === 0 ? 'Instagram' : 'Facebook',
          postType: postTypesList[idx % postTypesList.length],
          category: categoriesList[idx % categoriesList.length],
          objective: 'Brand Awareness',
          headline: `Weekly Highlight: ${context.businessName}`,
          caption: `Discover what makes ${context.businessName} the top choice for ${context.targetAudience}. ${context.businessUSP || ''}`,
          cta: 'Learn More',
          hashtags: ['#BrandAwareness', '#Quality', `#${(context.industry || 'Business').replace(/\s+/g, '')}`],
          graphicPrompt: `Professional social media graphic for ${context.businessName}, modern design, vibrant colors, premium product aesthetic`,
          bestPostingTime: '10:00 AM',
        }));
      }

      // Save each post entry into Firestore contentCalendar collection
      for (const post of weekPosts) {
        const dayOffset = daysOffsetMap[post.dayName] ?? 0;
        const scheduledTime = new Date(startMonday);
        scheduledTime.setDate(startMonday.getDate() + (week - 1) * 7 + dayOffset);

        // Parse posting time string (e.g. "06:00 PM") if present
        if (post.bestPostingTime) {
          const match = post.bestPostingTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (match) {
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const ampm = match[3]?.toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            scheduledTime.setHours(hours, minutes, 0, 0);
          }
        }

        const entryPayload = {
          businessId,
          dayName: post.dayName,
          platform: post.platform || 'Instagram',
          postType: post.postType || 'Image',
          category: post.category || 'Educational',
          objective: post.objective || 'Brand Awareness',
          headline: post.headline || `Highlight for ${context.businessName}`,
          caption: post.caption || '',
          cta: post.cta || 'Learn More',
          hashtags: Array.isArray(post.hashtags) ? post.hashtags : ['#Marketing'],
          graphicPrompt: post.graphicPrompt || `Creative promo visual for ${context.businessName}`,
          bestPostingTime: post.bestPostingTime || '10:00 AM',
          scheduledTime,
          status: 'DRAFT',
          version: strategy.version || 'v1',
          createdAt: new Date(),
        };

        const createdDoc = await this.firebase.createContentCalendarEntry(entryPayload);
        createdEntries.push(createdDoc);
      }
    }

    // Record generation audit trail
    await this.firebase.createCalendarAuditTrail({
      action: 'CALENDAR_GENERATED',
      previousValue: null,
      newValue: { count: createdEntries.length, durationWeeks, strategyVersion: strategy.version },
      businessId,
      calendarEntryId: 'ALL',
      user: 'System/AI',
    });

    this.logger.log(`Calendar generated with ${createdEntries.length} posts for business ${businessId}`);
    return {
      success: true,
      message: `Generated ${createdEntries.length} calendar posts across ${durationWeeks} weeks`,
      businessId,
      strategy,
      entries: createdEntries,
    };
  }

  /** Alias method for backward compatibility */
  async generateContentPlan(
    businessId: string,
    selectedDays: string[] = ['Monday', 'Wednesday', 'Friday'],
    durationWeeks = 1,
    industry?: string,
  ) {
    return this.generateMonthlyCalendar(businessId, { selectedDays, durationWeeks, industry });
  }

  // ─── Step 4 & 5: Pagination, Filtering & Content Retrieval ────────────────

  /**
   * Retrieves content calendar entries with filtering (month, status, platform, category, search)
   * and pagination (page, limit).
   */
  async getContentCalendar(businessId: string, filters: CalendarFilterOptions = {}) {
    if (!businessId) throw new BadRequestException('Business ID is required');

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 50));

    let allEntries = await this.firebase.getContentCalendarByBusinessId(businessId);

    // Filter by Status
    if (filters.status && filters.status !== 'ALL') {
      const targetStatus = filters.status.toUpperCase();
      allEntries = allEntries.filter((e: any) => e.status?.toUpperCase() === targetStatus);
    }

    // Filter by Platform
    if (filters.platform && filters.platform !== 'ALL') {
      const targetPlatform = filters.platform.toLowerCase();
      allEntries = allEntries.filter((e: any) => e.platform?.toLowerCase() === targetPlatform);
    }

    // Filter by Category
    if (filters.category && filters.category !== 'ALL') {
      const targetCategory = filters.category.toLowerCase();
      allEntries = allEntries.filter((e: any) => e.category?.toLowerCase() === targetCategory);
    }

    // Filter by Month (format YYYY-MM)
    if (filters.month) {
      allEntries = allEntries.filter((e: any) => {
        if (!e.scheduledTime) return false;
        const dateObj = new Date(e.scheduledTime?.toDate ? e.scheduledTime.toDate() : e.scheduledTime);
        const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        return yearMonth === filters.month;
      });
    }

    // Search term filter
    if (filters.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      allEntries = allEntries.filter((e: any) => {
        const headline = (e.headline || e.contentIdea || '').toLowerCase();
        const caption = (e.caption || e.contentDescription || '').toLowerCase();
        const tags = Array.isArray(e.hashtags) ? e.hashtags.join(' ').toLowerCase() : '';
        return headline.includes(term) || caption.includes(term) || tags.includes(term);
      });
    }

    const total = allEntries.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedEntries = allEntries.slice(startIndex, startIndex + limit);

    return {
      total,
      page,
      limit,
      totalPages,
      entries: paginatedEntries,
    };
  }

  async getGeneratedContent(businessId: string) {
    const content = await this.firebase.getGeneratedContentByBusinessId(businessId);
    return { total: content.length, content };
  }

  // ─── Step 4: Approval Workflow & Content Operations (Firestore Transactions) ──

  /**
   * Approves a calendar post. Uses Firestore transaction to prevent partial write.
   */
  async approvePost(id: string, approvedBy = 'User') {
    const entry = await this.firebase.getContentCalendarEntryById(id);
    if (!entry) throw new NotFoundException(`Calendar entry ${id} not found`);

    this.validateStatusTransition(entry.status || 'DRAFT', 'APPROVED');

    const now = new Date();
    const updated = await this.firebase.runTransaction(async (tx) => {
      const docRef = this.firebase.col('contentCalendar').doc(id);
      const updatePayload = {
        status: 'APPROVED',
        approvedAt: now,
        approvedBy,
        updatedAt: now,
      };
      await tx.update(docRef, updatePayload);
      return { ...entry, ...updatePayload };
    });

    await this.firebase.createCalendarAuditTrail({
      action: 'POST_APPROVED',
      previousValue: { status: entry.status },
      newValue: { status: 'APPROVED', approvedBy, approvedAt: now },
      user: approvedBy,
      businessId: entry.businessId,
      calendarEntryId: id,
    });

    this.logger.log(`Post ${id} approved by ${approvedBy}`);
    return { success: true, entry: updated };
  }

  /**
   * Rejects a calendar post with reason. Uses Firestore transaction.
   */
  async rejectPost(id: string, reason?: string, user = 'User') {
    const entry = await this.firebase.getContentCalendarEntryById(id);
    if (!entry) throw new NotFoundException(`Calendar entry ${id} not found`);

    this.validateStatusTransition(entry.status || 'DRAFT', 'REJECTED');

    const now = new Date();
    const updated = await this.firebase.runTransaction(async (tx) => {
      const docRef = this.firebase.col('contentCalendar').doc(id);
      const updatePayload = {
        status: 'REJECTED',
        rejectionReason: reason || 'User rejected post',
        rejectedAt: now,
        updatedAt: now,
      };
      await tx.update(docRef, updatePayload);
      return { ...entry, ...updatePayload };
    });

    await this.firebase.createCalendarAuditTrail({
      action: 'POST_REJECTED',
      previousValue: { status: entry.status },
      newValue: { status: 'REJECTED', reason },
      user,
      businessId: entry.businessId,
      calendarEntryId: id,
    });

    this.logger.log(`Post ${id} rejected`);
    return { success: true, entry: updated };
  }

  /**
   * Bulk approves multiple calendar posts atomically using a Firestore transaction.
   */
  async bulkApprovePosts(ids: string[], approvedBy = 'User') {
    if (!ids || !ids.length) {
      throw new BadRequestException('Array of post IDs is required for bulk approval');
    }

    const now = new Date();
    const updatedEntries = await this.firebase.runTransaction(async (tx) => {
      const results: any[] = [];
      for (const id of ids) {
        const docRef = this.firebase.col('contentCalendar').doc(id);
        const doc = await tx.get(docRef);
        if (doc.exists) {
          const updatePayload = {
            status: 'APPROVED',
            approvedAt: now,
            approvedBy,
            updatedAt: now,
          };
          await tx.update(docRef, updatePayload);
          results.push({ id, ...doc.data(), ...updatePayload });
        }
      }
      return results;
    });

    for (const item of updatedEntries) {
      await this.firebase.createCalendarAuditTrail({
        action: 'POST_BULK_APPROVED',
        previousValue: { status: item.status },
        newValue: { status: 'APPROVED', approvedBy },
        user: approvedBy,
        businessId: item.businessId,
        calendarEntryId: item.id,
      });
    }

    return {
      success: true,
      message: `Successfully approved ${updatedEntries.length} post(s)`,
      count: updatedEntries.length,
      entries: updatedEntries,
    };
  }

  /**
   * Edits a calendar post entry. Uses Firestore transaction.
   */
  async editPost(id: string, updateData: any, user = 'User') {
    const entry = await this.firebase.getContentCalendarEntryById(id);
    if (!entry) throw new NotFoundException(`Calendar entry ${id} not found`);

    if (updateData.status && updateData.status !== entry.status) {
      this.validateStatusTransition(entry.status, updateData.status);
    }

    const now = new Date();
    const updated = await this.firebase.runTransaction(async (tx) => {
      const docRef = this.firebase.col('contentCalendar').doc(id);
      const updatePayload = {
        ...updateData,
        updatedAt: now,
      };
      await tx.update(docRef, updatePayload);
      return { ...entry, ...updatePayload };
    });

    await this.firebase.createCalendarAuditTrail({
      action: 'POST_EDITED',
      previousValue: entry,
      newValue: updated,
      user,
      businessId: entry.businessId,
      calendarEntryId: id,
    });

    return { success: true, entry: updated };
  }

  /** Legacy edit alias */
  async updateCalendarEntry(id: string, data: any) {
    return this.editPost(id, data);
  }

  /**
   * Duplicates a post entry. Uses Firestore transaction.
   */
  async duplicatePost(id: string, user = 'User') {
    const entry = await this.firebase.getContentCalendarEntryById(id);
    if (!entry) throw new NotFoundException(`Calendar entry ${id} not found`);

    const newId = this.firebase.generateId();
    const now = new Date();
    const newEntry = {
      ...entry,
      id: newId,
      headline: `(Copy) ${entry.headline || entry.contentIdea || 'Post'}`,
      status: 'DRAFT',
      approvedAt: null,
      approvedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.firebase.runTransaction(async (tx) => {
      const docRef = this.firebase.col('contentCalendar').doc(newId);
      await tx.set(docRef, newEntry);
    });

    await this.firebase.createCalendarAuditTrail({
      action: 'POST_DUPLICATED',
      previousValue: { originalId: id },
      newValue: { newId, headline: newEntry.headline },
      user,
      businessId: entry.businessId,
      calendarEntryId: newId,
    });

    return { success: true, entry: newEntry };
  }

  /**
   * Deletes a calendar post. Uses Firestore transaction.
   */
  async deletePost(id: string, user = 'User') {
    const entry = await this.firebase.getContentCalendarEntryById(id);
    if (!entry) throw new NotFoundException(`Calendar entry ${id} not found`);

    await this.firebase.runTransaction(async (tx) => {
      const docRef = this.firebase.col('contentCalendar').doc(id);
      await tx.delete(docRef);
    });

    await this.firebase.createCalendarAuditTrail({
      action: 'POST_DELETED',
      previousValue: entry,
      newValue: null,
      user,
      businessId: entry.businessId,
      calendarEntryId: id,
    });

    return { success: true, id };
  }

  async deleteCalendarEntry(id: string) {
    return this.deletePost(id);
  }

  /**
   * Reschedules a calendar post to a new date/time. Uses Firestore transaction.
   */
  async reschedulePost(id: string, newScheduledTime: string | Date, user = 'User') {
    const entry = await this.firebase.getContentCalendarEntryById(id);
    if (!entry) throw new NotFoundException(`Calendar entry ${id} not found`);

    const parsedDate = new Date(newScheduledTime);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Invalid scheduledTime date string: ${newScheduledTime}`);
    }

    const now = new Date();
    const updated = await this.firebase.runTransaction(async (tx) => {
      const docRef = this.firebase.col('contentCalendar').doc(id);
      const updatePayload = {
        scheduledTime: parsedDate,
        updatedAt: now,
      };
      await tx.update(docRef, updatePayload);
      return { ...entry, ...updatePayload };
    });

    await this.firebase.createCalendarAuditTrail({
      action: 'POST_RESCHEDULED',
      previousValue: { scheduledTime: entry.scheduledTime },
      newValue: { scheduledTime: parsedDate },
      user,
      businessId: entry.businessId,
      calendarEntryId: id,
    });

    return { success: true, entry: updated };
  }

  /**
   * Regenerates creative content for a single post using AI.
   */
  async regenerateSinglePost(id: string, user = 'User') {
    const entry = await this.firebase.getContentCalendarEntryById(id);
    if (!entry) throw new NotFoundException(`Calendar entry ${id} not found`);

    const context = await this.businessIntelligence.getBusinessContext(entry.businessId);

    const prompt = `You are an expert social media marketing writer for CampaignAI.
Regenerate creative content for a single post:
Business: ${context.businessName}
Industry: ${context.businessCategory}
Target Audience: ${context.targetAudience}
Brand Tone: ${context.brandVoice}
Original Post Type: ${entry.postType || 'Image'}
Original Category: ${entry.category || 'Educational'}

Provide a fresh, unique concept.
Return ONLY valid JSON (no markdown, no code fences):
{
  "headline": "New compelling hook",
  "caption": "Fresh engaging caption with call to action",
  "cta": "Shop Now",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "graphicPrompt": "New detailed image generation prompt"
}`;

    let result: any = null;
    try {
      const response = await this.aiService.generateStructuredJson<any>(
        'You are an expert social media copywriter. Return valid JSON.',
        prompt,
        { temperature: 0.8, maxTokens: 1500 },
        'ContentService.regenerateSinglePost',
      );
      result = response.data;
    } catch (err: any) {
      this.logger.error(`Single post regeneration error: ${err.message}`);
    }

    if (!result) {
      result = {
        headline: `Fresh Focus: ${context.businessName}`,
        caption: `Experience quality with ${context.businessName}. Crafted specifically for ${context.targetAudience}.`,
        cta: 'Discover More',
        hashtags: ['#Quality', '#Brand', '#Innovation'],
        graphicPrompt: `Modern product visual for ${context.businessName}`,
      };
    }

    const updated = await this.editPost(
      id,
      {
        headline: result.headline || entry.headline,
        caption: result.caption || entry.caption,
        cta: result.cta || entry.cta,
        hashtags: result.hashtags || entry.hashtags,
        graphicPrompt: result.graphicPrompt || entry.graphicPrompt,
      },
      user,
    );

    await this.firebase.createCalendarAuditTrail({
      action: 'POST_REGENERATED',
      previousValue: { headline: entry.headline },
      newValue: { headline: result.headline },
      user,
      businessId: entry.businessId,
      calendarEntryId: id,
    });

    return updated;
  }

  async regenerateCalendarEntry(id: string) {
    return this.regenerateSinglePost(id);
  }

  // ─── Deferred Operations (Return HTTP 501) ────────────────────────────────

  async regenerateWeek(businessId: string, weekNumber: number) {
    this.logger.log(`Deferred endpoint called: regenerateWeek business=${businessId} week=${weekNumber}`);
    throw new NotImplementedException('Regenerate week functionality is deferred until required by frontend.');
  }

  async regenerateMonth(businessId: string) {
    this.logger.log(`Deferred endpoint called: regenerateMonth business=${businessId}`);
    throw new NotImplementedException('Regenerate month functionality is deferred until required by frontend.');
  }

  async markPublished(calendarEntryId: string) {
    return this.editPost(calendarEntryId, { status: 'PUBLISHED', publishedAt: new Date() });
  }

  async createCalendarEntry(data: any) {
    const entry = await this.firebase.createContentCalendarEntry({
      ...data,
      scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : new Date(),
    });
    return { success: true, entry };
  }
}
