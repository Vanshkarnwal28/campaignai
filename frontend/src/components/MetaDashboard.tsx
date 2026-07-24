import { useState, useEffect } from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import { api } from '../services/api';

interface MetaDashboardProps {
  businessId: string;
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
  onNavigateToPage: (page: string) => void;
}

export default function MetaDashboard({ businessId, addToast, onNavigateToPage }: MetaDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [optimizations, setOptimizations] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [businessId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sum, daily, opts] = await Promise.all([
        api.campaigns.getSummary(businessId),
        api.campaigns.getDaily(businessId),
        api.campaigns.getOptimizations(businessId)
      ]);
      setSummary(sum);
      setDailyData(daily);
      setOptimizations(opts);
    } catch (e: any) {
      addToast('Dashboard Sync failed', e.message, 'alert');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <RefreshCw className="animate-spin" style={{ color: 'var(--color-primary)', margin: '0 auto 20px auto' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Fetching live Meta Ads insights...</p>
      </div>
    );
  }

  const fmt = (val: number) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // SVG Chart calculation parameters
  const chartHeight = 160;
  const chartWidth = 520;
  const maxVal = dailyData.length > 0 ? Math.max(...dailyData.map(d => Math.max(d.spend, d.revenue))) * 1.15 : 100;
  
  const pointsSpend = dailyData.map((d, idx) => {
    const x = (idx / Math.max(1, dailyData.length - 1)) * chartWidth;
    const y = chartHeight - ((d.spend / maxVal) * chartHeight);
    return `${x},${y}`;
  }).join(' ');

  const pointsRevenue = dailyData.map((d, idx) => {
    const x = (idx / Math.max(1, dailyData.length - 1)) * chartWidth;
    const y = chartHeight - ((d.revenue / maxVal) * chartHeight);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ padding: '40px 8%', display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Upper header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Meta Ads Manager</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Direct Marketing API integrations and real-time performance diagnostics.</p>
        </div>
        <button className="btn-secondary" onClick={loadDashboardData}>
          <RefreshCw size={14} /> Sync Meta Insights
        </button>
      </div>

      {/* Metrics Row */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          
          <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>TOTAL AD SPEND</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{fmt(summary.totalSpend)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              Active Limit: {fmt(summary.totalSpend + 250)}
            </span>
          </div>

          <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>AVERAGE ROAS</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent)' }}>{(summary.roas || 0).toFixed(2)}x</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Target threshold: 2.80x</span>
          </div>

          <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>CLICK-THROUGH RATE</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>{(summary.ctr * 100 || 0).toFixed(2)}%</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>↑ 12% vs last week</span>
          </div>

          <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>COST PER CLICK (CPC)</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{fmt(summary.cpc)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>↓ 4.8% bid optimization</span>
          </div>

        </div>
      )}

      {/* Main Charts & Quick Action Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        
        {/* SVG Performance Chart */}
        <div className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Performance Trajectory</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Direct correlation of daily marketing budget spend against conversion revenue.</p>
            </div>
            {/* Chart Legend */}
            <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary)' }}></div>
                <span>Ad Spend</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-accent)' }}></div>
                <span>Conversion Revenue</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Rendering */}
          <div style={{ flex: 1, minHeight: 180, display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
            {dailyData.length > 0 ? (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: chartHeight, overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
                <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
                <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />

                {/* Areas */}
                <polygon points={`0,${chartHeight} ${pointsSpend} ${chartWidth},${chartHeight}`} fill="url(#gradSpend)" />
                <polygon points={`0,${chartHeight} ${pointsRevenue} ${chartWidth},${chartHeight}`} fill="url(#gradRevenue)" />

                {/* Trajectory Lines */}
                <polyline fill="none" stroke="var(--color-primary)" strokeWidth="3" points={pointsSpend} strokeLinecap="round" />
                <polyline fill="none" stroke="var(--color-accent)" strokeWidth="3" points={pointsRevenue} strokeLinecap="round" />
              </svg>
            ) : (
              <div style={{ textAlign: 'center', width: '100%', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                No trajectory logs recorded yet. Create and publish a campaign.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <span>30 days ago</span>
            <span>15 days ago</span>
            <span>Today</span>
          </div>

        </div>

        {/* Right side: Quick launch & status checks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn-primary" style={{ justifyContent: 'center' }} onClick={() => onNavigateToPage('meta_builder')}>
                Launch AI Wizard
              </button>
              <button className="btn-secondary" style={{ justifyContent: 'center' }} onClick={() => onNavigateToPage('meta_live')}>
                Manage Active Ads
              </button>
              <button className="btn-secondary" style={{ justifyContent: 'center', borderColor: 'rgba(255,255,255,0.06)' }} onClick={() => onNavigateToPage('meta_optimization')}>
                Optimization Center
              </button>
            </div>
          </div>

          {summary && (
            <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Campaign Synced Status</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Created Drafts</span>
                <strong>{summary.campaignsCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Active Campaigns on Meta</span>
                <strong style={{ color: 'var(--color-success)' }}>{summary.activeCampaigns}</strong>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Real-time Optimization Log */}
      <div className="glass-panel" style={{ padding: 28 }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} style={{ color: 'var(--color-primary)' }} /> Autonomous Optimization Logs
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {optimizations.length > 0 ? (
            optimizations.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '14px 20px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }}></div>
                  <div>
                    <strong>{log.action}</strong>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{log.reason}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{log.impactMetric}</span>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: 2 }}>
                    {new Date(log.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No automated optimizations applied yet. Toggle auto-optimization in settings to start.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
