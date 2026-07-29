import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { AiService } from '../ai/ai.service';
import { BusinessIntelligenceService } from '../business/business-intelligence.service';

/**
 * LeadAssistantService — Phase 7: AI Lead Assistant.
 *
 * Post-lead AI actions: summarization, priority scoring,
 * follow-up suggestions, WhatsApp/Email/Call Script generation.
 * Consumes central BusinessContext from BusinessIntelligenceService.
 */
@Injectable()
export class LeadAssistantService {
  private readonly logger = new Logger(LeadAssistantService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly aiService: AiService,
    private readonly businessIntelligence: BusinessIntelligenceService,
  ) {}

  /**
   * Get comprehensive AI assist for a lead — all suggestions at once.
   */
  async getFullAssist(leadId: string) {
    const lead = await this.firebase.getLeadById(leadId) as any;
    if (!lead) throw new NotFoundException('Lead not found');

    const businessContext = lead.businessId
      ? await this.businessIntelligence.getBusinessContext(lead.businessId)
      : null;

    const [summary, priority, followUp] = await Promise.all([
      this.summarizeRequirement(lead, businessContext),
      this.suggestPriority(lead, businessContext),
      this.recommendFollowUp(lead, businessContext),
    ]);

    return {
      leadId,
      leadName: lead.name,
      summary,
      priority,
      followUp,
    };
  }

  /**
   * AI summary of the lead's requirement.
   */
  async summarizeRequirement(leadOrId: any, profile?: any): Promise<string> {
    const lead = typeof leadOrId === 'string'
      ? await this.firebase.getLeadById(leadOrId)
      : leadOrId;
    if (!lead) throw new NotFoundException('Lead not found');

    try {
      return await this.aiService.chat(
        'You are a CRM assistant. Summarize the lead information concisely.',
        `Summarize this lead in 2-3 sentences:
Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || 'N/A'}
Source: ${lead.source || 'Unknown'}
Requirement: ${lead.requirement || 'Not specified'}
Campaign: ${lead.campaign || 'Direct'}
Status: ${lead.status || 'NEW'}`,
        0.5,
        200,
        'LeadAssistantService.summarizeRequirement',
      );
    } catch {
      return `Lead ${lead.name} (${lead.email}) from ${lead.source || 'direct'} source. ${lead.requirement || 'No specific requirement noted.'}`;
    }
  }

  /**
   * AI-suggested priority: HIGH / MEDIUM / LOW with reasoning.
   */
  async suggestPriority(leadOrId: any, profile?: any): Promise<{ level: string; reason: string }> {
    const lead = typeof leadOrId === 'string'
      ? await this.firebase.getLeadById(leadOrId)
      : leadOrId;
    if (!lead) throw new NotFoundException('Lead not found');

    try {
      const result = await this.aiService.chatJson<{ level: string; reason: string }>(
        'You are a sales prioritization expert. Analyze lead data and assign priority.',
        `Assign a priority level (HIGH, MEDIUM, or LOW) to this lead and explain why:

Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || 'N/A'}
Source: ${lead.source || 'Unknown'}
Requirement: ${lead.requirement || 'Not specified'}
Campaign: ${lead.campaign || 'Direct'}
Business Industry: ${profile?.industry || 'General'}

Return JSON: {"level": "HIGH|MEDIUM|LOW", "reason": "explanation"}`,
        0.5,
        200,
        'LeadAssistantService.suggestPriority',
      );

      if (result?.level) return result;
    } catch { /* fallback */ }

    // Fallback priority logic
    const hasPhone = !!lead.phone;
    const hasRequirement = !!(lead.requirement && lead.requirement.length > 10);
    const isFromAd = lead.source === 'META_LEAD_AD';

    if (isFromAd && hasPhone && hasRequirement) return { level: 'HIGH', reason: 'Lead from ad campaign with phone and detailed requirement' };
    if (hasPhone || isFromAd) return { level: 'MEDIUM', reason: 'Lead has contact information or came from ad campaign' };
    return { level: 'LOW', reason: 'Basic lead with minimal information' };
  }

  /**
   * AI-recommended follow-up strategy.
   */
  async recommendFollowUp(leadOrId: any, profile?: any): Promise<string> {
    const lead = typeof leadOrId === 'string'
      ? await this.firebase.getLeadById(leadOrId)
      : leadOrId;
    if (!lead) throw new NotFoundException('Lead not found');

    try {
      return await this.aiService.chat(
        'You are a sales follow-up strategist. Recommend the best follow-up approach.',
        `Suggest a follow-up strategy (3-4 bullet points) for this lead:
Name: ${lead.name}
Source: ${lead.source || 'Direct'}
Requirement: ${lead.requirement || 'General inquiry'}
Status: ${lead.status || 'NEW'}
Business: ${profile?.businessName || 'Our business'}
Industry: ${profile?.industry || 'General'}`,
        0.7,
        300,
        'LeadAssistantService.recommendFollowUp',
      );
    } catch {
      return `• Reach out within 24 hours via phone or WhatsApp\n• Reference their specific interest: "${lead.requirement || 'your services'}"\n• Offer a free consultation or demo\n• Schedule a follow-up reminder for 48 hours`;
    }
  }

