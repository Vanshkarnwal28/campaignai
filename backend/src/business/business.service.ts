import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { OpenRouterService } from '../openrouter/openrouter.service';

/**
 * BusinessService — Phase 1: AI Business Onboarding Chatbot.
 *
 * 14 structured onboarding fields collected via conversational AI.
 * Maintains conversation context across multiple turns.
 */
@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly integrations: IntegrationsService,
    private readonly openRouter: OpenRouterService,
  ) {}

  /** The 14 structured onboarding fields */
  private readonly onboardingFields = [
    { key: 'businessName', question: 'What is the name of your business?' },
    { key: 'businessCategory', question: 'What category does your business fall under? (e.g., E-commerce, SaaS, Restaurant, Fashion, Healthcare, Education, Real Estate, etc.)' },
    { key: 'productsServices', question: 'What products or services does your business offer?' },
    { key: 'targetAudience', question: 'Who is your ideal target audience? Describe your ideal customer.' },
    { key: 'customerAgeGroup', question: 'What is the age group of your target customers? (e.g., 18-24, 25-34, 35-44, 45-54, 55+)' },
    { key: 'genderTarget', question: 'Who do you primarily target? (Male / Female / Both)' },
    { key: 'location', question: 'What geographic locations do you serve? (City, State, Country, or Global)' },
    { key: 'businessGoals', question: 'What are your primary business goals right now? (e.g., Increase sales, Generate leads, Build brand awareness, Drive website traffic)' },
    { key: 'monthlyBudget', question: 'What is your monthly marketing budget? (in your local currency)' },
    { key: 'competitors', question: 'Who are your main competitors? List 2-3 competitor names.' },
    { key: 'brandTone', question: 'How would you describe your brand tone? (e.g., Professional, Casual, Fun, Luxury, Friendly, Bold)' },
    { key: 'postingFrequency', question: 'How often would you like to post on social media? (e.g., Daily, 3 times/week, 5 times/week, Weekly)' },
    { key: 'languages', question: 'What languages should your marketing content be in? (e.g., English, Hindi, Spanish, or multiple)' },
    { key: 'businessUSP', question: 'What is your business\'s Unique Selling Proposition (USP)? What makes you different from competitors?' },
  ];

  /** Returns the list of onboarding questions (backward compatible) */
  getQuestionsList() {
    return this.onboardingFields.map(f => f.question);
  }

  /**
   * Conversational onboarding — processes one message at a time.
   * Maintains context via onboardingConversations collection.
   */
  async chatOnboarding(businessId: string, userMessage: string) {
    const business = await this.firebase.getBusinessById(businessId);
    if (!business) throw new NotFoundException('Business workspace not found');

    // Get or create conversation state
    let convo = await this.firebase.getOnboardingConversation(businessId) as any;

    if (!convo) {
      convo = await this.firebase.createOnboardingConversation({
        businessId,
        currentFieldIndex: 0,
        collectedData: {},
        messages: JSON.stringify([]),
        completed: false,
      });
    }

    if (convo.completed) {
      return {
        conversationId: convo.id,
        reply: 'Your onboarding is already complete! Your business profile has been set up. Head to the Dashboard to start using CampaignAI.',
        completed: true,
        progress: 100,
        collectedData: convo.collectedData || {},
      };
    }

    const messages = JSON.parse(convo.messages || '[]');
    const currentIndex = convo.currentFieldIndex || 0;
    const collectedData = convo.collectedData || {};

    // Store user's answer for the current field
    if (currentIndex < this.onboardingFields.length && userMessage.trim()) {
      const currentField = this.onboardingFields[currentIndex];
      collectedData[currentField.key] = userMessage.trim();
      messages.push({ role: 'user', content: userMessage });
    }

    const nextIndex = currentIndex + 1;
    let reply = '';
    let completed = false;

    if (nextIndex >= this.onboardingFields.length) {
      // All fields collected — generate strategy and complete onboarding
      completed = true;

      // Generate AI acknowledgment
      try {
        const contextSummary = Object.entries(collectedData)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');

        reply = await this.openRouter.chat(
          'You are CampaignAI, an AI marketing assistant. The user just completed business onboarding. Summarize their business profile and express excitement about helping them succeed. Keep it concise (3-4 sentences).',
          `Business profile completed:\n${contextSummary}\n\nGenerate a brief, enthusiastic completion message.`,
          0.7,
          256,
        );
      } catch {
        reply = `Excellent! Your business profile for "${collectedData.businessName}" is now complete. I've analyzed your industry, audience, and goals. Let's start creating winning marketing campaigns!`;
      }

      if (!reply) {
        reply = `Your business profile for "${collectedData.businessName}" is complete! I'm ready to help you dominate your market. Head to the Dashboard to start creating campaigns.`;
      }

      messages.push({ role: 'model', content: reply });

      // Save profile and complete onboarding
      await this.completeOnboarding(businessId, collectedData);

      await this.firebase.updateOnboardingConversation(convo.id, {
        currentFieldIndex: nextIndex,
        collectedData,
        messages: JSON.stringify(messages),
        completed: true,
      });
    } else {
      // Ask the next question with AI personality
      const nextField = this.onboardingFields[nextIndex];

      try {
        const previousContext = Object.entries(collectedData)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');

        reply = await this.openRouter.chat(
          `You are CampaignAI, a friendly AI marketing assistant conducting business onboarding. You just received the user's answer. Briefly acknowledge their answer (1 short sentence), then smoothly transition to the next question. Do NOT repeat the exact question word for word — rephrase it naturally. The next field to ask about is: "${nextField.question}". Be warm and conversational.`,
          `Previous answers:\n${previousContext}\n\nUser just answered: "${userMessage}"\n\nAcknowledge and ask about: ${nextField.question}`,
          0.7,
          200,
        );
      } catch {
        reply = `Got it! ${nextField.question}`;
      }

      if (!reply) {
        reply = `Thanks! Now, ${nextField.question}`;
      }

      messages.push({ role: 'model', content: reply });

      await this.firebase.updateOnboardingConversation(convo.id, {
        currentFieldIndex: nextIndex,
        collectedData,
        messages: JSON.stringify(messages),
      });
    }

    const progress = Math.round((Object.keys(collectedData).length / this.onboardingFields.length) * 100);

    return {
      conversationId: convo.id,
      reply,
      completed,
      progress,
      currentField: completed ? null : this.onboardingFields[nextIndex]?.key,
      totalFields: this.onboardingFields.length,
      answeredFields: Object.keys(collectedData).length,
      collectedData,
    };
  }

  /**
   * Start a fresh onboarding conversation — returns the first question.
   */
  async startOnboarding(businessId: string) {
    const business = await this.firebase.getBusinessById(businessId);
    if (!business) throw new NotFoundException('Business workspace not found');

    // Check if already completed
    const existingConvo = await this.firebase.getOnboardingConversation(businessId) as any;
    if (existingConvo?.completed) {
      return {
        reply: 'Your onboarding is already complete! Head to the Dashboard.',
        completed: true,
        progress: 100,
      };
    }

    const firstField = this.onboardingFields[0];
    let greeting = '';

    try {
      greeting = await this.openRouter.chat(
        'You are CampaignAI, a friendly AI marketing onboarding assistant. Greet the user warmly and ask them the first onboarding question in a natural, conversational way.',
        `Generate a brief greeting (2-3 sentences) and then ask: "${firstField.question}"`,
        0.7,
        200,
      );
    } catch {
      greeting = `Welcome to CampaignAI! 🚀 I'm your AI Marketing Manager. Let me learn about your business so I can create the perfect marketing strategy. ${firstField.question}`;
    }

    if (!greeting) {
      greeting = `Welcome to CampaignAI! 🚀 Let's get your business set up. ${firstField.question}`;
    }

    // Create or reset conversation
    if (existingConvo) {
      await this.firebase.updateOnboardingConversation(existingConvo.id, {
        currentFieldIndex: 0,
        collectedData: {},
        messages: JSON.stringify([{ role: 'model', content: greeting }]),
        completed: false,
      });
    } else {
      await this.firebase.createOnboardingConversation({
        businessId,
        currentFieldIndex: 0,
        collectedData: {},
        messages: JSON.stringify([{ role: 'model', content: greeting }]),
        completed: false,
      });
    }

    return {
      reply: greeting,
      completed: false,
      progress: 0,
      currentField: firstField.key,
      totalFields: this.onboardingFields.length,
      answeredFields: 0,
    };
  }

  /** Save profile + generate strategy after all 14 fields are collected */
  private async completeOnboarding(businessId: string, data: Record<string, any>) {
    // Generate SWOT + competitor analysis
    const strategy = await this.integrations.generateBusinessStrategy(
      data.businessCategory || 'General',
      data.targetAudience || 'General Audience',
      data.brandTone || 'Friendly',
    );

    // Save full business profile to Firestore
    await this.firebase.upsertBusinessProfile(businessId, {
      businessName: data.businessName,
      businessCategory: data.businessCategory,
      industry: data.businessCategory,
      productsServices: data.productsServices,
      targetAudience: data.targetAudience,
      customerAgeGroup: data.customerAgeGroup,
      genderTarget: data.genderTarget,
      location: data.location,
      businessGoals: data.businessGoals,
      monthlyBudget: data.monthlyBudget,
      budgetLimit: parseFloat(data.monthlyBudget) || 2000,
      competitors: data.competitors,
      brandTone: data.brandTone,
      brandVoice: data.brandTone,
      postingFrequency: data.postingFrequency,
      languages: data.languages,
      businessUSP: data.businessUSP,
      onboardingAnswers: JSON.stringify(data),
      swotAnalysis: strategy.swot,
      competitorAnalysis: strategy.competitors,
      onboardingCompleted: true,
    });

    // Welcome notification
    await this.firebase.createNotification({
      businessId,
      title: 'Business Profile Complete',
      message: `Onboarding completed for ${data.businessName}! SWOT analysis and competitor profiles are now active.`,
      type: 'GENERAL',
    });

    this.logger.log(`Onboarding completed for business ${businessId}: ${data.businessName}`);
  }

  /** Backward compatible: save answers from the old form-based onboarding */
  async saveAnswersAndGenerateStrategy(
    businessId: string,
    answers: { q: string; a: string }[],
  ) {
    const business = await this.firebase.getBusinessById(businessId);
    if (!business) throw new NotFoundException('Business workspace not found');

    const industryAns = answers.find((x) => x.q.toLowerCase().includes('industry'))?.a || 'General Retail';
    const audienceAns = answers.find((x) => x.q.toLowerCase().includes('customer profile'))?.a || 'General Audience';
    const voiceAns = answers.find((x) => x.q.toLowerCase().includes('tone'))?.a || 'Friendly';
    const budgetAns = parseFloat(answers.find((x) => x.q.toLowerCase().includes('budget'))?.a || '2000') || 2000;

    const strategy = await this.integrations.generateBusinessStrategy(industryAns, audienceAns, voiceAns);

    const profile = await this.firebase.upsertBusinessProfile(businessId, {
      industry: industryAns,
      targetAudience: audienceAns,
      brandVoice: voiceAns,
      budgetLimit: budgetAns,
      onboardingAnswers: JSON.stringify(answers),
      swotAnalysis: strategy.swot,
      competitorAnalysis: strategy.competitors,
    });

    await this.firebase.createNotification({
      businessId,
      title: 'Business Strategy Generated',
      message: `Onboarding completed! SWOT and competitor profiles are now active for ${business.name}.`,
      type: 'GENERAL',
    });

    return profile;
  }

  async getProfile(businessId: string) {
    const profile = await this.firebase.getBusinessProfile(businessId);
    if (!profile) throw new NotFoundException('Business profile onboarding not completed');
    return profile;
  }
}
