import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('onboarding/questions')
  getQuestions(@Query('lang') lang?: string) {
    return this.businessService.getQuestionsList(lang);
  }

  /** Phase 1: Start a new onboarding conversation — returns first AI greeting */
  @Post(':id/onboarding/start')
  async startOnboarding(@Param('id') id: string) {
    return this.businessService.startOnboarding(id);
  }

  /** Phase 1: Send a chat message during onboarding — returns AI response + next question */
  @Post(':id/onboarding/chat')
  async chatOnboarding(
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.businessService.chatOnboarding(id, body.message);
  }

  /** Legacy: Submit all answers at once (backward compatible) */
  @Post(':id/onboarding/submit')
  async submitAnswers(@Param('id') id: string, @Body() body: { answers: { q: string; a: string }[] }) {
    return this.businessService.saveAnswersAndGenerateStrategy(id, body.answers);
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
