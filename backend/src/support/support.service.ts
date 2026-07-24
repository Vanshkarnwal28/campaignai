import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class SupportService {
  constructor(private readonly firebase: FirebaseService) {}

  async createTicket(userId: string, subject: string, description: string) {
    const ticket = await this.firebase.createSupportTicket({
      userId,
      subject,
      description,
    });

    await this.logAction(userId, 'CREATE_SUPPORT_TICKET', `Created support ticket: "${subject}"`);
    return ticket;
  }

  async getTickets(userId: string) {
    return this.firebase.getSupportTicketsByUserId(userId);
  }

  async getNotifications(businessId: string) {
    return this.firebase.getNotificationsByBusinessId(businessId);
  }

  async markAsRead(notificationId: string) {
    const notification = await this.firebase.getNotificationById(notificationId);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.firebase.updateNotification(notificationId, { isRead: true });
  }

  async logAction(userId: string, action: string, details: string) {
    return this.firebase.createAuditLog({
      userId,
      action,
      details,
    });
  }

  async getAuditLogs(userId: string) {
    return this.firebase.getAuditLogsByUserId(userId, 20);
  }
}
