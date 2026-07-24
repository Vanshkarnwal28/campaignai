import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

/**
 * LeadsService — Phase 6: Enhanced Lead Management (CRM).
 *
 * Full CRM features: search, filter, status management,
 * assignment, notes, CSV export preparation.
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly firebase: FirebaseService) {}

  /** Capture a new lead */
  async captureLead(
    businessId: string,
    email: string,
    name: string,
    phone?: string,
    source?: string,
    metadata?: Record<string, any>,
  ) {
    const lead = await this.firebase.createLead({
      businessId,
      email,
      name,
      phone: phone || '',
      source: source || 'MANUAL',
      address: metadata?.address || '',
      requirement: metadata?.requirement || '',
      campaign: metadata?.campaign || '',
      assignedTo: '',
      notes: [],
      ...metadata,
    });

    await this.firebase.createNotification({
      businessId,
      title: 'New Lead Captured',
      message: `New lead: ${name} (${email}) from ${source || 'Manual Entry'}`,
      type: 'LEAD',
    });

    return lead;
  }

  /** Get all leads for a business */
  async getLeads(businessId: string) {
    const leads = await this.firebase.getLeadsByBusinessId(businessId);
    return { total: leads.length, leads };
  }

  /** Get a single lead by ID */
  async getLeadById(id: string) {
    const lead = await this.firebase.getLeadById(id);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  /** Update lead (status, notes, etc.) */
  async updateLead(id: string, data: Record<string, any>) {
    return this.firebase.updateLead(id, data);
  }

  /** Lead statistics */
  async getLeadStats(businessId: string) {
    const leads = await this.firebase.getLeadsByBusinessId(businessId);

    const total = leads.length;
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    for (const lead of leads as any[]) {
      const status = lead.status || 'NEW';
      byStatus[status] = (byStatus[status] || 0) + 1;

      const source = lead.source || 'MANUAL';
      bySource[source] = (bySource[source] || 0) + 1;

      const dateStr = lead.createdAt instanceof Date
        ? lead.createdAt.toISOString().split('T')[0]
        : (lead.createdAt?._seconds ? new Date(lead.createdAt._seconds * 1000).toISOString().split('T')[0] : 'unknown');
      byDate[dateStr] = (byDate[dateStr] || 0) + 1;
    }

    return { total, byStatus, bySource, byDate };
  }

  // ─── Phase 6: Enhanced CRM Features ─────────────────────────────────────────

  /** Search leads by text across name, email, phone */
  async searchLeads(businessId: string, query: string) {
    const allLeads = await this.firebase.getLeadsByBusinessId(businessId);
    const q = query.toLowerCase();
    const filtered = (allLeads as any[]).filter((lead) =>
      (lead.name || '').toLowerCase().includes(q) ||
      (lead.email || '').toLowerCase().includes(q) ||
      (lead.phone || '').includes(q) ||
      (lead.requirement || '').toLowerCase().includes(q),
    );
    return { total: filtered.length, leads: filtered };
  }

  /** Filter leads by status, source, date range */
  async filterLeads(
    businessId: string,
    filters: { status?: string; source?: string; startDate?: string; endDate?: string; campaign?: string },
  ) {
    const allLeads = await this.firebase.getLeadsByBusinessId(businessId);

    let filtered = allLeads as any[];

    if (filters.status) {
      filtered = filtered.filter((l) => l.status === filters.status);
    }
    if (filters.source) {
      filtered = filtered.filter((l) => l.source === filters.source);
    }
    if (filters.campaign) {
      filtered = filtered.filter((l) => l.campaign === filters.campaign);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter((l) => {
        const d = l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt?._seconds ? l.createdAt._seconds * 1000 : l.createdAt);
        return d >= start;
      });
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((l) => {
        const d = l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt?._seconds ? l.createdAt._seconds * 1000 : l.createdAt);
        return d <= end;
      });
    }

    return { total: filtered.length, leads: filtered };
  }

  /** Assign a lead to a team member */
  async assignLead(leadId: string, assignedTo: string) {
    const lead = await this.firebase.getLeadById(leadId);
    if (!lead) throw new NotFoundException('Lead not found');

    return this.firebase.updateLead(leadId, { assignedTo });
  }

  /** Add a note to a lead */
  async addNote(leadId: string, note: string, author: string) {
    const lead = await this.firebase.getLeadById(leadId) as any;
    if (!lead) throw new NotFoundException('Lead not found');

    const notes = lead.notes || [];
    notes.push({
      text: note,
      author,
      timestamp: new Date(),
    });

    return this.firebase.updateLead(leadId, { notes });
  }

  /** Export leads as CSV-ready data */
  async exportCsv(businessId: string) {
    const leads = await this.firebase.getLeadsByBusinessId(businessId) as any[];

    const headers = ['Name', 'Email', 'Phone', 'Status', 'Source', 'Campaign', 'Address', 'Requirement', 'Assigned To', 'Created At'];
    const rows = leads.map((l) => [
      l.name || '',
      l.email || '',
      l.phone || '',
      l.status || 'NEW',
      l.source || '',
      l.campaign || '',
      l.address || '',
      l.requirement || '',
      l.assignedTo || '',
      l.createdAt instanceof Date ? l.createdAt.toISOString() : (l.createdAt?._seconds ? new Date(l.createdAt._seconds * 1000).toISOString() : ''),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');

    return { csv, total: leads.length };
  }
}
