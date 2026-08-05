import React, { useEffect, useState } from 'react';
import { CalendarClock, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface InstantPostsPanelProps {
  businessId: string;
  onToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export const InstantPostsPanel: React.FC<InstantPostsPanelProps> = ({ businessId, onToast }) => {
  const [count, setCount] = useState(5);
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
    try {
      const result = await api.scheduler.scheduleInstantWeek({ businessId, count, platforms: platform, timezone });
      setPosts(result.posts || []);
      onToast('Instant posts scheduled', `${result.count} business-aware posts were added for the next workdays.`, 'success');
    } catch (error: any) {
      onToast('Instant scheduling failed', error.message || 'Could not create the weekly post plan.', 'alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 32, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} color="#6366f1" />
            <h1 style={{ margin: 0, fontSize: '1.7rem' }}>Instant Posts</h1>
          </div>
          <p style={{ color: '#64748b', marginTop: 8 }}>Create a business-aware workweek of organic posts in one click.</p>
        </div>
        <button onClick={loadPosts} className="btn-secondary" title="Refresh instant posts"><RefreshCw size={16} /></button>
      </div>

      <section className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, alignItems: 'end' }}>
          <label>Posts
            <select value={count} onChange={e => setCount(Number(e.target.value))} className="form-input" style={{ display: 'block', width: '100%', marginTop: 6 }}>
              <option value={5}>5 workdays</option><option value={7}>7 consecutive days</option><option value={10}>10 workdays</option>
            </select>
          </label>
          <label>Publish to
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="form-input" style={{ display: 'block', width: '100%', marginTop: 6 }}>
              <option value="both">Facebook + Instagram</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option>
            </select>
          </label>
          <label>Timezone
            <input value={timezone} onChange={e => setTimezone(e.target.value)} className="form-input" style={{ display: 'block', width: '100%', marginTop: 6 }} />
          </label>
          <button onClick={scheduleWeek} disabled={loading} className="btn-primary" style={{ minHeight: 42 }}>
            <CalendarClock size={16} /> {loading ? 'Building plan…' : 'Schedule instantly'}
          </button>
        </div>
        <p style={{ color: '#64748b', fontSize: '.82rem', marginBottom: 0 }}>The backend reads the saved business profile, category, goals, and USP to create distinct captions and schedules them at 10:00 AM on the selected days.</p>
      </section>

      <section className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Recent instant plans</h2>
        {posts.length === 0 ? <p style={{ color: '#64748b' }}>No instant plan has been created yet.</p> : posts.map(post => (
          <div key={post.id} style={{ padding: '14px 0', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 18 }}>
            <div><strong>{post.headline || 'Business post'}</strong><div style={{ color: '#64748b', marginTop: 4 }}>{post.caption}</div></div>
            <div style={{ whiteSpace: 'nowrap', color: '#64748b', fontSize: '.82rem' }}>{post.platform} · {post.status}</div>
          </div>
        ))}
      </section>
    </main>
  );
};
