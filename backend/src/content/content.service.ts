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
  async generateContentPlan(
    businessId: string, 
    selectedDays: string[], 
    durationWeeks: number, 
    industry?: string
  ) {
    this.logger.log(`Generating content plan. Business: ${businessId}, Days: ${selectedDays.join(', ')}, Weeks: ${durationWeeks}`);

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
      languages: profile.languages || 'English',
    } : {
      businessName: 'the business',
      industry: industry || 'general',
      targetAudience: 'general audience',
      brandTone: 'professional',
      productsServices: '',
      businessUSP: '',
      languages: 'English',
    };

    const entries: any[] = [];
    const daysMap: Record<string, number> = {
      'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
      'Friday': 4, 'Saturday': 5, 'Sunday': 6
    };

    // Calculate start date (next Monday)
    const now = new Date();
    const nextMonday = new Date(now);
    const currentDay = now.getDay();
    const daysToMonday = currentDay === 0 ? 1 : 8 - currentDay;
    nextMonday.setDate(now.getDate() + daysToMonday);
    nextMonday.setHours(10, 0, 0, 0);

    const postTypes = ['Graphic', 'Reel', 'Carousel', 'Story', 'Video', 'Blog', 'Poll'];

    for (let w = 0; w < durationWeeks; w++) {
      this.logger.log(`Generating Week ${w + 1}/${durationWeeks} content calendar...`);
      
      const prompt = `Generate a content calendar for Week ${w + 1} of a ${durationWeeks}-week plan for:
Business Name: ${businessContext.businessName}
Industry: ${businessContext.industry}
Target Audience: ${businessContext.targetAudience}
Brand Tone: ${businessContext.brandTone}
Products/Services: ${businessContext.productsServices}
USP: ${businessContext.businessUSP}
Language: ${businessContext.languages}

Please generate exactly 1 post for each of these posting days: ${selectedDays.join(', ')}.
To maintain posting consistency, avoid duplicate ideas, and balance promotional and educational content.
Intelligently mix these content types: ${postTypes.join(', ')}.

For EACH day, return an object with:
- dayName: the day name (e.g. "Monday")
- postType: one of ${JSON.stringify(postTypes)}
- contentIdea: creative engaging post idea
- contentDescription: short description of what the post contains
- caption: engaging caption
- hashtags: array of 3-5 relevant hashtags

Return ONLY valid JSON array of objects (no markdown, no code fences):
[
  {
    "dayName": "Monday",
    "postType": "...",
    "contentIdea": "...",
    "contentDescription": "...",
    "caption": "...",
    "hashtags": ["#tag1", "#tag2"]
  },
  ...
]`;

      let weekPlan: any[] = [];
      try {
        const result = await this.openRouter.chatJson<any[]>(
          'You are an expert social media content generator. Return valid JSON array.',
          prompt,
          0.8,
          2500,
        );
        if (result && Array.isArray(result)) {
          weekPlan = result;
        }
      } catch (err: any) {
        this.logger.error(`Failed to generate calendar week ${w + 1}: ${err.message}`);
      }

      // Fallback if AI call fails
      if (weekPlan.length === 0) {
        weekPlan = selectedDays.map(day => ({
          dayName: day,
          postType: 'Graphic',
          contentIdea: `Weekly highlight for ${businessContext.businessName}`,
          contentDescription: `Showcase of products and services for ${businessContext.businessName}.`,
          caption: `Discover the best of ${businessContext.businessName}! We offer premium quality and exceptional service.`,
          hashtags: ['#Quality', '#Brand', '#Premium'],
        }));
      }

      for (const post of weekPlan) {
        const offset = daysMap[post.dayName] || 0;
        const scheduledTime = new Date(nextMonday);
        scheduledTime.setDate(nextMonday.getDate() + (w * 7) + offset);
        
        const entry = await this.firebase.createContentCalendarEntry({
          businessId,
          dayName: post.dayName,
          platform: 'Instagram',
          scheduledTime,
          contentIdea: post.contentIdea || '',
          contentDescription: post.contentDescription || '',
          caption: post.caption || '',
          hashtags: post.hashtags || [],
          postType: post.postType || 'Graphic',
          status: 'PENDING',
        });
        entries.push(entry);
      }
    }

    return {
      success: true,
      message: `Content calendar generated (${entries.length} posts for ${durationWeeks} week(s))`,
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

  async createCalendarEntry(data: any) {
    const entry = await this.firebase.createContentCalendarEntry({
      ...data,
      scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : new Date(),
    });
    return { success: true, entry };
  }

  async updateCalendarEntry(calendarEntryId: string, data: { caption?: string; scheduledTime?: Date; status?: string; contentIdea?: string; contentDescription?: string; postType?: string; hashtags?: string[] }) {
    const updated = await this.firebase.updateContentCalendarEntry(calendarEntryId, data);
    return { success: true, entry: updated };
  }

  async deleteCalendarEntry(calendarEntryId: string) {
    await this.firebase.deleteContentCalendarEntry(calendarEntryId);
    return { success: true };
  }

  async regenerateCalendarEntry(id: string) {
    const entry = await this.firebase.getContentCalendarEntryById(id);
    if (!entry) throw new Error('Calendar entry not found');

    const profile = await this.firebase.getBusinessProfile(entry.businessId);
    const businessContext = profile ? {
      businessName: profile.businessName || 'the business',
      industry: profile.industry || 'general',
      targetAudience: profile.targetAudience || 'general audience',
      brandTone: profile.brandTone || 'professional',
    } : {
      businessName: 'the business',
      industry: 'general',
      targetAudience: 'general audience',
      brandTone: 'professional',
    };

    const postTypes = ['Graphic', 'Reel', 'Carousel', 'Story', 'Video', 'Blog', 'Poll'];
    const prompt = `You are an expert social media copywriter. Regenerate a single social media post calendar entry for:
Business Name: ${businessContext.businessName}
Industry: ${businessContext.industry}
Target Audience: ${businessContext.targetAudience}
Brand Tone: ${businessContext.brandTone}

Original Post Type: ${entry.postType || 'Graphic'}
Original Idea (if any): ${entry.contentIdea || ''}

Provide a completely new unique creative concept.
Return ONLY valid JSON in this format (no markdown, no code fences):
{
  "postType": "...",
  "contentIdea": "...",
  "contentDescription": "...",
  "caption": "...",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;

    let result: any = null;
    try {
      result = await this.openRouter.chatJson<any>(
        'You are an expert social media marketing writer. Return valid JSON.',
        prompt,
        0.8,
        1500,
      );
    } catch (err: any) {
      this.logger.error(`Regenerate single post failed: ${err.message}`);
    }

    if (result) {
      const updated = await this.firebase.updateContentCalendarEntry(id, {
        postType: result.postType || entry.postType,
        contentIdea: result.contentIdea || entry.contentIdea,
        contentDescription: result.contentDescription || entry.contentDescription,
        caption: result.caption || entry.caption,
        hashtags: result.hashtags || entry.hashtags || [],
      });
      return { success: true, entry: updated };
    }

    return { success: false, message: 'AI generation fallback executed' };
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