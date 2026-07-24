import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, RefreshCw, Cpu, TrendingUp, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface OptimizationCenterProps {
  businessId: string;
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export default function OptimizationCenter({ businessId, addToast }: OptimizationCenterProps) {
  const [loading, setLoading] = useState(true);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    loadCenterData();
  }, [businessId]);

  const loadCenterData = async () => {
    setLoading(true);
    try {
      const data = await api.campaigns.getOptimizationCenter(businessId);
      setAutoOptimize(data.autoOptimize);
      setRecommendations(data.recommendations);
      setLogs(data.logs);
    } catch (e: any) {
      addToast('Optimization Sync failed', e.message, 'alert');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoOpt = async () => {
    const nextState = !autoOptimize;
    try {
      await api.campaigns.toggleAutoOptimization(businessId, nextState);
      setAutoOptimize(nextState);
      addToast(
        nextState ? 'Auto-Optimization Active' : 'Auto-Optimization Paused',
        nextState 
          ? 'Platform will autonomously balance budgets and rotate fatigued assets daily.'
          : 'Campaign audits switched back to manual review approval.',
        'success'
      );
      loadCenterData();
    } catch (e: any) {
      addToast('Setting update failed', e.message, 'alert');
    }
  };

  const handleApplyRecommendation = async (recId: string, title: string) => {
    try {
      await api.campaigns.applyRecommendation(businessId, recId);
      addToast(
        'Optimization Executed',
        `Successfully applied action: "${title}"`,
        'success'
      );
      loadCenterData();
    } catch (e: any) {
      addToast('Execution failed', e.message, 'alert');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <RefreshCw className="animate-spin" style={{ color: 'var(--color-primary)', margin: '0 auto 20px auto' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Analyzing active campaign metrics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 8%', display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>AI Optimization Center</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Automated budget realignment controls and direct performance refresh recommendations.</p>
        </div>
        <button className="btn-secondary" onClick={loadCenterData}>
          <RefreshCw size={14} /> Re-Audit Metrics
        </button>
      </div>

      {/* Auto Optimization toggle switch bar */}
      <div className="glass-panel" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.03)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>Autonomous Optimization Engine</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', lineHeight: 1.4, maxWidth: 500 }}>
              Let Gemini audit your campaign daily performance logs. It automatically pauses creatives with declining CTRs and re-routes budgets to highest ROAS sets.
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleToggleAutoOpt}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {autoOptimize ? (
            <ToggleRight size={44} style={{ color: 'var(--color-success)' }} />
          ) : (
            <ToggleLeft size={44} style={{ color: 'var(--color-text-muted)' }} />
          )}
        </button>
      </div>

      {/* Active Recommendations */}
      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} style={{ color: 'var(--color-accent)' }} /> Recommended Actions ({recommendations.length})
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {recommendations.map(rec => (
            <div key={rec.id} className="glass-panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: rec.type === 'BUDGET' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    color: rec.type === 'BUDGET' ? 'var(--color-success)' : 'var(--color-primary)',
                    border: `1px solid ${rec.type === 'BUDGET' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`
                  }}>
                    {rec.type}
                  </span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={12} /> {rec.impact}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 4 }}>{rec.title}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{rec.description}</p>
              </div>

              <button 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: 12 }}
                onClick={() => handleApplyRecommendation(rec.id, rec.title)}
              >
                {rec.actionLabel}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* History panel */}
      <div className="glass-panel" style={{ padding: 28 }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: 20 }}>Audit & Execution History</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {logs.slice(0, 5).map(log => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
              <div>
                <strong>{log.action}</strong>
                <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{log.reason}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--color-accent)' }}>{log.impactMetric}</span>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: 2 }}>
                  {new Date(log.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
