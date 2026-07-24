import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Building, Activity, DollarSign, LifeBuoy, Terminal,
  Send, Settings, Search, RefreshCw, Cpu, Layers, Sparkles, LogOut, Filter
} from 'lucide-react';
import { api } from '../services/api';

interface AdminPortalProps {
  user: any;
  onLogout: () => void;
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export function AdminPortal({ user, onLogout, addToast }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'businesses' | 'campaigns' | 'subscriptions' | 'tickets' | 'prompts' | 'analytics' | 'logs' | 'broadcast' | 'settings'>('overview');

  // Admin Data State
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [businessesList, setBusinessesList] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Form states
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('campaign_generator');
  const [editedPromptText, setEditedPromptText] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // Load all admin data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [st, usr, bus, cmp, sub, tkt, log, prm, stg] = await Promise.all([
        api.admin.getStats().catch(() => null),
        api.admin.getUsers().catch(() => []),
        api.admin.getBusinesses().catch(() => []),
        api.admin.getCampaigns().catch(() => []),
        api.admin.getSubscriptions().catch(() => []),
        api.admin.getTickets().catch(() => []),
        api.admin.getAuditLogs().catch(() => []),
        api.admin.getPrompts().catch(() => ({})),
        api.admin.getSettings().catch(() => null),
      ]);

      setStats(st);
      setUsersList(usr);
      setBusinessesList(bus);
      setCampaignsList(cmp);
      setSubscriptionsList(sub);
      setTicketsList(tkt);
      setAuditLogs(log);
      setPrompts(prm);
      setPlatformSettings(stg);
      if (prm && prm['campaign_generator']) {
        setEditedPromptText(prm['campaign_generator']);
      }
    } catch (err: any) {
      addToast('Admin Data Error', err.message || 'Failed to fetch admin metrics', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    try {
      await api.admin.updateUserRole(targetUserId, newRole);
      addToast('Role Updated', `User role set to ${newRole}`, 'success');
      loadAdminData();
    } catch (err: any) {
      addToast('Update Failed', err.message, 'alert');
    }
  };

  const handleUpdateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      await api.admin.updateCampaignStatus(campaignId, status);
      addToast('Campaign Updated', `Campaign status changed to ${status}`, 'success');
      loadAdminData();
    } catch (err: any) {
      addToast('Update Failed', err.message, 'alert');
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await api.admin.updateTicketStatus(ticketId, status);
      addToast('Ticket Updated', `Ticket status set to ${status}`, 'success');
      loadAdminData();
    } catch (err: any) {
      addToast('Update Failed', err.message, 'alert');
    }
  };

  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    try {
      await api.admin.updatePrompt(selectedPromptKey, editedPromptText);
      addToast('Prompt Updated', `System prompt for ${selectedPromptKey} saved successfully`, 'success');
      setPrompts(prev => ({ ...prev, [selectedPromptKey]: editedPromptText }));
    } catch (err: any) {
      addToast('Save Failed', err.message, 'alert');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) return;
    setIsBroadcasting(true);
    try {
      const res = await api.admin.sendBroadcast(broadcastTitle, broadcastMsg);
      addToast('Broadcast Sent', `Notification delivered to ${res.count} business users`, 'success');
      setBroadcastTitle('');
      setBroadcastMsg('');
    } catch (err: any) {
      addToast('Broadcast Failed', err.message, 'alert');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Filtered lists
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>

      {/* --- ADMIN SIDEBAR --- */}
      <aside style={{
        width: 260, background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', padding: '24px 16px', gap: 24
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
          }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>CampaignAI</div>
            <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin Console</div>
          </div>
        </div>

        {/* System Health indicator badge */}
        <div style={{
          padding: '10px 14px', borderRadius: 10, background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4ade80' }}>All Systems Operational</div>
        </div>

        {/* Navigation items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { id: 'overview', label: 'Platform Overview', icon: Activity },
            { id: 'users', label: 'User Management', icon: Users, badge: usersList.length },
            { id: 'businesses', label: 'Business Workspaces', icon: Building, badge: businessesList.length },
            { id: 'campaigns', label: 'Campaign Monitor', icon: Layers, badge: campaignsList.length },
            { id: 'subscriptions', label: 'Subscriptions & Billing', icon: DollarSign },
            { id: 'tickets', label: 'Support Queue', icon: LifeBuoy, badge: ticketsList.filter(t => t.status === 'OPEN').length },
            { id: 'prompts', label: 'AI Prompt Manager', icon: Cpu },
            { id: 'analytics', label: 'Platform Analytics', icon: Sparkles },
            { id: 'logs', label: 'Audit & System Logs', icon: Terminal },
            { id: 'broadcast', label: 'Broadcast Announcements', icon: Send },
            { id: 'settings', label: 'Platform Settings', icon: Settings },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))' : 'transparent',
                  color: isActive ? '#f8fafc' : '#94a3b8', fontWeight: isActive ? 600 : 400,
                  fontSize: '0.85rem', transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={18} style={{ color: isActive ? '#ef4444' : '#64748b' }} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700,
                    background: isActive ? '#ef4444' : 'rgba(255,255,255,0.1)', color: '#fff'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin profile footer */}
        <div style={{
          padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', background: '#ef4444', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem'
            }}>
              {(user?.name || 'A')[0]}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{user?.name || 'Admin'}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* --- MAIN ADMIN CONTENT --- */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>

        {/* Top Header */}
        <header style={{
          padding: '16px 32px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              {activeTab === 'overview' && 'Platform Overview & Control Center'}
              {activeTab === 'users' && 'User Management & Roles'}
              {activeTab === 'businesses' && 'Business Workspaces Monitor'}
              {activeTab === 'campaigns' && 'Global Campaign Monitoring'}
              {activeTab === 'subscriptions' && 'Subscriptions & Financial Revenue'}
              {activeTab === 'tickets' && 'Support Ticket Resolution Queue'}
              {activeTab === 'prompts' && 'AI System Prompt Management'}
              {activeTab === 'analytics' && 'Platform Usage Analytics'}
              {activeTab === 'logs' && 'System Audit Logs'}
              {activeTab === 'broadcast' && 'Broadcast Announcement Center'}
              {activeTab === 'settings' && 'Global Platform Configuration'}
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Administrator scope • System ID: campaignai-prod-01
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={loadAdminData} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', gap: 6 }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </header>

        {/* Body Content */}
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* KPI Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Total Users', val: stats?.totalUsers || 0, icon: Users, color: '#3b82f6' },
                  { label: 'Active Businesses', val: stats?.totalBusinesses || 0, icon: Building, color: '#8b5cf6' },
                  { label: 'Active Campaigns', val: stats?.activeCampaigns || 0, icon: Layers, color: '#ec4899' },
                  { label: 'Est. Monthly Revenue', val: `$${(stats?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: '#10b981' },
                  { label: 'Active Paid Subs', val: stats?.activeSubscribers || 0, icon: Sparkles, color: '#f59e0b' },
                  { label: 'Open Tickets', val: ticketsList.filter(t => t.status === 'OPEN').length, icon: LifeBuoy, color: '#ef4444' },
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={idx} className="glass-panel" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(15, 23, 42, 0.6)' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${kpi.color}15`, border: `1px solid ${kpi.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={24} style={{ color: kpi.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{kpi.label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{kpi.val}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>System Quick Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={() => setActiveTab('broadcast')} className="btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
                      <Send size={16} style={{ color: '#3b82f6' }} /> Broadcast Announcement to Users
                    </button>
                    <button onClick={() => setActiveTab('prompts')} className="btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
                      <Cpu size={16} style={{ color: '#8b5cf6' }} /> Edit System AI Prompts
                    </button>
                    <button onClick={() => setActiveTab('tickets')} className="btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
                      <LifeBuoy size={16} style={{ color: '#ef4444' }} /> Review Support Ticket Queue
                    </button>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Platform Health & Info</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Firestore Database:</span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>CONNECTED</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>OpenRouter AI Engine:</span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>ONLINE ({stats?.aiModel || 'openrouter/free'})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Meta Graph API:</span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>CONNECTED (v18.0)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Audit Logs Summary */}
              <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent System Audit Logs</h3>
                  <button onClick={() => setActiveTab('logs')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>View All →</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {auditLogs.slice(0, 5).map((log, idx) => (
                    <div key={idx} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#ef4444' }}>{log.action}</span>
                        <span style={{ color: '#94a3b8', marginLeft: 8 }}>by {log.user?.email || log.userId || 'System'}</span>
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{log.createdAt ? new Date(log.createdAt.seconds ? log.createdAt.seconds * 1000 : log.createdAt).toLocaleString() : 'Just now'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* USER MANAGEMENT TAB */}
          {activeTab === 'users' && (
            <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)' }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    className="form-input"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 40, width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Filter size={16} style={{ color: '#64748b' }} />
                  <select
                    className="form-input"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    style={{ padding: '8px 14px' }}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: 12 }}>User Name</th>
                      <th style={{ padding: 12 }}>Email Address</th>
                      <th style={{ padding: 12 }}>Role</th>
                      <th style={{ padding: 12 }}>Workspaces</th>
                      <th style={{ padding: 12 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{u.name}</td>
                        <td style={{ padding: 12, color: '#94a3b8' }}>{u.email}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                            background: u.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                            color: u.role === 'ADMIN' ? '#ef4444' : '#3b82f6',
                            border: `1px solid ${u.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: 12, color: '#94a3b8' }}>
                          {u.businesses?.length || 1} Workspace
                        </td>
                        <td style={{ padding: 12 }}>
                          {u.role === 'ADMIN' ? (
                            <button onClick={() => handleUpdateRole(u.id, 'MEMBER')} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Demote to User</button>
                          ) : (
                            <button onClick={() => handleUpdateRole(u.id, 'ADMIN')} className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#ef4444' }}>Promote to Admin</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BUSINESS WORKSPACES TAB */}
          {activeTab === 'businesses' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {businessesList.map((b) => (
                <div key={b.id} className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{b.name}</h4>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {b.id.substring(0, 12)}...</div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700,
                      background: b.metaAccessToken ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                      color: b.metaAccessToken ? '#4ade80' : '#94a3b8'
                    }}>
                      {b.metaAccessToken ? 'Meta Connected' : 'Meta Disconnected'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Category:</span>
                      <span>{b.profile?.category || 'Unspecified'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Monthly Budget:</span>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>${b.profile?.monthlyBudget || '0'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Total Campaigns:</span>
                      <span>{b.campaignsCount || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CAMPAIGN MONITOR TAB */}
          {activeTab === 'campaigns' && (
            <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: 12 }}>Campaign Name</th>
                    <th style={{ padding: 12 }}>Objective</th>
                    <th style={{ padding: 12 }}>Daily Budget</th>
                    <th style={{ padding: 12 }}>Status</th>
                    <th style={{ padding: 12 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignsList.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: 12, fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: 12, color: '#94a3b8' }}>{c.objective}</td>
                      <td style={{ padding: 12, color: '#10b981', fontWeight: 600 }}>${c.dailyBudget}/day</td>
                      <td style={{ padding: 12 }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                          background: c.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: c.status === 'ACTIVE' ? '#4ade80' : '#ef4444'
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: 12 }}>
                        {c.status === 'ACTIVE' ? (
                          <button onClick={() => handleUpdateCampaignStatus(c.id, 'PAUSED')} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Pause</button>
                        ) : (
                          <button onClick={() => handleUpdateCampaignStatus(c.id, 'ACTIVE')} className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Resume</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SUBSCRIPTIONS TAB */}
          {activeTab === 'subscriptions' && (
            <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Platform Subscriptions & Billing</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: 12 }}>Business Workspace</th>
                    <th style={{ padding: 12 }}>Plan Tier</th>
                    <th style={{ padding: 12 }}>Status</th>
                    <th style={{ padding: 12 }}>Renewal Date</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>No active subscription records found.</td>
                    </tr>
                  ) : (
                    subscriptionsList.map((sub: any) => (
                      <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: 12, fontWeight: 600 }}>{sub.businessId}</td>
                        <td style={{ padding: 12, color: '#3b82f6', fontWeight: 600 }}>{sub.plan || 'FREE'}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                            {sub.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: 12, color: '#94a3b8' }}>
                          {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd.seconds ? sub.currentPeriodEnd.seconds * 1000 : sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SUPPORT QUEUE TAB */}
          {activeTab === 'tickets' && (
            <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {ticketsList.map((t) => (
                  <div key={t.id} style={{ padding: 18, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{t.subject}</h4>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
                          background: t.status === 'OPEN' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: t.status === 'OPEN' ? '#ef4444' : '#4ade80'
                        }}>
                          {t.status}
                        </span>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 6 }}>{t.description}</p>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 10 }}>Submitted by: {t.user?.email || t.userId}</div>
                    </div>
                    <select
                      className="form-input"
                      value={t.status}
                      onChange={e => handleUpdateTicketStatus(t.id, e.target.value)}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI PROMPTS TAB */}
          {activeTab === 'prompts' && (
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
              <div className="glass-panel" style={{ padding: 16, background: 'rgba(15, 23, 42, 0.6)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>System Prompts</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.keys(prompts).map(key => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedPromptKey(key);
                        setEditedPromptText(prompts[key]);
                      }}
                      className={selectedPromptKey === key ? 'btn-primary' : 'btn-secondary'}
                      style={{ justifyContent: 'flex-start', padding: 10, fontSize: '0.8rem' }}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Editing Prompt: {selectedPromptKey}</h3>
                <textarea
                  className="form-input"
                  rows={12}
                  value={editedPromptText}
                  onChange={e => setEditedPromptText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <div>
                  <button onClick={handleSavePrompt} disabled={isSavingPrompt} className="btn-primary" style={{ padding: '10px 20px' }}>
                    {isSavingPrompt ? 'Saving...' : 'Save Prompt Template'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>System Usage & Growth Analytics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>Active Users vs Businesses</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>{stats?.totalUsers || 0} Users / {stats?.totalBusinesses || 0} Businesses</div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 6 }}>100% active user workspace ratio</p>
                </div>
                <div style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>Active Meta Ad Campaigns</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{stats?.activeCampaigns || 0} Active Campaigns</div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 6 }}>Deploying live Facebook & Instagram ads</p>
                </div>
              </div>
            </div>
          )}

          {/* BROADCAST TAB */}
          {activeTab === 'broadcast' && (
            <div className="glass-panel" style={{ padding: 32, maxWidth: 640, background: 'rgba(15, 23, 42, 0.6)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Broadcast Platform Announcement</h3>
              <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6 }}>Announcement Title</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Scheduled System Maintenance / New Feature Alert"
                    value={broadcastTitle}
                    onChange={e => setBroadcastTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6 }}>Message Body</label>
                  <textarea
                    className="form-input"
                    rows={5}
                    placeholder="Enter notification message to be delivered to all business users..."
                    value={broadcastMsg}
                    onChange={e => setBroadcastMsg(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={isBroadcasting} className="btn-primary" style={{ padding: 12 }}>
                  {isBroadcasting ? 'Dispatching Notifications...' : 'Send Broadcast to All Users'}
                </button>
              </form>
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="glass-panel" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.6)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>System Audit Logs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {auditLogs.map((log, idx) => (
                  <div key={idx} style={{ padding: 14, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: '#ef4444' }}>{log.action}</span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{log.createdAt ? new Date(log.createdAt.seconds ? log.createdAt.seconds * 1000 : log.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <div style={{ color: '#94a3b8' }}>User: {log.user?.email || log.userId}</div>
                    {log.details && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>{log.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="glass-panel" style={{ padding: 24, maxWidth: 640, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Platform System Configuration</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>OpenRouter API Key Configured</span>
                  <span style={{ color: platformSettings?.openRouterApiKeyConfigured ? '#4ade80' : '#ef4444', fontWeight: 700 }}>
                    {platformSettings?.openRouterApiKeyConfigured ? 'YES' : 'NO'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Firebase Admin Credentials Configured</span>
                  <span style={{ color: platformSettings?.firebaseProjectConfigured ? '#4ade80' : '#ef4444', fontWeight: 700 }}>
                    {platformSettings?.firebaseProjectConfigured ? 'YES' : 'NO'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Meta App ID Configured</span>
                  <span style={{ color: platformSettings?.metaAppIdConfigured ? '#4ade80' : '#ef4444', fontWeight: 700 }}>
                    {platformSettings?.metaAppIdConfigured ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
