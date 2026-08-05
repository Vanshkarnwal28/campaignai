import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly businessIntelligence: BusinessIntelligenceService,
  ) {}

  @Get('onboarding/questions')
  getQuestions(@Query('lang') lang?: string) {
    return this.businessService.getQuestionsList(lang);
  }

  /** Direct 10-Question Onboarding submission endpoint (/api/business/onboarding) */
  @Post('onboarding')
  async submitOnboardingDirect(@Body() body: any) {
    const businessId = body.businessId || body.workspaceId || body.id || 'default_business';
    return this.businessService.saveStructuredOnboarding(businessId, body);
  }

  /** Start or resume an onboarding conversation */
  @Post(':id/onboarding/start')
  async startOnboarding(@Param('id') id: string) {
    return this.businessService.startOnboarding(id);
  }

  /** Send a chat message during onboarding */
  @Post(':id/onboarding/chat')
  async chatOnboarding(
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.businessService.chatOnboarding(id, body.message);
  }

  /** Submit all 10 onboarding answers for a specific business ID */
  @Post(':id/onboarding')
  async submitOnboardingForId(@Param('id') id: string, @Body() body: any) {
    return this.businessService.saveStructuredOnboarding(id, body);
  }

  /** Submit answers at once (backward compatible) */
  @Post(':id/onboarding/submit')
  async submitAnswers(@Param('id') id: string, @Body() body: { answers: { q: string; a: string }[] }) {
    return this.businessService.saveAnswersAndGenerateStrategy(id, body.answers);
  }

  // ─── Business Intelligence Endpoints ────────────────────────────────────────

  /** Fetch complete unified Business Context */
  @Get(':id/context')
  async getBusinessContext(@Param('id') id: string) {
    return this.businessIntelligence.getBusinessContext(id);
  }

  /** Get active Business Blueprint & version history */
  @Get(':id/blueprint')
  async getBlueprint(@Param('id') id: string) {
    const active = await this.businessIntelligence.getActiveBlueprint(id);
    const history = await this.businessIntelligence.getBlueprintHistory(id);
    return { active, history };
  }

  /** Approve Business Blueprint to unlock Performance Dashboard */
  @Post(':id/blueprint/approve')
  async approveBlueprint(@Param('id') id: string, @Body() body?: { blueprintId?: string }) {
    return this.businessIntelligence.approveBlueprint(id, body?.blueprintId);
  }

  /** Regenerate Business Blueprint (creates new version v2, v3...) */
  @Post(':id/blueprint/regenerate')
  async regenerateBlueprint(@Param('id') id: string) {
    return this.businessIntelligence.regenerateBlueprint(id);
  }

  @Get(':id/profile')
  async getProfile(@Param('id') id: string) {
    return this.businessService.getProfile(id);
  }

  @Get(':id/profile-details')
  async getProfileDetails(@Param('id') id: string) {
    return this.businessService.getProfileDetails(id);
  }

  @Post(':id/profile')
  async updateProfile(@Param('id') id: string, @Body() body: any) {
    return this.businessService.updateProfile(id, body);
  }

  @Post(':id/subscription/upgrade')
  async upgradePlan(@Param('id') id: string, @Body() body: { plan: string }) {
    return this.businessService.upgradePlan(id, body.plan);
  }

  @Post(':id/subscription/renew')
  async renewSubscription(@Param('id') id: string) {
    return this.businessService.renewSubscription(id);
  }

  @Post(':id/subscription/cancel')
  async cancelSubscription(@Param('id') id: string) {
    return this.businessService.cancelSubscription(id);
  }
}
