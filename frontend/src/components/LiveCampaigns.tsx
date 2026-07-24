import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, RefreshCw, Compass } from 'lucide-react';
import { api } from '../services/api';

interface LiveCampaignsProps {
  businessId: string;
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export default function LiveCampaigns({ businessId, addToast }: LiveCampaignsProps) {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    loadCampaigns();
  }, [businessId]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await api.campaigns.getCampaigns(businessId);
      setCampaigns(data);
    } catch (e: any) {
      addToast('Sync failed', 'Could not sync campaigns from Meta API', 'alert');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await api.campaigns.updateStatus(campaignId, nextStatus);
      addToast(
        `Campaign ${nextStatus === 'ACTIVE' ? 'Activated' : 'Paused'}`,
        `Direct publication sync successful on Meta Ads Manager.`,
        'success'
      );
      loadCampaigns();
    } catch (e: any) {
      addToast('Status toggle failed', e.message, 'alert');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <RefreshCw className="animate-spin" style={{ color: 'var(--color-primary)', margin: '0 auto 20px auto' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Polling active Meta campaign assets...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 8%', display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Live Campaigns</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Direct status control and real-time budget tuning for Facebook & Instagram creatives.</p>
        </div>
        <button className="btn-secondary" onClick={loadCampaigns}>
          <RefreshCw size={14} /> Refresh List
        </button>
      </div>

      {/* Campaigns list table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        
        {campaigns.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)' }}>CAMPAIGN NAME</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)' }}>STATUS</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)' }}>OBJECTIVE</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)' }}>DAILY BUDGET</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)' }}>HEALTH SCORE</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)' }}>TARGET SPEC</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const targetObj = c.adSets?.[0]?.targeting || {};
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '20px 24px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: c.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: c.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)',
                        border: `1px solid ${c.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', color: 'var(--color-text-muted)' }}>{c.objective}</td>
                    <td style={{ padding: '20px 24px', fontWeight: 700 }}>${c.dailyBudget}/day</td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ color: c.healthScore > 90 ? 'var(--color-accent)' : '#fff', fontWeight: 600 }}>
                        {c.healthScore ? `${c.healthScore}%` : 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {targetObj.location || 'Global'} (Ages {targetObj.age_min || 18}-{targetObj.age_max || 65})
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleToggleStatus(c.id, c.status)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: c.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-text-muted)',
                          transition: 'color 0.2s'
                        }}
                        title={c.status === 'ACTIVE' ? 'Pause Campaign' : 'Resume Campaign'}
                      >
                        {c.status === 'ACTIVE' ? <ToggleRight size={28} style={{ color: 'var(--color-success)' }} /> : <ToggleLeft size={28} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <Compass size={40} style={{ color: 'var(--color-text-muted)', marginBottom: 16 }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>No Live Campaigns</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', maxWidth: 400, margin: '0 auto 24px auto', lineHeight: 1.6 }}>
              You don't have any published campaigns synced with this business workspace yet. Run our AI Campaign builder to launch your first ad.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
