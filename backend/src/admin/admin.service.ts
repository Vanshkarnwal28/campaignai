import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AdminService {
  private systemPrompts: Record<string, string> = {
    campaign_generator: "You are CampaignAI's Senior Ad Copywriter. Create high-converting Meta ad copy with hooks, primary text, headline, and CTA.",
    content_planner: "You are CampaignAI's Social Media Strategist. Create a 5-day weekly content calendar with daily captions, CTAs, hashtags, and optimal posting times.",
    lead_assistant: "You are CampaignAI's AI Lead Sales Assistant. Generate executive lead summaries, priority scores (HIGH/MEDIUM/LOW), WhatsApp templates, email drafts, and structured call scripts.",
    help_bot: "You are CampaignAI's official Help Assistant. Answer ONLY questions related to CampaignAI and its features based strictly on retrieved knowledge base context."
  };

  private platformSettings = {
    maintenanceMode: false,
    aiModel: 'openrouter/free',
    allowRegistrations: true,
    metaApiVersion: 'v18.0',
    maxFreeCampaigns: 5,
    autoApproveLeads: true,
  };

  constructor(private readonly firebase: FirebaseService) {}

  private checkAdmin(user: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access privileges required');
    }
  }

  async getPlatformStats(adminUser: any) {
    this.checkAdmin(adminUser);
    const totalUsers = await this.firebase.countUsers();
    const totalBusinesses = await this.firebase.countBusinesses();
    const activeCampaigns = await this.firebase.countCampaigns(undefined, 'ACTIVE');

    const subscriptions = await this.firebase.getAllSubscriptions();
    const activeSubscribers = subscriptions.filter((s: any) => s.status === 'ACTIVE').length;
    const totalRevenue = activeSubscribers * 49; // $49/mo estimated average revenue per paid tier

    const auditLogsCount = await this.firebase.countAuditLogs();

    return {
      totalUsers,
      totalBusinesses,
      activeCampaigns,
      activeSubscribers,
      totalRevenue,
      auditLogsCount,
      platformHealth: 'OPERATIONAL',
      systemVersion: 'v2.4.0',
    };
  }

  async getUsers(adminUser: any) {
    this.checkAdmin(adminUser);
    const users = await this.firebase.getAllUsers();

    return Promise.all(
      users.map(async (user) => {
        const businesses = await this.firebase.getBusinessesByUserId(user.id);
        return {
          ...user,
          businesses: businesses.map((b) => ({ business: b })),
        };
      }),
    );
  }

  async updateUserRole(adminUser: any, userId: string, role: string) {
    this.checkAdmin(adminUser);
    const updated = await this.firebase.updateUser(userId, { role });
    await this.firebase.createAuditLog({
      userId: adminUser.id,
      action: 'UPDATE_USER_ROLE',
      details: JSON.stringify({ targetUserId: userId, newRole: role }),
    });
    return updated;
  }

  async getBusinesses(adminUser: any) {
    this.checkAdmin(adminUser);
    const businesses = await this.firebase.getAllBusinesses();

    return Promise.all(
      businesses.map(async (business) => {
        const profile = await this.firebase.getBusinessProfile(business.id);
        const subscriptions = await this.firebase.getSubscriptionsByBusinessId(business.id);
        const campaignsCount = await this.firebase.countCampaigns(business.id);
        return {
          ...business,
          profile,
          subscriptions,
          campaignsCount,
        };
      }),
    );
  }

  async getAllCampaigns(adminUser: any) {
    this.checkAdmin(adminUser);
    return this.firebase.getAllCampaigns();
  }

  async updateCampaignStatus(adminUser: any, campaignId: string, status: string) {
    this.checkAdmin(adminUser);
    const updated = await this.firebase.updateCampaign(campaignId, { status });
    await this.firebase.createAuditLog({
      userId: adminUser.id,
      action: 'UPDATE_CAMPAIGN_STATUS',
      details: JSON.stringify({ campaignId, newStatus: status }),
    });
    return updated;
  }

  async getAllSubscriptions(adminUser: any) {
    this.checkAdmin(adminUser);
    return this.firebase.getAllSubscriptions();
  }

  async getAllTickets(adminUser: any) {
    this.checkAdmin(adminUser);
    const tickets = await this.firebase.getAllSupportTickets();

    return Promise.all(
      tickets.map(async (ticket) => {
        const user = await this.firebase.getUserById((ticket as any).userId);
        return {
          ...ticket,
          user,
        };
      }),
    );
  }

  async updateTicketStatus(adminUser: any, ticketId: string, status: string) {
    this.checkAdmin(adminUser);
    const updated = await this.firebase.updateSupportTicket(ticketId, { status });
    await this.firebase.createAuditLog({
      userId: adminUser.id,
      action: 'UPDATE_TICKET_STATUS',
      details: JSON.stringify({ ticketId, newStatus: status }),
    });
    return updated;
  }

  async getSystemPrompts(adminUser: any) {
    this.checkAdmin(adminUser);
    return this.systemPrompts;
  }

  async updateSystemPrompt(adminUser: any, key: string, template: string) {
    this.checkAdmin(adminUser);
    this.systemPrompts[key] = template;
    await this.firebase.createAuditLog({
      userId: adminUser.id,
      action: 'UPDATE_SYSTEM_PROMPT',
      details: JSON.stringify({ promptKey: key }),
    });
    return { key, template, updated: true };
  }

  async sendBroadcastNotification(adminUser: any, title: string, message: string) {
    this.checkAdmin(adminUser);
    const users = await this.firebase.getAllUsers();

    await Promise.all(
      users.map((user) =>
        this.firebase.createNotification({
          userId: user.id,
          title: `[ANNOUNCEMENT] ${title}`,
          message,
          type: 'INFO',
          read: false,
        })
      )
    );

    await this.firebase.createAuditLog({
      userId: adminUser.id,
      action: 'BROADCAST_NOTIFICATION',
      details: JSON.stringify({ title, recipientsCount: users.length }),
    });

    return { success: true, count: users.length };
  }

  async getAllAuditLogs(adminUser: any) {
    this.checkAdmin(adminUser);
    const logs = await this.firebase.getAllAuditLogs(100);

    return Promise.all(
      logs.map(async (log) => {
        const user = await this.firebase.getUserById((log as any).userId);
        return {
          ...log,
          user,
        };
      }),
    );
  }

  async getPlatformSettings(adminUser: any) {
    this.checkAdmin(adminUser);
    return {
      ...this.platformSettings,
      openRouterApiKeyConfigured: !!process.env.OPENROUTER_API_KEY,
      firebaseProjectConfigured: !!process.env.FIREBASE_PROJECT_ID,
      metaAppIdConfigured: !!process.env.META_APP_ID,
    };
  }

  async updatePlatformSettings(adminUser: any, newSettings: any) {
    this.checkAdmin(adminUser);
    this.platformSettings = {
      ...this.platformSettings,
      ...newSettings,
    };
    await this.firebase.createAuditLog({
      userId: adminUser.id,
      action: 'UPDATE_PLATFORM_SETTINGS',
      details: JSON.stringify(newSettings),
    });
    return this.platformSettings;
  }
}
