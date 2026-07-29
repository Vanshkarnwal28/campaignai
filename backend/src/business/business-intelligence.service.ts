import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { AiService } from '../ai/ai.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BusinessBlueprintData {
  executiveSummary: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  idealCustomerPersona: {
    summary: string;
    ageGroup: string;
    gender: string;
    interests: string[];
    painPoints: string[];
    buyingTriggers: string[];
  };
  customerPainPoints: string[];
  buyingTriggers: string[];
  marketingStrategy: string;
  recommendedChannels: string[];
  contentPillars: string[];
  campaignStrategy: {
    objective: string;
    primaryChannel: string;
    messagingHook: string;
  };
  suggestedAdStrategy: {
    budgetAllocation: string;
    targetAudienceSpecs: string;
    creativeFormat: string;
    cta: string;
  };
  brandVoice: {
    tone: string;
    messagingStyle: string;
    doAndDonts: string;
  };
}

export interface BusinessBlueprintRecord {
  id: string;
  businessId: string;
  version: string;
  versionNumber: number;
  generatedAt: string;
  regeneratedAt?: string;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  isActive: boolean;
  blueprint: BusinessBlueprintData;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * BusinessIntelligenceService
 *
 * Single-responsibility service for:
 *  - Business Blueprint generation (AI + quality validation + retry + fallback)
 *  - Blueprint versioning, approval, and history
 *  - Unified BusinessContext object (single source of truth)
 *
 * All downstream services (ContentService, CampaignsService, LeadAssistantService,
 * AssistantService) consume getBusinessContext() from this service.
 */
@Injectable()
export class BusinessIntelligenceService {
  private readonly logger = new Logger(BusinessIntelligenceService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly aiService: AiService,
  ) {}

  // ─── Blueprint Quality Validation ─────────────────────────────────────────

  /**
   * Verifies that every required section of the blueprint exists and is non-empty.
   */
  private validateBlueprintQuality(bp: any): boolean {
    if (!bp) return false;
    if (!bp.executiveSummary || bp.executiveSummary.length < 10) return false;
    if (!bp.swot || !bp.swot.strengths?.length || !bp.swot.weaknesses?.length) return false;
    if (!bp.idealCustomerPersona || !bp.idealCustomerPersona.summary) return false;
    if (!bp.customerPainPoints || !bp.customerPainPoints.length) return false;
    if (!bp.buyingTriggers || !bp.buyingTriggers.length) return false;
    if (!bp.marketingStrategy || bp.marketingStrategy.length < 10) return false;
    if (!bp.recommendedChannels || !bp.recommendedChannels.length) return false;
    if (!bp.contentPillars || !bp.contentPillars.length) return false;
    if (!bp.campaignStrategy || !bp.campaignStrategy.objective) return false;
    if (!bp.suggestedAdStrategy || !bp.suggestedAdStrategy.budgetAllocation) return false;
    if (!bp.brandVoice || !bp.brandVoice.tone) return false;
    return true;
  }

  // ─── Blueprint Generation ─────────────────────────────────────────────────

