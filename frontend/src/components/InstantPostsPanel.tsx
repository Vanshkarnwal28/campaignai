import React, { useEffect, useState } from 'react';
import { CalendarClock, Sparkles, RefreshCw, Clock, Calendar } from 'lucide-react';
import { api } from '../services/api';

interface InstantPostsPanelProps {
  businessId: string;
  onToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export const InstantPostsPanel: React.FC<InstantPostsPanelProps> = ({ businessId, onToast }) => {
  const [daysSelection, setDaysSelection] = useState<string>('everyday_7');
  const [publishTime, setPublishTime] = useState<string>('10:00');
  const [platform, setPlatform] = useState('both');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPosts = async () => {
    if (!businessId) return;
    try {
      const result = await api.scheduler.getPosts(businessId);
      setPosts((result.posts || []).filter((post: any) => post.batchType === 'INSTANT_WEEK').slice(0, 12));
    } catch (error: any) {
      onToast('Could not load instant posts', error.message, 'alert');
    }
  };

  useEffect(() => { loadPosts(); }, [businessId]);

  const scheduleWeek = async () => {
    setLoading(true);
    let count = 7;
    let daysMode = 'everyday';

    if (daysSelection === 'everyday_7') {
      count = 7;
      daysMode = 'everyday';
    } else if (daysSelection === 'workdays_5') {
      count = 5;
      daysMode = 'workdays';
    } else if (daysSelection === '3days') {
      count = 3;
      daysMode = '3days';
    } else if (daysSelection === 'workdays_10') {
      count = 10;
      daysMode = 'workdays';
    } else if (daysSelection === 'everyday_14') {
      count = 14;
      daysMode = 'everyday';
    }

    try {
      const result = await api.scheduler.scheduleInstantWeek({
        businessId,
        count,
        daysMode,
        publishTime,
        platforms: platform,
        timezone
      });
      setPosts(result.posts || []);
      onToast(
        'Instant posts scheduled',
        `${result.count} posts were scheduled for ${daysMode === 'everyday' ? 'Everyday' : 'the selected days'} at ${formatDisplayTime(publishTime)}.`,
        'success'
      );
    } catch (error: any) {
      onToast('Instant scheduling failed', error.message || 'Could not create the instant post plan.', 'alert');
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h)) return '10:00 AM';
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const displayMin = m < 10 ? `0${m || 0}` : m;
    return `${displayHour}:${displayMin} ${period}`;
  };

  return (
    <main style={{ padding: 32, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} color="#6366f1" />
            <h1 style={{ margin: 0, fontSize: '1.7rem' }}>Instant Posts</h1>
          </div>
          <p style={{ color: '#64748b', marginTop: 8 }}>Create business-aware organic posts automatically executed via backend cron jobs.</p>
        </div>
        <button onClick={loadPosts} className="btn-secondary" title="Refresh instant posts"><RefreshCw size={16} /></button>
      </div>

      <section className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, alignItems: 'end' }}>
          
          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Calendar size={15} color="#4f46e5" /> Schedule Days
            </div>
            <select
              value={daysSelection}
              onChange={e => setDaysSelection(e.target.value)}
              className="form-input"
              style={{ display: 'block', width: '100%' }}
            >
              <option value="everyday_7">Everyday (7 Consecutive Days)</option>
              <option value="workdays_5">5 Workdays (Mon - Fri)</option>
              <option value="3days">3 Days / Week (Mon, Wed, Fri)</option>
              <option value="workdays_10">10 Workdays (2 Weeks)</option>
              <option value="everyday_14">14 Days (2 Weeks Everyday)</option>
            </select>
          </label>

          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Clock size={15} color="#4f46e5" /> Schedule Time
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="time"
                value={publishTime}
                onChange={e => setPublishTime(e.target.value)}
                className="form-input"
                style={{ flex: 1 }}
              />
              <span style={{
                background: '#e0e7ff',
                color: '#4338ca',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}>
                {formatDisplayTime(publishTime)}
              </span>
            </div>
          </label>

          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Publish to
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="form-input"
              style={{ display: 'block', width: '100%', marginTop: 6 }}
            >
              <option value="both">Facebook + Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
          </label>

          <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Timezone
            <input
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="form-input"
              style={{ display: 'block', width: '100%', marginTop: 6 }}
            />
          </label>

          <button onClick={scheduleWeek} disabled={loading} className="btn-primary" style={{ minHeight: 42, gridColumn: 'span 1' }}>
            <CalendarClock size={16} /> {loading ? 'Building plan…' : 'Schedule instantly'}
          </button>
        </div>

        <p style={{ color: '#64748b', fontSize: '.85rem', marginTop: 16, marginBottom: 0, lineHeight: 1.5 }}>
          The backend AI reads your saved business profile, category, goals, and USP to create distinct captions and schedules them at <strong>{formatDisplayTime(publishTime)}</strong> on <strong>{daysSelection.includes('everyday') ? 'Everyday' : 'the selected days'}</strong>. Background cron jobs trigger execution automatically.
        </p>
      </section>

      <section className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Recent instant plans</h2>
        {posts.length === 0 ? (
          <p style={{ color: '#64748b' }}>No instant plan has been created yet.</p>
        ) : (
          posts.map(post => {
            const formattedDate = post.scheduledTime
              ? new Date(post.scheduledTime._seconds ? post.scheduledTime._seconds * 1000 : post.scheduledTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
              : '';
            return (
              <div key={post.id} style={{ padding: '14px 0', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center' }}>
                <div>
                  <strong>{post.headline || 'Business post'}</strong>
                  <div style={{ color: '#64748b', marginTop: 4, fontSize: '0.85rem' }}>{post.caption}</div>
                  {formattedDate && (
                    <div style={{ color: '#6366f1', fontSize: '0.75rem', marginTop: 4, fontWeight: 600 }}>
                      ⏰ Scheduled for {formattedDate}
                    </div>
                  )}
                </div>
                <div style={{ whiteSpace: 'nowrap', color: '#64748b', fontSize: '.82rem', textAlign: 'right' }}>
                  <div>{post.platform}</div>
                  <span style={{
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: post.status === 'PUBLISHED' ? '#dcfce7' : post.status === 'SCHEDULED' ? '#e0e7ff' : '#f1f5f9',
                    color: post.status === 'PUBLISHED' ? '#15803d' : post.status === 'SCHEDULED' ? '#4338ca' : '#475569'
                  }}>
                    {post.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
};
