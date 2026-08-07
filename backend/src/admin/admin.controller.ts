import { Controller, Get, Put, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.adminService.getPlatformStats(req.user);
  }

  @Get('users')
  async getUsers(@Request() req: any) {
    return this.adminService.getUsers(req.user);
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.updateUserRole(req.user, id, body.role);
  }

  @Get('businesses')
  async getBusinesses(@Request() req: any) {
    return this.adminService.getBusinesses(req.user);
  }

  @Put('businesses/:id/profile')
  async updateBusinessProfile(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.adminService.updateBusinessProfile(req.user, id, body);
  }

  @Post('businesses/:id/seo-audit')
  async runSeoAudit(@Request() req: any, @Param('id') id: string, @Body() body: { url: string }) {
    return this.adminService.runSeoAudit(req.user, id, body?.url);
  }

  @Get('businesses/:id/seo-profile')
  async getSeoProfile(@Request() req: any, @Param('id') id: string) {
    return this.adminService.getSeoProfile(req.user, id);
  }

  @Put('businesses/:id/seo-profile')
  async updateSeoProfile(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.adminService.updateSeoProfile(req.user, id, body);
  }

  @Post('businesses/:id/invoice/send')
  async sendInvoiceEmail(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { invoiceId?: string },
  ) {
    return this.adminService.sendInvoiceEmail(req.user, id, body?.invoiceId);
  }

  @Put('businesses/:id/subscription')
  async updateSubscription(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { plan: string },
  ) {
    return this.adminService.updateSubscription(req.user, id, body.plan);
  }

  @Get('campaigns')
  async getCampaigns(@Request() req: any) {
    return this.adminService.getAllCampaigns(req.user);
  }

  @Put('campaigns/:id/status')
  async updateCampaignStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.adminService.updateCampaignStatus(req.user, id, body.status);
  }

  @Get('subscriptions')
  async getSubscriptions(@Request() req: any) {
    return this.adminService.getAllSubscriptions(req.user);
  }

  @Get('payments')
  async getPayments(@Request() req: any) {
    return this.adminService.getAllPayments(req.user);
  }

  @Get('tickets')
  async getTickets(@Request() req: any) {
    return this.adminService.getAllTickets(req.user);
  }

  @Put('tickets/:id/status')
  async updateTicketStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.adminService.updateTicketStatus(req.user, id, body.status);
  }

  @Get('prompts')
  async getPrompts(@Request() req: any) {
    return this.adminService.getSystemPrompts(req.user);
  }

  @Put('prompts/:key')
  async updatePrompt(
    @Request() req: any,
    @Param('key') key: string,
    @Body() body: { template: string },
  ) {
    return this.adminService.updateSystemPrompt(req.user, key, body.template);
  }

  @Post('broadcast')
  async sendBroadcast(
    @Request() req: any,
    @Body() body: { title: string; message: string },
  ) {
    return this.adminService.sendBroadcastNotification(req.user, body.title, body.message);
  }

  @Get('audit-logs')
  async getAuditLogs(@Request() req: any) {
    return this.adminService.getAllAuditLogs(req.user);
  }

  @Get('settings')
  async getSettings(@Request() req: any) {
    return this.adminService.getPlatformSettings(req.user);
  }

  @Put('settings')
  async updateSettings(
    @Request() req: any,
    @Body() body: any,
  ) {
    return this.adminService.updatePlatformSettings(req.user, body);
  }

  @Post('impersonate/:businessId')
  async impersonateClient(@Request() req: any, @Param('businessId') businessId: string) {
    return this.adminService.impersonateClient(req.user, businessId);
  }
}
