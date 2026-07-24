import { Controller, Get, Post, Body, Param, Put, Query, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get(':businessId')
  async getCampaigns(@Param('businessId') businessId: string) {
    return this.campaignsService.getCampaigns(businessId);
  }

  @Post(':businessId/build')
  async buildCampaign(
    @Param('businessId') businessId: string,
    @Body() body: {
      name: string;
      objective: string;
      dailyBudget: number;
      creativePrompt: string;
      targetAgeMin: number;
      targetAgeMax: number;
      targetLocation: string;
    },
  ) {
    return this.campaignsService.buildAiCampaignWizard(businessId, body);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.campaignsService.updateCampaignStatus(id, body.status);
  }

  @Get(':businessId/analytics/summary')
  async getSummary(@Param('businessId') businessId: string, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.campaignsService.getAnalyticsSummary(businessId, daysNum);
  }

  @Get(':businessId/analytics/daily')
  async getDaily(@Param('businessId') businessId: string, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.campaignsService.getDailyAnalytics(businessId, daysNum);
  }

  @Get(':businessId/optimizations')
  async getOptimizations(@Param('businessId') businessId: string) {
    return this.campaignsService.getOptimizationHistory(businessId);
  }

  @Get(':businessId/recommendations')
  async getRecommendations(@Param('businessId') businessId: string) {
    return this.campaignsService.getAiRecommendations(businessId);
  }

  /** Phase 5: AI-driven full campaign creation */
  @Post(':businessId/ai-generate')
  async aiGenerateCampaign(@Param('businessId') businessId: string) {
    return this.campaignsService.generateFullCampaign(businessId);
  }

  // -------------------------------------------------------------
  // Campaign Drafts & AI Strategy Generator
  // -------------------------------------------------------------
  @Post(':businessId/draft')
  async createDraft(
    @Param('businessId') businessId: string,
    @Body() body: {
      name: string;
      objective: string;
      dailyBudget: number;
      businessName?: string;
      website?: string;
      industry?: string;
      product?: string;
      targetCountry?: string;
      goal?: string;
      festivalTheme?: string;
    },
  ) {
    return this.campaignsService.createDraft(businessId, body);
  }

  @Get(':businessId/drafts')
  async getDraftsList(@Param('businessId') businessId: string) {
    return this.campaignsService.getDrafts(businessId);
  }

  @Get(':businessId/draft/:id')
  async getDraftDetail(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.getDraft(id);
  }

  @Post(':businessId/draft/:id/generate')
  async generateDraftCopy(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.generateDraftStrategy(id);
  }

  @Post(':businessId/draft/:id/publish')
  async publishDraftToMeta(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.publishDraft(businessId, id);
  }

  // -------------------------------------------------------------
  // Optimization Center
  // -------------------------------------------------------------
  @Get(':businessId/optimization-center')
  async getCenterData(@Param('businessId') businessId: string) {
    return this.campaignsService.getOptimizationCenter(businessId);
  }

  @Post(':businessId/optimization-center/toggle')
  async toggleAutoOptimizationSetting(
    @Param('businessId') businessId: string,
    @Body() body: { autoOptimize: boolean },
  ) {
    return this.campaignsService.toggleAutoOptimization(businessId, body.autoOptimize);
  }

  @Post(':businessId/recommendation/:id/apply')
  async applyRecommendationAction(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.applyRecommendation(businessId, id);
  }
}
