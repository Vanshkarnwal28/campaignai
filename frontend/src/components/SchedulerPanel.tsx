import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  XCircle, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  Send, 
  Search, 
  Filter 
} from 'lucide-react';
import { api } from '../services/api';

interface SchedulerPanelProps {
  businessId: string;
  onToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export const SchedulerPanel: React.FC<SchedulerPanelProps> = ({ businessId, onToast }) => {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchPosts = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.scheduler.getPosts(businessId);
      setPosts(res.posts || []);
    } catch (err: any) {
      onToast('Error', err.message || 'Failed to fetch scheduled posts', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [businessId]);

  const handlePause = async (id: string) => {
    try {
      await api.scheduler.pause(id);
      onToast('Paused', 'Scheduled post paused', 'info');
      fetchPosts();
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.scheduler.resume(id);
      onToast('Resumed', 'Scheduled post resumed', 'success');
      fetchPosts();
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.scheduler.cancel(id);
      onToast('Cancelled', 'Scheduled post cancelled', 'info');
      fetchPosts();
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    }
  };

  const handleTriggerNow = async () => {
    setTriggering(true);
    try {
      const res = await api.scheduler.trigger();
      onToast('Publisher Triggered', `Processed ${res.processedCount || 0} posts (${res.failedCount || 0} failed)`, 'success');
      fetchPosts();
    } catch (err: any) {
      onToast('Error', err.message || 'Failed to trigger scheduler', 'alert');
    } finally {
      setTriggering(false);
    }
  };

  // Safe Date parsing utility
  const parseSafeDate = (input: any): Date | null => {
    if (!input) return null;
    let date: Date;
    if (input.toDate && typeof input.toDate === 'function') {
      date = input.toDate();
    } else if (input._seconds) {
      date = new Date(input._seconds * 1000);
    } else {
      date = new Date(input);
    }
    return isNaN(date.getTime()) ? null : date;
  };

  // Filter posts based on search and status
  const filteredPosts = posts.filter(post => {
    const matchesSearch = (post.caption || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (post.headline || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const scheduledCount = posts.filter(p => p.status === 'SCHEDULED').length;
  const publishedCount = posts.filter(p => p.status === 'PUBLISHED').length;
  const pausedCount = posts.filter(p => p.status === 'PAUSED').length;

  // Inline CSS definitions for maximum compatibility
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    fontFamily: 'Arial, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
    padding: '24px'
  };

  const headerCardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  };

  const statCardStyle = (borderColor: string): React.CSSProperties => ({
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderLeft: `4px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  });

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgb(0 0 0 / 0.05)'
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: '240px',
    padding: '8px 12px 8px 36px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.85rem',
    outline: 'none',
    color: '#1e293b'
  };

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.85rem',
    background: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
    color: '#334155',
    fontWeight: 'bold'
  };

  const triggerButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
    transition: 'opacity 0.2s'
  };

  const tableCardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle}>
      {/* Top Header Card */}
      <div style={headerCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '12px' }}>
            <Clock className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Auto Scheduler & Publisher</h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Verify status, pause publishing workflows, or trigger instant publisher engines to Meta channels.
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerNow}
          disabled={triggering}
          style={{ ...triggerButtonStyle, opacity: triggering ? 0.7 : 1 }}
        >
          {triggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {triggering ? 'Publishing Due Posts...' : 'Trigger Immediate Publisher'}
        </button>
      </div>

      {/* Statistics Row */}
      <div style={statsGridStyle}>
        <div style={statCardStyle('#3b82f6')}>
          <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Scheduled Queue</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{scheduledCount}</span>
          </div>
        </div>

        <div style={statCardStyle('#10b981')}>
          <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '10px' }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Successfully Published</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{publishedCount}</span>
          </div>
        </div>

        <div style={statCardStyle('#f59e0b')}>
          <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '10px' }}>
            <Pause className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>Paused Posts</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{pausedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={filterBarStyle}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            style={inputStyle}
            placeholder="Search scheduled posts by caption..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            style={selectStyle}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="PAUSED">Paused</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Content Table Card */}
      <div style={tableCardStyle}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '12px' }}>
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Refreshing scheduled list...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', border: '2px dashed #cbd5e1', borderRadius: '12px' }}>
            <Calendar className="w-12 h-12 text-slate-300" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#334155', margin: '0 0 4px 0' }}>No scheduled queue items</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' }}>
              Create marketing campaigns using the AI Ad Generator to schedule posts.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 'bold', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px' }}>Platform & Type</th>
                  <th style={{ padding: '12px' }}>Caption / Content Details</th>
                  <th style={{ padding: '12px' }}>Publish Time</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => {
                  const scheduledDate = parseSafeDate(post.scheduledTime);
                  
                  // Platform pill styling
                  const isFb = post.platform === 'Facebook';
                  const platformPillStyle: React.CSSProperties = {
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    width: 'fit-content',
                    background: isFb ? '#eff6ff' : '#fdf2f8',
                    color: isFb ? '#1d4ed8' : '#db2777',
                    border: isFb ? '1px solid #bfdbfe' : '1px solid #fbcfe8'
                  };

                  // Status badge styling
                  let badgeBg = '#f1f5f9';
                  let badgeColor = '#475569';
                  if (post.status === 'PUBLISHED') {
                    badgeBg = '#d1fae5';
                    badgeColor = '#065f46';
                  } else if (post.status === 'SCHEDULED') {
                    badgeBg = '#dbeafe';
                    badgeColor = '#1e40af';
                  } else if (post.status === 'PAUSED') {
                    badgeBg = '#fef3c7';
                    badgeColor = '#92400e';
                  } else if (post.status === 'CANCELLED') {
                    badgeBg = '#fee2e2';
                    badgeColor = '#991b1b';
                  }

                  const statusPillStyle: React.CSSProperties = {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    background: badgeBg,
                    color: badgeColor
                  };

                  return (
                    <tr key={post.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={platformPillStyle}>{post.platform || 'Facebook'}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{post.postType || 'Image Post'}</span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 12px', maxWidth: '320px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }} className="line-clamp-2">
                          {post.caption}
                        </div>
                        {post.headline && (
                          <div style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: 'bold', marginTop: '4px' }}>
                            Headline: {post.headline}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '16px 12px', fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
                        {scheduledDate ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{scheduledDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{scheduledDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : 'Immediate'}
                      </td>

                      <td style={{ padding: '16px 12px' }}>
                        <span style={statusPillStyle}>
                          {post.status === 'PUBLISHED' && <CheckCircle2 className="w-3 h-3" />}
                          {post.status === 'PAUSED' && <Pause className="w-3 h-3" />}
                          {post.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                          {post.status}
                        </span>
                      </td>

                      <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {post.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handlePause(post.id)}
                              style={{ border: 'none', background: 'transparent', padding: '6px', cursor: 'pointer', borderRadius: '6px', color: '#d97706' }}
                              title="Pause Publishing"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}

                          {post.status === 'PAUSED' && (
                            <button
                              onClick={() => handleResume(post.id)}
                              style={{ border: 'none', background: 'transparent', padding: '6px', cursor: 'pointer', borderRadius: '6px', color: '#059669' }}
                              title="Resume Publishing"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}

                          {post.status !== 'PUBLISHED' && post.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCancel(post.id)}
                              style={{ border: 'none', background: 'transparent', padding: '6px', cursor: 'pointer', borderRadius: '6px', color: '#ef4444' }}
                              title="Cancel Post"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
