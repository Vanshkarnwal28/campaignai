import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiAdCampaignService, GenerateAdCampaignDto, GenerateContentDto } from './ai-ad-campaign.service';

@Controller('api/ai')
export class ApiAiAdCampaignController {
  constructor(private readonly aiAdCampaignService: AiAdCampaignService) {}

  @Post('generate-ad-campaign')
  async generateAdCampaign(@Body() body: GenerateAdCampaignDto) {
    try {
      return await this.aiAdCampaignService.generateAdCampaign(body);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to generate ad campaign strategy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-content')
  async generateContent(@Body() body: GenerateContentDto) {
    try {
      const result = await this.aiAdCampaignService.generateContent({
        niche: body.niche || 'General Niche',
        targetAudience: body.targetAudience || 'General Audience',
        brandTone: body.brandTone || 'Professional & Engaging',
        currentOffer: body.currentOffer || 'Special Promotion',
        workspaceId: body.workspaceId,
        businessId: body.businessId,
      });
      return { success: true, data: result };
    } catch (error: any) {
      throw new HttpException(error.message || 'Failed to generate content', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

@Controller('ai')
export class AiAdCampaignController {
  constructor(private readonly aiAdCampaignService: AiAdCampaignService) {}

  @Post('generate-ad-campaign')
  async generateAdCampaign(@Body() body: GenerateAdCampaignDto) {
    try {
      return await this.aiAdCampaignService.generateAdCampaign(body);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to generate ad campaign strategy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-content')
  async generateContent(@Body() body: GenerateContentDto) {
    try {
      const result = await this.aiAdCampaignService.generateContent({
        niche: body.niche || 'General Niche',
        targetAudience: body.targetAudience || 'General Audience',
        brandTone: body.brandTone || 'Professional & Engaging',
        currentOffer: body.currentOffer || 'Special Promotion',
        workspaceId: body.workspaceId,
        businessId: body.businessId,
      });
      return { success: true, data: result };
    } catch (error: any) {
      throw new HttpException(error.message || 'Failed to generate content', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