  /**
   * Generate personalized WhatsApp message.
   */
  async generateWhatsAppMessage(leadId: string): Promise<string> {
    const lead = await this.firebase.getLeadById(leadId) as any;
    if (!lead) throw new NotFoundException('Lead not found');

    const profile = lead.businessId
      ? await this.businessIntelligence.getBusinessContext(lead.businessId)
      : null;

    try {
      return await this.aiService.chat(
        `You are a WhatsApp message writer. Write in a ${profile?.brandTone || 'professional yet friendly'} tone. Keep messages concise for WhatsApp (under 200 words). Include emojis where appropriate.`,
        `Write a WhatsApp follow-up message for this lead:
Lead Name: ${lead.name}
Requirement: ${lead.requirement || 'General interest'}
Source: ${lead.source || 'Website'}
Business: ${profile?.businessName || 'Our company'}
Industry: ${profile?.industry || 'General'}
USP: ${profile?.businessUSP || ''}`,
        0.7,
        300,
        'LeadAssistantService.generateWhatsAppMessage',
      );
    } catch {
      return `Hi ${lead.name}! 👋\n\nThank you for your interest in ${profile?.businessName || 'our services'}. I noticed you were looking at ${lead.requirement || 'our offerings'}.\n\nI'd love to help you find the perfect solution. Would you have a few minutes for a quick chat?\n\nLooking forward to hearing from you! 😊`;
    }
  }

  /**
   * Generate professional email reply.
   */
  async generateEmailReply(leadId: string): Promise<string> {
    const lead = await this.firebase.getLeadById(leadId) as any;
    if (!lead) throw new NotFoundException('Lead not found');

    const profile = lead.businessId
      ? await this.businessIntelligence.getBusinessContext(lead.businessId)
      : null;

    try {
      return await this.aiService.chat(
        `You are a professional email copywriter. Write in a ${profile?.brandTone || 'professional'} tone. Include subject line, greeting, body, and sign-off. Keep under 250 words.`,
        `Write a follow-up email for this lead:
Lead Name: ${lead.name}
Email: ${lead.email}
Requirement: ${lead.requirement || 'General interest'}
Source: ${lead.source || 'Website'}
Business: ${profile?.businessName || 'Our company'}
Industry: ${profile?.industry || 'General'}
Products: ${profile?.productsServices || ''}
USP: ${profile?.businessUSP || ''}`,
        0.7,
        500,
        'LeadAssistantService.generateEmailReply',
      );
    } catch {
      return `Subject: Re: Your inquiry about ${profile?.businessName || 'our services'}\n\nDear ${lead.name},\n\nThank you for your interest in ${profile?.businessName || 'our company'}. We received your inquiry and would love to assist you.\n\n${lead.requirement ? `Regarding your interest in ${lead.requirement}, we have several options that might be perfect for you.` : 'We offer a range of solutions tailored to your needs.'}\n\nWould you be available for a brief call this week? I'd be happy to walk you through our offerings and answer any questions.\n\nBest regards,\n${profile?.businessName || 'The Team'}`;
    }
  }

  /**
   * Generate structured call script.
   */
  async generateCallScript(leadId: string): Promise<string> {
    const lead = await this.firebase.getLeadById(leadId) as any;
    if (!lead) throw new NotFoundException('Lead not found');

    const profile = lead.businessId
      ? await this.businessIntelligence.getBusinessContext(lead.businessId)
      : null;

    try {
      return await this.aiService.chat(
        `You are a sales call script writer. Create a structured call script with clear sections: Opening, Discovery Questions, Value Proposition, Handling Objections, and Close. Keep in ${profile?.brandTone || 'professional'} tone.`,
        `Create a call script for reaching out to this lead:
Lead Name: ${lead.name}
Requirement: ${lead.requirement || 'General interest'}
Source: ${lead.source || 'Website'}
Business: ${profile?.businessName || 'Our company'}
Industry: ${profile?.industry || 'General'}
Products: ${profile?.productsServices || ''}
USP: ${profile?.businessUSP || ''}
Competitors: ${profile?.competitors || ''}`,
        0.7,
        600,
        'LeadAssistantService.generateCallScript',
      );
    } catch {
      return `📞 CALL SCRIPT — ${lead.name}

🟢 OPENING:
"Hi ${lead.name}, this is [Your Name] from ${profile?.businessName || 'our company'}. I noticed you recently showed interest in ${lead.requirement || 'our services'}. Do you have a couple of minutes to chat?"

❓ DISCOVERY:
• "What prompted you to look into ${lead.requirement || 'this'}?"
• "What's your timeline for making a decision?"
• "Have you considered any other solutions?"

💎 VALUE PROPOSITION:
"What makes us different is ${profile?.businessUSP || 'our commitment to quality and customer satisfaction'}. We've helped many businesses like yours achieve their goals."

🛡️ OBJECTION HANDLING:
• Budget: "We have flexible options to fit different budgets."
• Timing: "We can start small and scale as you see results."
• Competition: "Happy to show you a comparison — we're confident in our value."

🎯 CLOSE:
"Based on what you've shared, I think we'd be a great fit. Can I schedule a detailed demo for you this week?"`;
    }
  }
}
