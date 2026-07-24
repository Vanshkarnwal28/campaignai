import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { LeadsService } from './leads.service';
import { LeadAssistantService } from './lead-assistant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly leadAssistant: LeadAssistantService,
  ) {}

  /** POST /leads/capture — capture a new lead */
  @Post('capture')
  async captureLead(
    @Body()
    body: {
      businessId: string;
      email: string;
      name: string;
      phone?: string;
      source?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.leadsService.captureLead(
      body.businessId,
      body.email,
      body.name,
      body.phone,
      body.source,
      body.metadata,
    );
  }

  /** GET /leads?businessId=xxx — list all leads for a business */
  @Get()
  async getLeads(@Query('businessId') businessId: string) {
    return this.leadsService.getLeads(businessId);
  }

  /** GET /leads/stats?businessId=xxx — lead statistics */
  @Get('stats')
  async getStats(@Query('businessId') businessId: string) {
    return this.leadsService.getLeadStats(businessId);
  }

  /** GET /leads/search?businessId=xxx&q=xxx — search leads */
  @Get('search')
  async searchLeads(
    @Query('businessId') businessId: string,
    @Query('q') query: string,
  ) {
    return this.leadsService.searchLeads(businessId, query || '');
  }

  /** GET /leads/filter?businessId=xxx&status=NEW&... — filter leads */
  @Get('filter')
  async filterLeads(
    @Query('businessId') businessId: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaign') campaign?: string,
  ) {
    return this.leadsService.filterLeads(businessId, { status, source, startDate, endDate, campaign });
  }

  /** GET /leads/export/csv?businessId=xxx — export leads as CSV */
  @Get('export/csv')
  async exportCsv(
    @Query('businessId') businessId: string,
    @Res() res: Response,
  ) {
    const result = await this.leadsService.exportCsv(businessId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_${businessId}_${Date.now()}.csv`);
    res.send(result.csv);
  }

  /** GET /leads/:id — get a single lead */
  @Get(':id')
  async getLeadById(@Param('id') id: string) {
    return this.leadsService.getLeadById(id);
  }

  /** PATCH /leads/:id — update lead status or notes */
  @Patch(':id')
  async updateLead(
    @Param('id') id: string,
    @Body() body: { status?: string; notes?: string; [key: string]: any },
  ) {
    return this.leadsService.updateLead(id, body);
  }

  /** PATCH /leads/:id/assign — assign lead to team member */
  @Patch(':id/assign')
  async assignLead(
    @Param('id') id: string,
    @Body() body: { assignedTo: string },
  ) {
    return this.leadsService.assignLead(id, body.assignedTo);
  }

  /** POST /leads/:id/notes — add a note to a lead */
  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
    @Body() body: { note: string; author: string },
  ) {
    return this.leadsService.addNote(id, body.note, body.author);
  }

  // ─── Phase 7: AI Lead Assistant ─────────────────────────────────────────────

  /** GET /leads/:id/ai-assist — get full AI analysis for a lead */
  @Get(':id/ai-assist')
  async getAiAssist(@Param('id') id: string) {
    return this.leadAssistant.getFullAssist(id);
  }

  /** POST /leads/:id/ai-assist/whatsapp — generate WhatsApp message */
  @Post(':id/ai-assist/whatsapp')
  async generateWhatsApp(@Param('id') id: string) {
    const message = await this.leadAssistant.generateWhatsAppMessage(id);
    return { message };
  }

  /** POST /leads/:id/ai-assist/email — generate email reply */
  @Post(':id/ai-assist/email')
  async generateEmail(@Param('id') id: string) {
    const message = await this.leadAssistant.generateEmailReply(id);
    return { message };
  }

  /** POST /leads/:id/ai-assist/call-script — generate call script */
  @Post(':id/ai-assist/call-script')
  async generateCallScript(@Param('id') id: string) {
    const script = await this.leadAssistant.generateCallScript(id);
    return { script };
  }
}