  /**
   * Generates a structured Business Blueprint using AI.
   * Applies quality validation, single retry, and intelligent fallback.
   * Saves the result to Firestore with versioning.
   */
  async generateBusinessBlueprint(businessId: string): Promise<BusinessBlueprintRecord> {
    this.logger.log(`Generating Business Blueprint for business: ${businessId}`);

    const profile = await this.firebase.getBusinessProfile(businessId);
    if (!profile) {
      throw new NotFoundException(`Business profile for ${businessId} not found`);
    }

    const ctx = {
      businessName: profile.businessName || 'Business Workspace',
      category: profile.businessCategory || profile.industry || 'General Business',
      productsServices: profile.productsServices || 'Products and services',
      targetAudience: profile.targetAudience || 'General Audience',
      customerAgeGroup: profile.customerAgeGroup || 'All Ages',
      genderTarget: profile.genderTarget || 'Both',
      location: profile.location || 'Global',
      businessGoals: profile.businessGoals || 'Growth and Brand Awareness',
      monthlyBudget: profile.monthlyBudget || profile.budgetLimit || '2000',
      competitors: profile.competitors || 'Market Competitors',
      brandTone: profile.brandTone || profile.brandVoice || 'Professional',
      postingFrequency: profile.postingFrequency || '3-5 times/week',
      languages: profile.languages || 'English',
      businessUSP: profile.businessUSP || 'High quality products and exceptional customer service',
    };

    const systemPrompt = `You are the Business Intelligence Service for CampaignAI, a world-class AI Chief Marketing Officer (CMO).
Generate a comprehensive, highly actionable 11-part Business Blueprint for the given business.
Return ONLY valid JSON matching this exact structure (no markdown, no code fences):
{
  "executiveSummary": "Concise executive overview of the business positioning and growth potential.",
  "swot": {
    "strengths": ["...", "...", "..."],
    "weaknesses": ["...", "...", "..."],
    "opportunities": ["...", "...", "..."],
    "threats": ["...", "...", "..."]
  },
  "idealCustomerPersona": {
    "summary": "Detailed description of the primary ideal customer persona.",
    "ageGroup": "...",
    "gender": "...",
    "interests": ["...", "..."],
    "painPoints": ["...", "..."],
    "buyingTriggers": ["...", "..."]
  },
  "customerPainPoints": ["...", "...", "..."],
  "buyingTriggers": ["...", "...", "..."],
  "marketingStrategy": "Comprehensive digital marketing and growth strategy.",
  "recommendedChannels": ["Meta Ads (Instagram/Facebook)", "WhatsApp Marketing", "..."],
  "contentPillars": ["...", "...", "...", "..."],
  "campaignStrategy": {
    "objective": "Primary ad campaign objective",
    "primaryChannel": "Main advertising channel",
    "messagingHook": "Core messaging hook/headline style"
  },
  "suggestedAdStrategy": {
    "budgetAllocation": "Suggested monthly/daily breakdown",
    "targetAudienceSpecs": "Detailed Meta ad targeting criteria",
    "creativeFormat": "Recommended creative formats (Single Image, Reel/Video, Carousel)",
    "cta": "Recommended Call-To-Action"
  },
  "brandVoice": {
    "tone": "Descriptive tone",
    "messagingStyle": "Style guidelines",
    "doAndDonts": "Key messaging dos and don'ts"
  }
}`;

    const userPrompt = `Business Data:\n${JSON.stringify(ctx, null, 2)}`;

    let blueprintResult: BusinessBlueprintData | null = null;

    // First AI Attempt
    try {
      blueprintResult = await this.aiService.chatJson<BusinessBlueprintData>(
        systemPrompt,
        userPrompt,
        0.7,
        2500,
        'BusinessIntelligenceService',
      );
    } catch (err: any) {
      this.logger.warn(`Blueprint generation attempt 1 failed: ${err.message}`);
    }

    // AI Quality Check & Single Retry
    if (!this.validateBlueprintQuality(blueprintResult)) {
      this.logger.warn('Blueprint attempt 1 produced incomplete quality. Retrying once...');
      try {
        blueprintResult = await this.aiService.chatJson<BusinessBlueprintData>(
          systemPrompt + '\nIMPORTANT: Ensure EVERY section is detailed and non-empty.',
          userPrompt,
          0.6,
          2500,
          'BusinessIntelligenceService.retry',
        );
      } catch (err: any) {
        this.logger.warn(`Blueprint generation attempt 2 failed: ${err.message}`);
      }
    }

    // Intelligent Fallback if AI generation fails or stays incomplete
    if (!this.validateBlueprintQuality(blueprintResult)) {
      this.logger.warn('Using intelligent fallback for Business Blueprint due to AI response limits.');
      blueprintResult = {
        executiveSummary: `${ctx.businessName} is a promising business in the ${ctx.category} sector offering ${ctx.productsServices}. With a USP focused on "${ctx.businessUSP}", the business is primed for digital growth.`,
        swot: {
          strengths: [`Strong USP: ${ctx.businessUSP}`, `Targeted brand positioning (${ctx.brandTone})`, 'Clear product offerings'],
          weaknesses: ['Organic reach scalability', 'Initial market penetration curve'],
          opportunities: [`Hyper-targeted campaigns for ${ctx.targetAudience}`, 'Multi-channel digital marketing', 'Automated customer retargeting'],
          threats: ['Rising advertising cost-per-click', 'Competitor market pressure'],
        },
        idealCustomerPersona: {
          summary: `Primary ideal customer targeting ${ctx.genderTarget} aged ${ctx.customerAgeGroup} in ${ctx.location}.`,
          ageGroup: ctx.customerAgeGroup,
          gender: ctx.genderTarget,
          interests: [ctx.category, 'Quality products', 'Value for money'],
          painPoints: ['Finding reliable providers', 'Inconsistent quality in market'],
          buyingTriggers: ['Special launch offers', 'Social proof & reviews', 'Direct WhatsApp support'],
        },
        customerPainPoints: ['Finding reliable solutions in this category', 'Desire for superior quality and service', 'Transparent pricing'],
        buyingTriggers: ['Clear value proposition', 'Limited-time promotional discounts', 'Instant customer support'],
        marketingStrategy: `Build brand authority and drive direct conversion using a funnel strategy. Leverage Meta Ads for targeted customer acquisition, backed by consistent social proof and structured posting ${ctx.postingFrequency}.`,
        recommendedChannels: ['Meta Ads (Instagram & Facebook)', 'WhatsApp Business Integration', 'Organic Social Media'],
        contentPillars: ['Product Highlights & Feature Showcases', 'Customer Reviews & Social Proof', 'Behind-The-Scenes & Brand Values', 'Promotional Offers & Quick Calls-To-Action'],
        campaignStrategy: {
          objective: 'Lead Generation & Conversions',
          primaryChannel: 'Instagram & Facebook Ads',
          messagingHook: `Discover why ${ctx.businessName} is the top choice for ${ctx.category}!`,
        },
        suggestedAdStrategy: {
          budgetAllocation: `Suggested allocation of ${ctx.monthlyBudget} / month: 70% Direct Conversions, 30% Retargeting & Brand Awareness.`,
          targetAudienceSpecs: `Location: ${ctx.location}, Age: ${ctx.customerAgeGroup}, Gender: ${ctx.genderTarget}`,
          creativeFormat: 'Video Reels & High-Converting Single Image Ads',
          cta: 'Shop Now / Contact Us',
        },
        brandVoice: {
          tone: ctx.brandTone,
          messagingStyle: `Clear, engaging, and aligned with ${ctx.languages} audience preferences.`,
          doAndDonts: "DO highlight USP & customer value. DON'T make unsubstantiated claims.",
        },
      };
    }

    // Determine version number
    const existingBlueprints = await this.getBlueprintHistory(businessId);
    const versionNumber = existingBlueprints.length + 1;
    const versionStr = `v${versionNumber}`;
    const nowStr = new Date().toISOString();

    const blueprintRecord: Omit<BusinessBlueprintRecord, 'id'> = {
      businessId,
      version: versionStr,
      versionNumber,
      generatedAt: nowStr,
      approved: false,
      isActive: false,
      blueprint: blueprintResult!,
    };

    const createdDoc = await this.firebase.createDocument('businessBlueprints', blueprintRecord);
    const finalRecord: BusinessBlueprintRecord = { id: createdDoc.id, ...blueprintRecord };

    // Update profile reference to pending blueprint
    await this.firebase.upsertBusinessProfile(businessId, {
      latestBlueprintId: createdDoc.id,
      latestBlueprintVersion: versionStr,
      blueprintApproved: false,
    });

    this.logger.log(`Business Blueprint ${versionStr} created successfully for ${businessId}`);
    return finalRecord;
  }

