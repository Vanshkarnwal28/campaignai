import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('onboarding/questions')
  getQuestions() {
    return this.businessService.getQuestionsList();
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
}
