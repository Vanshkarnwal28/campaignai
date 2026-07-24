import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { OpenRouterService } from '../openrouter/openrouter.service';

/**
 * ContentService — Phase 2: AI Content Planner.
 *
 * Generates a weekly content calendar (Mon–Fri) using business profile data.
 * Each day includes: Caption, Headline, CTA, Hashtags, Post type,
 * Best posting time, Platform (Facebook/Instagram), Image prompt.
 */
@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly openRouter: OpenRouterService,
  ) {}

  /**
   * Generate a full weekly content calendar using business profile context.
   */
  async generateContentPlan(businessId: string, industry?: string) {
    this.logger.log(`Generating weekly content plan for business: ${businessId}`);

    // Fetch business profile for context-aware generation
    let profile: any = null;
    try {
      profile = await this.firebase.getBusinessProfile(businessId);
    } catch { /* profile may not exist yet */ }

    const businessContext = profile ? {
      businessName: profile.businessName || profile.industry || 'the business',
      industry: profile.industry || profile.businessCategory || industry || 'general',
      targetAudience: profile.targetAudience || 'general audience',
      brandTone: profile.brandTone || profile.brandVoice || 'professional',
      productsServices: profile.productsServices || '',
      businessUSP: profile.businessUSP || '',
      postingFrequency: profile.postingFrequency || '5 times/week',
      languages: profile.languages || 'English',
    } : {
      businessName: 'the business',
      industry: industry || 'general',
      targetAudience: 'general audience',
      brandTone: 'professional',
      productsServices: '',
      businessUSP: '',
      postingFrequency: '5 times/week',
      languages: 'English',
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let generatedPlan: any[] = [];

    // Generate using OpenRouter with full business context
    try {
      const result = await this.openRouter.chatJson<any[]>(
        'You are an expert social media marketing strategist. Generate content calendars that drive engagement and conversions.',
        `Generate a 5-day weekly content calendar (Monday to Friday) for this business:

Business Name: ${businessContext.businessName}
Industry: ${businessContext.industry}
Target Audience: ${businessContext.targetAudience}
Brand Tone: ${businessContext.brandTone}
Products/Services: ${businessContext.productsServices}
USP: ${businessContext.businessUSP}
Language: ${businessContext.languages}

For EACH day, provide ALL of these fields:
- day: the day name (Monday, Tuesday, etc.)
- caption: engaging social media caption (2-3 sentences)
- headline: short attention-grabbing headline (under 10 words)
- cta: call-to-action text (e.g., "Shop Now", "Learn More", "Sign Up Today")
- hashtags: array of 5-7 relevant hashtags
- postType: one of "Image Post", "Carousel", "Video", "Story", "Reel"
- bestPostingTime: optimal posting time (e.g., "10:00 AM", "2:00 PM")
- platform: "Facebook" or "Instagram" (alternate between them)
- imagePrompt: detailed AI image generation prompt for the post visual

Return ONLY valid JSON array with exactly 5 objects.`,
        0.8,
        3000,
      );

      if (result && Array.isArray(result) && result.length === 5) {
        generatedPlan = result;
      }
    } catch (err: any) {
      this.logger.warn(`OpenRouter content generation failed: ${err.message}`);
    }

    // Fallback if AI generation fails
    if (generatedPlan.length === 0) {
      generatedPlan = this.generateFallbackPlan(businessContext, days);
    }

    const entries: any[] = [];

    for (let i = 0; i < 5; i++) {
      const scheduledTime = this.getNextWeekday(i);
      const post = generatedPlan[i];

      // Parse posting time into scheduled datetime
      const postingTimeStr = post.bestPostingTime || '10:00 AM';
      const timeMatch = postingTimeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const period = timeMatch[3]?.toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        scheduledTime.setHours(hours, minutes, 0, 0);
      }

      const calendarEntry = await this.firebase.createContentCalendarEntry({
        businessId,
        day: i + 1,
        dayName: days[i],
        platform: post.platform || (i % 2 === 0 ? 'Instagram' : 'Facebook'),
        scheduledTime,
        caption: post.caption || '',
        headline: post.headline || '',
        cta: post.cta || 'Learn More',
        hashtags: post.hashtags || [],
        postType: post.postType || 'Image Post',
        bestPostingTime: post.bestPostingTime || '10:00 AM',
        imagePrompt: post.imagePrompt || post.graphicPrompt || '',
        status: 'SCHEDULED',
      });

      await this.firebase.createGeneratedContent({
        calendarEntryId: calendarEntry.id,
        businessId,
        dayName: days[i],
        platform: post.platform || (i % 2 === 0 ? 'Instagram' : 'Facebook'),
        caption: post.caption || '',
        headline: post.headline || '',
        cta: post.cta || 'Learn More',
        hashtags: post.hashtags || [],
        postType: post.postType || 'Image Post',
        bestPostingTime: post.bestPostingTime || '10:00 AM',
        imagePrompt: post.imagePrompt || post.graphicPrompt || '',
        scheduledTime,
        status: 'SCHEDULED',
      });

      entries.push(calendarEntry);
    }

    return {
      success: true,
      message: `Weekly content calendar generated (${entries.length} posts)`,
      businessId,
      entries,
    };
  }

  async getContentCalendar(businessId: string) {
    const entries = await this.firebase.getContentCalendarByBusinessId(businessId);
    return { total: entries.length, entries };
  }

  async getGeneratedContent(businessId: string) {
    const content = await this.firebase.getGeneratedContentByBusinessId(businessId);
    return { total: content.length, content };
  }

  async markPublished(calendarEntryId: string) {
    const updated = await this.firebase.updateContentCalendarEntry(calendarEntryId, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    return { success: true, entry: updated };
  }

  async updateCalendarEntry(calendarEntryId: string, data: { caption?: string; scheduledTime?: Date; status?: string }) {
    const updated = await this.firebase.updateContentCalendarEntry(calendarEntryId, data);
    return { success: true, entry: updated };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private getNextWeekday(offset: number): Date {
    const now = new Date();
    const monday = new Date(now);
    const day = now.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    monday.setDate(now.getDate() + diff + offset);
    monday.setHours(10, 0, 0, 0);
    return monday;
  }

  private generateFallbackPlan(context: any, days: string[]): any[] {
    const templates = [
      {
        caption: `✨ Start your week with ${context.businessName}! Our ${context.productsServices || 'products'} are designed for ${context.targetAudience}. Discover what makes us different.`,
        headline: 'Start Your Week Strong',
        cta: 'Shop Now',
        hashtags: ['#MondayMotivation', '#QualityFirst', `#${(context.industry || '').replace(/\s+/g, '')}`, '#NewWeek', '#BrandExcellence'],
        postType: 'Image Post',
        bestPostingTime: '10:00 AM',
        platform: 'Instagram',
        imagePrompt: `Clean modern product showcase for ${context.industry} business, minimalist aesthetic, studio lighting, premium feel`,
      },
      {
        caption: `🌟 Behind the scenes at ${context.businessName}. Here's how we ensure quality in everything we do for ${context.targetAudience}. 👇`,
        headline: 'Behind The Scenes',
        cta: 'Learn More',
        hashtags: ['#BehindTheScenes', '#QualityMatters', '#OurStory', '#Craftsmanship', '#TuesdayVibes'],
        postType: 'Carousel',
        bestPostingTime: '12:00 PM',
        platform: 'Facebook',
        imagePrompt: `Behind-the-scenes workspace showing craftsmanship in ${context.industry}, warm natural lighting`,
      },
      {
        caption: `💬 "This changed everything!" — Real feedback from our community. ${context.businessUSP || 'See why customers love us.'} ⭐⭐⭐⭐⭐`,
        headline: 'Hear From Our Customers',
        cta: 'Read Reviews',
        hashtags: ['#CustomerLove', '#Testimonial', '#FiveStars', '#HappyCustomers', '#WednesdayWins'],
        postType: 'Video',
        bestPostingTime: '2:00 PM',
        platform: 'Instagram',
        imagePrompt: `Happy diverse customers using ${context.industry} products, bright modern setting, authentic feel`,
      },
      {
        caption: `📈 Quick tip for ${context.targetAudience}: consistency is key! Our ${context.productsServices || 'solution'} helps you stay ahead every single day.`,
        headline: 'Pro Tips Thursday',
        cta: 'Get Started',
        hashtags: ['#ProTips', '#GrowthMindset', '#ThursdayThoughts', '#BusinessTips', '#StayAhead'],
        postType: 'Reel',
        bestPostingTime: '11:00 AM',
        platform: 'Facebook',
        imagePrompt: `Professional infographic style visual for ${context.industry} tips, modern design, clean typography`,
      },
      {
        caption: `🎉 Friday treat! Exclusive weekend offer for our community. Don't miss out — limited time only! ⏰ ${context.businessUSP || ''}`,
        headline: 'Weekend Special Offer',
        cta: 'Claim Now',
        hashtags: ['#FridayFeeling', '#WeekendOffer', '#FlashSale', '#LimitedTime', '#TGIF'],
        postType: 'Story',
        bestPostingTime: '3:00 PM',
        platform: 'Instagram',
        imagePrompt: `Vibrant celebration with ${context.industry} product at center, confetti, bright colors, sale promotion aesthetic`,
      },
    ];

    return templates.map((t, i) => ({ ...t, day: days[i] }));
  }
}