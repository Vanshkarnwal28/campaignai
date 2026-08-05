import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { BusinessIntelligenceService } from '../business/business-intelligence.service';
import { AiService } from '../ai/ai.service';
import { GraphicGeneratorService } from '../content/graphic-generator.service';
import { SchedulerService } from './scheduler.service';

export interface SpecialEvent {
  name: string;
  dateStr: string; // YYYY-MM-DD
  category: string;
  themeVibe: string;
  suggestedOffer: string;
}

@Injectable()
export class SpecialEventsService {
  private readonly logger = new Logger(SpecialEventsService.name);

  // Annual calendar of major promotional events and holidays
  private readonly eventCatalog: Array<Omit<SpecialEvent, 'dateStr'> & { month: number; day: number }> = [
    { name: "New Year's Day", month: 1, day: 1, category: 'Holiday', themeVibe: 'festive joyful high-energy', suggestedOffer: 'New Year New Start 30% OFF' },
    { name: "Valentine's Day", month: 2, day: 14, category: 'Holiday', themeVibe: 'luxurious romantic festive', suggestedOffer: 'Valentine Special BOGO Deal' },
    { name: "St. Patrick's Day", month: 3, day: 17, category: 'Holiday', themeVibe: 'playful high-energy', suggestedOffer: 'Lucky Flash Sale' },
    { name: "Earth Day", month: 4, day: 22, category: 'Awareness', themeVibe: 'eco sustainable mindful', suggestedOffer: 'Eco-Friendly Special Discount' },
    { name: "Mother's Day", month: 5, day: 10, category: 'Holiday', themeVibe: 'luxurious elegant friendly', suggestedOffer: 'Mother’s Day Gift Special' },
    { name: "Father's Day", month: 6, day: 21, category: 'Holiday', themeVibe: 'bold corporate premium', suggestedOffer: 'Father’s Day Exclusive Deal' },
    { name: "Independence Day", month: 7, day: 4, category: 'Holiday', themeVibe: 'bold high-energy festive', suggestedOffer: 'Freedom Summer Sale' },
    { name: "Labor Day", month: 9, day: 7, category: 'Holiday', themeVibe: 'casual bold high-energy', suggestedOffer: 'Labor Day Weekend Promo' },
    { name: "Halloween", month: 10, day: 31, category: 'Holiday', themeVibe: 'playful festive bold', suggestedOffer: 'Spooktacular Savings' },
    { name: "Black Friday", month: 11, day: 27, category: 'Shopping', themeVibe: 'bold high-energy luxury', suggestedOffer: '50% OFF Black Friday Doorbuster' },
    { name: "Cyber Monday", month: 11, day: 30, category: 'Shopping', themeVibe: 'bold tech high-energy', suggestedOffer: 'Cyber Monday Tech Savings' },
    { name: "Diwali Festival of Lights", month: 11, day: 1, category: 'Festival', themeVibe: 'festive luxurious joyful', suggestedOffer: 'Festive Season Grand Sale' },
    { name: "Christmas Day", month: 12, day: 25, category: 'Holiday', themeVibe: 'festive joyful luxury', suggestedOffer: 'Holiday Magic Special Deal' },
    { name: "New Year's Eve", month: 12, day: 31, category: 'Holiday', themeVibe: 'luxurious festive high-energy', suggestedOffer: 'Year-End Flash Sale' },
  ];

  constructor(
    private readonly firebase: FirebaseService,
    private readonly businessIntelligence: BusinessIntelligenceService,
    private readonly aiService: AiService,
    private readonly graphicGenerator: GraphicGeneratorService,
    private readonly schedulerService: SchedulerService,
  ) {}

  /**
   * Detects upcoming holidays and promotional events within the next N days.
   */
  getUpcomingEvents(daysAhead: number = 60): SpecialEvent[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const upcoming: SpecialEvent[] = [];

    for (const item of this.eventCatalog) {
      let eventDate = new Date(currentYear, item.month - 1, item.day);
      if (eventDate < now) {
        eventDate = new Date(currentYear + 1, item.month - 1, item.day);
      }

      const diffMs = eventDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= daysAhead) {
        upcoming.push({
          name: item.name,
          dateStr: eventDate.toISOString().split('T')[0],
          category: item.category,
          themeVibe: item.themeVibe,
          suggestedOffer: item.suggestedOffer,
        });
      }
    }

