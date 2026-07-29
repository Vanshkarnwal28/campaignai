import { Injectable, Logger } from '@nestjs/common';
import { BusinessIntelligenceService } from '../business/business-intelligence.service';

/**
 * PromptBuilderService
 *
 * Centralised, reusable prompt engineering for all AI calls in the application.
 * Every service that makes an OpenRouter call must use this service to build
 * its system-prompt context — no duplicated prompt engineering across the codebase.
 *
 * Usage flow:
 *   AnyService → PromptBuilderService → BusinessIntelligenceService.getBusinessContext()
 *              → structured prompt string → OpenRouter
 */
@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  constructor(
    private readonly businessIntelligence: BusinessIntelligenceService,
  ) {}

  // ─── Business Prompt ──────────────────────────────────────────────────────

  /**
   * Builds a structured business-context system prompt string.
   * Consumed by AssistantService, ContentService, and any AI module that needs
   * full business context injected into its system prompt.
   */
  async buildBusinessPrompt(businessId: string): Promise<string> {
    const ctx = await this.businessIntelligence.getBusinessContext(businessId);

    return `=== CAMPAIGN AI BUSINESS CONTEXT ===
Business Name: ${ctx.businessName}
Category / Industry: ${ctx.businessCategory}
Products / Services: ${ctx.productsServices}
Unique Selling Proposition (USP): ${ctx.businessUSP}

Target Demographic:
- Audience Persona: ${ctx.targetAudience}
- Age Range: ${ctx.customerAgeGroup}
- Gender Target: ${ctx.genderTarget}
- Geographic Location: ${ctx.location}

Marketing Strategy & Positioning:
- Primary Business Goals: ${ctx.businessGoals}
- Monthly Budget: ${ctx.monthlyBudget}
- Key Competitors: ${ctx.competitors}
- Brand Voice & Tone: ${ctx.brandVoice}
- Brand Visual Theme: ${ctx.brandVisualTheme}
- Brand Colors: ${JSON.stringify(ctx.brandColors)}
- Preferred Languages: ${ctx.languages}

AI Blueprint Insights:
- Executive Summary: ${ctx.executiveSummary}
- SWOT Strengths: ${JSON.stringify(ctx.swotAnalysis?.strengths || [])}
- Customer Pain Points: ${JSON.stringify(ctx.customerPainPoints || [])}
- Buying Triggers: ${JSON.stringify(ctx.buyingTriggers || [])}
- Content Pillars: ${JSON.stringify(ctx.contentPillars || [])}
- Recommended Channels: ${JSON.stringify(ctx.recommendedChannels || [])}
======================================`;
  }

  // ─── Content Prompt ───────────────────────────────────────────────────────

  /**
   * Builds a content-generation system prompt using the business context.
   * Used by ContentService for weekly calendar and individual post generation.
   */
  async buildContentPrompt(
    businessId: string,
    options?: { week?: number; totalWeeks?: number; selectedDays?: string[] },
  ): Promise<string> {
    const ctx = await this.businessIntelligence.getBusinessContext(businessId);

    const weekInfo = options?.week && options?.totalWeeks
      ? `Week ${options.week} of ${options.totalWeeks}`
      : 'Content';

    return `You are an expert social media content strategist for CampaignAI.

${weekInfo} for:
Business: ${ctx.businessName}
Industry: ${ctx.businessCategory}
Products/Services: ${ctx.productsServices}
Target Audience: ${ctx.targetAudience}
Brand Tone: ${ctx.brandVoice}
USP: ${ctx.businessUSP}
Language: ${ctx.languages}
Content Pillars: ${JSON.stringify(ctx.contentPillars)}
Posting Days: ${options?.selectedDays?.join(', ') || 'All weekdays'}

Generate diverse, engaging content that reflects the brand voice and addresses customer pain points.
Return ONLY valid JSON array (no markdown, no code fences).`;
  }

  // ─── Monthly Strategy Prompt ──────────────────────────────────────────────

  /**
   * Builds prompt for generating 4-week themes, objectives, frequency, platforms, and campaign focus.
   */
  async buildMonthlyStrategyPrompt(businessId: string): Promise<{ systemPrompt: string; userPrompt: string }> {
    const ctx = await this.businessIntelligence.getBusinessContext(businessId);

    const systemPrompt = `You are a Chief Content Strategist for CampaignAI.
Generate a comprehensive 30-day Monthly Content Strategy for the specified business.
Return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "monthlyMarketingStrategy": "Clear 3-4 sentence high-level content strategy for the month.",
  "monthlyCampaignFocus": "Core thematic focus of the month (e.g., Brand Authority & Product Trial)",
  "recommendedPostingFrequency": "Recommended frequency (e.g. 5 posts/week, total 20 posts/month)",
  "recommendedPlatforms": ["Instagram", "Facebook", "LinkedIn"],
  "weeklyThemes": [
    {
      "weekNumber": 1,
      "theme": "Week 1 Theme Name",
      "objective": "Week 1 Primary Objective (e.g. Build Awareness & Educate)"
    },
    {
      "weekNumber": 2,
      "theme": "Week 2 Theme Name",
      "objective": "Week 2 Primary Objective (e.g. Highlight USP & Social Proof)"
    },
    {
      "weekNumber": 3,
      "theme": "Week 3 Theme Name",
      "objective": "Week 3 Primary Objective (e.g. Customer Stories & Overcome Objections)"
    },
    {
      "weekNumber": 4,
      "theme": "Week 4 Theme Name",
      "objective": "Week 4 Primary Objective (e.g. Conversions & Promotional Offer)"
    }
  ]
}`;

    const userPrompt = `Business Context:
Name: ${ctx.businessName}
Industry: ${ctx.businessCategory}
Products/Services: ${ctx.productsServices}
Target Audience: ${ctx.targetAudience}
Demographics: Age ${ctx.customerAgeGroup}, ${ctx.genderTarget}, ${ctx.location}
USP: ${ctx.businessUSP}
Brand Tone: ${ctx.brandVoice}
Language: ${ctx.languages}
Content Pillars: ${JSON.stringify(ctx.contentPillars)}
Competitors: ${ctx.competitors}
Goals: ${ctx.businessGoals}`;

    return { systemPrompt, userPrompt };
  }

  // ─── Monthly Calendar Prompt ──────────────────────────────────────────────

  /**
   * Builds prompt for generating a week's posts balancing all required content categories and types.
   */
  async buildMonthlyCalendarPrompt(
    businessId: string,
    strategy: any,
    weekNumber: number,
    selectedDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  ): Promise<{ systemPrompt: string; userPrompt: string }> {
    const ctx = await this.businessIntelligence.getBusinessContext(businessId);
    const weekTheme = strategy?.weeklyThemes?.find((w: any) => w.weekNumber === weekNumber) || {
      theme: `Week ${weekNumber} Engagement`,
      objective: 'Brand Awareness & Growth',
    };

    const categories = [
      'Educational', 'Promotional', 'Brand Awareness', 'Customer Story',
      'Testimonials', 'Behind the Scenes', 'Industry Tips', 'FAQs', 'Offers',
      'Seasonal Content', 'Festival Content', 'Reels', 'Carousel Ideas'
    ];

    const platforms = strategy?.recommendedPlatforms?.length ? strategy.recommendedPlatforms : ['Instagram', 'Facebook'];

    const systemPrompt = `You are an expert social media content writer for CampaignAI.
Generate exactly 1 post for each of these days: ${selectedDays.join(', ')} for Week ${weekNumber}.

Requirements:
1. Ensure complete balance across content categories: ${categories.join(', ')}.
2. Ensure platforms vary across: ${platforms.join(', ')}.
3. Avoid repetitive headlines, captions, or image prompts.
4. Language: ${ctx.languages}. If Hinglish, write Hindi using Latin script.

Return ONLY a valid JSON array of post objects:
[
  {
    "dayName": "Monday",
    "platform": "Instagram",
    "postType": "Reel | Carousel | Image | Video | Story",
    "category": "Educational | Promotional | Brand Awareness | Customer Story | Testimonials | Behind the Scenes | Industry Tips | FAQs | Offers | Seasonal | Festival",
    "objective": "Lead Generation | Engagement | Brand Recall | Traffic | Direct Sale",
    "headline": "Catchy post title / hook",
    "caption": "Full engaging caption with call-to-action text",
    "cta": "Shop Now | Learn More | Sign Up | Save Post | Comment Below | DM Us",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
    "graphicPrompt": "Detailed AI image or video generation prompt for Midjourney / DALL-E",
    "bestPostingTime": "10:00 AM | 12:30 PM | 06:00 PM | 08:30 PM"
  }
]`;

    const userPrompt = `Business Context:
Name: ${ctx.businessName}
Industry: ${ctx.businessCategory}
Products/Services: ${ctx.productsServices}
USP: ${ctx.businessUSP}
Brand Tone: ${ctx.brandVoice}
Target Audience: ${ctx.targetAudience}

Week ${weekNumber} Strategy:
Theme: ${weekTheme.theme}
Objective: ${weekTheme.objective}
Monthly Focus: ${strategy?.monthlyCampaignFocus || 'Growth'}`;

    return { systemPrompt, userPrompt };
  }

  // ─── Campaign Prompt ──────────────────────────────────────────────────────

  /**
   * Builds a campaign-generation system prompt using the business context.
   * Used by CampaignsService for AI campaign creation.
   */
  async buildCampaignPrompt(businessId: string): Promise<string> {
    const ctx = await this.businessIntelligence.getBusinessContext(businessId);

    return `You are an expert Meta Ads campaign strategist for CampaignAI.

Business Intelligence:
Business: ${ctx.businessName}
Industry: ${ctx.businessCategory}
Products/Services: ${ctx.productsServices}
Target Audience: ${ctx.targetAudience}
Age Group: ${ctx.customerAgeGroup}
Gender: ${ctx.genderTarget}
Location: ${ctx.location}
Brand Tone: ${ctx.brandVoice}
USP: ${ctx.businessUSP}
Monthly Budget: ${ctx.monthlyBudget}
Recommended Channels: ${JSON.stringify(ctx.recommendedChannels)}
Campaign Strategy: ${JSON.stringify(ctx.campaignStrategy)}

Generate complete, high-converting Meta Ads campaign configurations.
Return ONLY valid JSON (no markdown, no code fences).`;
  }

  // ─── Assistant Prompt ─────────────────────────────────────────────────────

  /**
   * Builds an assistant system prompt with optional business context injection.
   * Used by AssistantService for the RAG-based help bot.
   */
  async buildAssistantPrompt(businessId?: string): Promise<string> {
    let businessSection = '';

    if (businessId) {
      try {
        businessSection = await this.buildBusinessPrompt(businessId);
      } catch {
        this.logger.warn(`PromptBuilderService: Could not fetch business context for ${businessId}`);
      }
    }

    return businessSection;
  }
}