  // ─── Blueprint History & Retrieval ────────────────────────────────────────

  /**
   * Retrieves all blueprint versions for a business (sorted newest first).
   */
  async getBlueprintHistory(businessId: string): Promise<BusinessBlueprintRecord[]> {
    const snap = await this.firebase.col('businessBlueprints')
      .where('businessId', '==', businessId)
      .get();

    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BusinessBlueprintRecord));
    return docs.sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
  }

  /**
   * Fetches the currently active / approved Business Blueprint.
   * Priority: isActive → approved → most recent.
   */
  async getActiveBlueprint(businessId: string): Promise<BusinessBlueprintRecord | null> {
    const history = await this.getBlueprintHistory(businessId);
    if (!history.length) return null;
    return history.find((bp) => bp.isActive) || history.find((bp) => bp.approved) || history[0];
  }

  // ─── Blueprint Approval ───────────────────────────────────────────────────

  /**
   * Approves a blueprint version, marks it as active, and updates the business profile.
   */
  async approveBlueprint(
    businessId: string,
    blueprintId?: string,
    userIdentifier = 'Owner',
  ): Promise<BusinessBlueprintRecord> {
    const history = await this.getBlueprintHistory(businessId);
    if (!history.length) {
      throw new NotFoundException(`No blueprints found for business ${businessId}`);
    }

    const target = blueprintId ? history.find((bp) => bp.id === blueprintId) : history[0];
    if (!target) {
      throw new NotFoundException(`Blueprint ${blueprintId} not found for business ${businessId}`);
    }

    const nowStr = new Date().toISOString();

    // Deactivate all other blueprints
    for (const bp of history) {
      await this.firebase.updateDocument('businessBlueprints', bp.id, {
        isActive: bp.id === target.id,
        approved: bp.id === target.id ? true : bp.approved,
      });
    }

    // Mark the target as approved & active
    await this.firebase.updateDocument('businessBlueprints', target.id, {
      approved: true,
      isActive: true,
      approvedAt: nowStr,
      approvedBy: userIdentifier,
    });

    // Sync approval state to business profile & business record
    await this.firebase.upsertBusinessProfile(businessId, {
      activeBlueprintId: target.id,
      activeBlueprintVersion: target.version,
      blueprintApproved: true,
      onboardingCompleted: true,
      swotAnalysis: target.blueprint.swot,
    });

    await this.firebase.updateBusiness(businessId, {
      onboardingCompleted: true,
      blueprintApproved: true,
      updatedAt: new Date(),
    });

    this.logger.log(`Blueprint ${target.version} approved for business ${businessId}`);
    return { ...target, approved: true, isActive: true, approvedAt: nowStr, approvedBy: userIdentifier };
  }

  /**
   * Regenerates the Business Blueprint (creates a new version).
   */
  async regenerateBlueprint(businessId: string): Promise<BusinessBlueprintRecord> {
    this.logger.log(`Regenerating Business Blueprint for business: ${businessId}`);
    return this.generateBusinessBlueprint(businessId);
  }

  // ─── Business Context (Single Source of Truth) ────────────────────────────

  /**
   * Returns the complete, unified BusinessContext object.
   * This is the single source of truth consumed by all downstream AI services.
   */
  async getBusinessContext(businessId: string) {
    const profile = await this.firebase.getBusinessProfile(businessId);
    if (!profile) {
      throw new NotFoundException(`Business profile for ${businessId} not found`);
    }

    const activeBlueprintRecord = await this.getActiveBlueprint(businessId);
    const bp = activeBlueprintRecord?.blueprint;

    let rawAnswers: Record<string, any> = {};
    try {
      rawAnswers = profile.onboardingAnswers ? JSON.parse(profile.onboardingAnswers) : {};
    } catch {
      rawAnswers = {};
    }

    return {
      businessId,
      businessName: profile.businessName || '',
      industry: profile.industry || profile.businessCategory || '',
      businessCategory: profile.businessCategory || profile.industry || '',
      productsServices: profile.productsServices || '',
      targetAudience: profile.targetAudience || '',
      customerAgeGroup: profile.customerAgeGroup || '',
      genderTarget: profile.genderTarget || '',
      location: profile.location || '',
      businessGoals: profile.businessGoals || '',
      monthlyBudget: profile.monthlyBudget || profile.budgetLimit || '2000',
      budgetLimit: parseFloat(profile.monthlyBudget) || profile.budgetLimit || 2000,
      competitors: profile.competitors || '',
      brandTone: profile.brandTone || profile.brandVoice || '',
      brandVoice: profile.brandTone || profile.brandVoice || '',
      brandColors: profile.brandColors || ['#4F46E5', '#7C3AED'],
      brandVisualTheme: profile.brandVisualTheme || 'Modern Minimalist',
      postingFrequency: profile.postingFrequency || '',
      languages: profile.languages || 'English',
      businessUSP: profile.businessUSP || '',

      // Raw onboarding input
      onboardingAnswers: rawAnswers,

      // AI-generated Blueprint sections
      executiveSummary: bp?.executiveSummary || `${profile.businessName || 'Business'} in ${profile.businessCategory || 'Retail'}`,
      swotAnalysis: bp?.swot || profile.swotAnalysis || { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      idealCustomerPersona: bp?.idealCustomerPersona || { summary: profile.targetAudience, ageGroup: profile.customerAgeGroup, gender: profile.genderTarget },
      customerPainPoints: bp?.customerPainPoints || [],
      buyingTriggers: bp?.buyingTriggers || [],
      marketingStrategy: bp?.marketingStrategy || '',
      recommendedChannels: bp?.recommendedChannels || ['Meta Ads', 'Social Media'],
      contentPillars: bp?.contentPillars || ['Promotional', 'Educational', 'Testimonials'],
      campaignStrategy: bp?.campaignStrategy || { objective: 'Conversions', primaryChannel: 'Meta Ads', messagingHook: '' },
      suggestedAdStrategy: bp?.suggestedAdStrategy || { budgetAllocation: '', targetAudienceSpecs: '', creativeFormat: '', cta: '' },

      // Blueprint metadata
      blueprintVersion: activeBlueprintRecord?.version || 'v1',
      blueprintApproved: profile.blueprintApproved || activeBlueprintRecord?.approved || false,
      blueprintApprovedAt: activeBlueprintRecord?.approvedAt || null,
    };
  }
}
