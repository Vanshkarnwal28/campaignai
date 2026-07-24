import { Controller, Get, Post, Body, Param, Put, Request, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  async createTicket(@Request() req: any, @Body() body: { subject: string; description: string }) {
    return this.supportService.createTicket(req.user.id, body.subject, body.description);
  }

  @Get('tickets')
  async getTickets(@Request() req: any) {
    return this.supportService.getTickets(req.user.id);
  }

  @Get('notifications/:businessId')
  async getNotifications(@Param('businessId') businessId: string) {
    return this.supportService.getNotifications(businessId);
  }

  @Put('notifications/:id/read')
  async markRead(@Param('id') id: string) {
    return this.supportService.markAsRead(id);
  }

  @Get('audit-logs')
  async getLogs(@Request() req: any) {
    return this.supportService.getAuditLogs(req.user.id);
  }
}
