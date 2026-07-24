import { Download, BarChart2, Users, MapPin, Layers } from 'lucide-react';

interface AnalyticsDashboardProps {
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export default function AnalyticsDashboard({ addToast }: AnalyticsDashboardProps) {
  const handleExport = (format: 'PDF' | 'CSV') => {
    addToast('Generating Report', `Compiling campaign assets and metrics to ${format}...`, 'info');
    setTimeout(() => {
      addToast('Download Started', `Meta_Campaign_Performance_Report.${format.toLowerCase()} saved to device.`, 'success');
    }, 1500);
  };

  return (
    <div style={{ padding: '40px 8%', display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Analytics & Insights</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Granular metrics breakdown, custom placement tracking, and audit report generation.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem' }} onClick={() => handleExport('CSV')}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn-primary" style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem' }} onClick={() => handleExport('PDF')}>
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Grid of detailed sectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Placement Breakdown */}
        <div className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} style={{ color: 'var(--color-primary)' }} /> Placement Performance
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
            {[
              { name: 'Instagram Reels', spend: '$420.50', ctr: '2.45%', share: 45 },
              { name: 'Facebook Mobile Feed', spend: '$280.10', ctr: '1.98%', share: 30 },
              { name: 'Instagram Stories', spend: '$140.20', ctr: '2.14%', share: 15 },
              { name: 'Facebook Reels', spend: '$90.40', ctr: '1.20%', share: 10 }
            ].map((p, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <strong>{p.name}</strong>
                  <span style={{ color: 'var(--color-text-muted)' }}>{p.spend} spend • {p.ctr} CTR</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--color-primary)', width: `${p.share}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demographic Breakdown (Age & Gender) */}
        <div className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} style={{ color: 'var(--color-accent)' }} /> Demographics Auditing
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20, marginTop: 12 }}>
            
            {/* Gender SVG Pie */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 90, height: 90 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="var(--color-accent)" strokeWidth="4.2" strokeDasharray="58, 100" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="var(--color-primary)" strokeWidth="4.2" strokeDasharray="42, 100" strokeDashoffset="-58" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.75rem', fontWeight: 800 }}>58% F</div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--color-accent)' }}>● Female (58%)</span>
                <span style={{ color: 'var(--color-primary)' }}>● Male (42%)</span>
              </div>
            </div>

            {/* Age Range Distribution */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { range: '18 - 24', pct: 20 },
                { range: '25 - 34', pct: 45 },
                { range: '35 - 44', pct: 25 },
                { range: '45 - 54', pct: 8 },
                { range: '55+', pct: 2 }
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem' }}>
                  <span style={{ width: 50, color: 'var(--color-text-muted)' }}>{a.range}</span>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--color-accent)', width: `${a.pct}%` }}></div>
                  </div>
                  <span style={{ width: 30, textAlign: 'right', fontWeight: 600 }}>{a.pct}%</span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* Country/Geographic and Funnel breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
        
        {/* Country listing */}
        <div className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} style={{ color: 'var(--color-secondary)' }} /> Geographical Analysis
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
            {[
              { country: 'United States', spend: '$520.10', ROAS: '3.62x' },
              { country: 'United Kingdom', spend: '$190.20', ROAS: '3.12x' },
              { country: 'Canada', spend: '$120.40', ROAS: '2.95x' },
              { country: 'Australia', spend: '$90.50', ROAS: '3.42x' }
            ].map((c, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{idx + 1}.</span>
                  <strong>{c.country}</strong>
                </div>
                <div>
                  <span style={{ fontWeight: 700 }}>{c.ROAS} ROAS</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: 8 }}>({c.spend})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Funnel Analysis */}
        <div className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} style={{ color: 'var(--color-primary)' }} /> Marketing Funnel Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {[
              { stage: 'Impressions (Top Funnel)', value: '142,000', drop: '100%' },
              { stage: 'Link Clicks (Mid Funnel)', value: '3,030', drop: '2.1%' },
              { stage: 'Add To Cart (Intent)', value: '620', drop: '20.4%' },
              { stage: 'Purchases (Bottom Funnel)', value: '182', drop: '29.3%' }
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px 18px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                <div>
                  <strong style={{ display: 'block' }}>{f.stage}</strong>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 2 }}>Conversion: {f.drop}</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
