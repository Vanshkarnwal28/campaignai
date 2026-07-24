import { Controller, Get, Post, Body, Param, Request, Query, UseGuards } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Get('conversations/:businessId')
  async getConversations(@Request() req: any, @Param('businessId') businessId: string) {
    return this.assistantService.getConversations(req.user.id, businessId);
  }

  @Get('conversations/:id/details')
  async getDetails(@Param('id') id: string) {
    return this.assistantService.getConversationDetails(id);
  }

  @Post('chat/:businessId')
  async sendMessage(
    @Request() req: any,
    @Param('businessId') businessId: string,
    @Body() body: { message: string; conversationId?: string },
  ) {
    return this.assistantService.sendMessage(
      req.user.id,
      businessId,
      body.message,
      body.conversationId,
    );
  }
}