    return upcoming.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }

  /**
   * Generates a special event AI campaign, renders a holiday graphic, and schedules it for 10:00 AM.
   */
  async generateEventCampaign(businessId: string, eventName?: string) {
    this.logger.log(`Generating Special Event Campaign for business ${businessId}, Event: ${eventName || 'Auto-Detected'}`);

    const context = await this.businessIntelligence.getBusinessContext(businessId);
    const upcoming = this.getUpcomingEvents(60);
    const targetEvent = upcoming.find((e) => e.name.toLowerCase() === (eventName || '').toLowerCase()) || upcoming[0] || {
      name: "Special Seasonal Celebration",
      dateStr: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      category: 'Festival',
      themeVibe: 'festive bold joyful',
      suggestedOffer: 'Special Seasonal Discount',
    };

    // Prompt Gemini AI for event-themed copywriting
    const prompt = `You are a world-class social media strategist. Create a high-converting promotional post for an upcoming special holiday/event.

BUSINESS CONTEXT:
- Name: ${context.businessName}
- Category: ${context.businessCategory}
- Products/Services: ${context.productsServices}
- USP: ${context.businessUSP}
- Contact Phone: ${context.contactPhone}
- Website: ${context.websiteUrl}

TARGET SPECIAL EVENT:
- Event Name: ${targetEvent.name}
- Event Date: ${targetEvent.dateStr}
- Suggested Offer: ${targetEvent.suggestedOffer}

REQUIREMENTS:
Return ONLY valid JSON matching this exact structure (no markdown, no code fences):
{
  "caption": "Exciting event-themed caption starting with a holiday emoji hook, highlighting the special deal, USP, and phone/website contact info.",
  "headline": "Short offer headline under 40 characters",
  "description": "Urgency subtext under 30 characters",
  "hashtags": ["#${targetEvent.name.replace(/[^a-zA-Z0-9]/g, '')}", "#${context.businessCategory.replace(/[^a-zA-Z0-9]/g, '')}", "#SpecialOffer", "#LimitedTime"],
  "ctaType": "LEARN_MORE"
}`;

    let aiResult = await this.aiService.chatJson<any>(
      'You are an expert holiday social media copywriter. Return ONLY valid JSON.',
      prompt,
      0.7,
      2048,
      'SpecialEventsService.generateEventCampaign',
    );

    if (!aiResult) {
      aiResult = {
        caption: `🎉 ${targetEvent.name} Special Offer from ${context.businessName}! Celebrate with us and enjoy ${targetEvent.suggestedOffer}! Call ${context.contactPhone || 'us'} or visit ${context.websiteUrl || 'our website'} to claim.`,
        headline: `${targetEvent.name} Special Deal`,
        description: 'Limited Time • Claim Today',
        hashtags: [`#${targetEvent.name.replace(/[^a-zA-Z0-9]/g, '')}`, '#SpecialOffer', '#LimitedTime'],
        ctaType: 'LEARN_MORE',
      };
    }

    // Render 1080x1080 branded holiday graphic buffer with contact details footer
    const graphicBuffer = await this.graphicGenerator.generateBrandedGraphicBuffer({
      businessName: context.businessName,
      offerText: targetEvent.suggestedOffer,
      headline: aiResult.headline,
      description: aiResult.description,
      ctaType: aiResult.ctaType,
      niche: `${targetEvent.name} Special`,
      vibe: targetEvent.themeVibe,
      phone: context.contactPhone,
      email: context.contactEmail,
      website: context.websiteUrl,
      address: context.physicalAddress,
    });

    // Upload graphic to storage
    const fileName = `event_${targetEvent.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
    const destinationPath = `events/${businessId}/${fileName}`;
    const uploadRes = await this.firebase.uploadFileBuffer(graphicBuffer, destinationPath, 'image/png');
    const imageUrl = typeof uploadRes === 'string' ? uploadRes : uploadRes?.publicUrl || `data:image/png;base64,${graphicBuffer.toString('base64')}`;

    // Schedule for 10:00 AM delivery on target event date
    const eventDate = new Date(`${targetEvent.dateStr}T10:00:00.000Z`);

    const scheduledPost = await this.firebase.createScheduledPost({
      businessId,
      caption: `${aiResult.caption}\n\n${(aiResult.hashtags || []).join(' ')}`,
      headline: aiResult.headline,
      hashtags: aiResult.hashtags || [],
      imageUrl,
      platform: 'both',
      scheduledTime: eventDate,
      postType: `Special Event (${targetEvent.name})`,
      status: 'SCHEDULED',
      timezone: 'UTC',
      scheduleRule: 'daily_10am',
    } as any);

    return {
      success: true,
      event: targetEvent,
      aiResult,
      imageUrl,
      scheduledPost,
    };
  }
}
