import { useState } from 'react';
import { Target, Plus, Trash2, RefreshCw } from 'lucide-react';

interface AudienceAndLibraryProps {
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export default function AudienceAndLibrary({ addToast }: AudienceAndLibraryProps) {
  const [activeTab, setActiveTab] = useState<'audiences' | 'creatives'>('audiences');

  // Lookalike Creator States
  const [audienceName, setAudienceName] = useState('Lookalike Purchase Audience 2%');
  const [lookalikePercentage, setLookalikePercentage] = useState(2);
  const [pixelSource, setPixelSource] = useState('pixel_conversions_main');
  const [pixelEvent, setPixelEvent] = useState('PURCHASE');
  const [country, setCountry] = useState('United States');
  const [creating, setCreating] = useState(false);

  // Audiences listing state
  const [audiences, setAudiences] = useState<any[]>([
    { id: 'aud_1', name: 'Lookalike 1% Purchase conversions - USA', type: 'Lookalike', size: '2.4M', source: 'Pixel conversions main', status: 'READY' },
    { id: 'aud_2', name: 'Eco clothing & organic cotton interest', type: 'Core Interest', size: '12M', source: 'Sustainable clothing tags', status: 'READY' }
  ]);

  // Creative Library states
  const creatives = [
    { id: 'cr_1', headline: 'Wear the Change: 100% Organic', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600', aspect: '1:1' },
    { id: 'cr_2', headline: 'Minimalist studio lifestyle flatlay', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=600', aspect: '9:16' }
  ];

  const handleCreateAudience = () => {
    setCreating(true);
    addToast('Creating Audience', 'Hashing seed list pixel values and publishing coordinates to Meta Graph...', 'info');
    
    setTimeout(() => {
      const newAud = {
        id: `aud_${Date.now()}`,
        name: audienceName,
        type: 'Lookalike',
        size: `${(lookalikePercentage * 2.4).toFixed(1)}M`,
        source: `Pixel: ${pixelEvent} event`,
        status: 'READY'
      };
      setAudiences([newAud, ...audiences]);
      setCreating(false);
      addToast('Audience Created', `Lookalike ${lookalikePercentage}% published to Meta Ads account.`, 'success');
    }, 1500);
  };

  const handleDeleteAudience = (id: string) => {
    setAudiences(audiences.filter(a => a.id !== id));
    addToast('Audience Removed', 'Mapping segment removed from Meta catalog.', 'info');
  };

  return (
    <div style={{ padding: '40px 8%', display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Header and top tab selectors */}
      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Audience & Assets</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Map Custom Lookalike populations and view generated layout variations in the library.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.02)', padding: 4, borderRadius: 10, border: '1px solid var(--color-border)' }}>
          <button 
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer',
              background: activeTab === 'audiences' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'audiences' ? '#fff' : 'var(--color-text-muted)',
              transition: 'all 0.2s'
            }}
            onClick={() => setActiveTab('audiences')}
          >
            Audience Manager
          </button>
          <button 
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer',
              background: activeTab === 'creatives' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'creatives' ? '#fff' : 'var(--color-text-muted)',
              transition: 'all 0.2s'
            }}
            onClick={() => setActiveTab('creatives')}
          >
            Creative Assets
          </button>
        </div>
      </div>

      {/* Main panels */}
      {activeTab === 'audiences' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 32, alignItems: 'start' }}>
          
          {/* Lookalike Creator */}
          <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={18} style={{ color: 'var(--color-primary)' }} /> Create Lookalike
            </h3>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Audience Name</label>
              <input className="form-input" style={{ fontSize: '0.8rem' }} value={audienceName} onChange={e => setAudienceName(e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Conversion Pixel Source</label>
              <select className="form-input" style={{ fontSize: '0.8rem', background: 'rgba(15,23,42,0.1)' }} value={pixelSource} onChange={e => setPixelSource(e.target.value)}>
                <option value="pixel_conversions_main">Conversions Pixel Main (act_12345)</option>
                <option value="pixel_leads">Lead generation Pixel</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Pixel Event Trigger</label>
              <select className="form-input" style={{ fontSize: '0.8rem', background: 'rgba(15,23,42,0.1)' }} value={pixelEvent} onChange={e => setPixelEvent(e.target.value)}>
                <option value="PURCHASE">Purchase</option>
                <option value="ADD_TO_CART">Add To Cart</option>
                <option value="LEAD">Lead Signup</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Lookalike Size Ratio: {lookalikePercentage}%</label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                style={{ width: '100%', accentColor: 'var(--color-primary)' }} 
                value={lookalikePercentage} 
                onChange={e => setLookalikePercentage(parseInt(e.target.value))} 
              />
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                <span>1% (High Intent)</span>
                <span>10% (Broad reach)</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Target Location</label>
              <input className="form-input" style={{ fontSize: '0.8rem' }} value={country} onChange={e => setCountry(e.target.value)} />
            </div>

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleCreateAudience} disabled={creating}>
              {creating ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />} Map Custom Lookalike
            </button>
          </div>

          {/* List panel */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: 20 }}>Sync Custom Audiences</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {audiences.map(aud => (
                <div key={aud.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '14px 20px', borderRadius: 12, border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{aud.name}</strong>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 4 }}>
                      Type: {aud.type} • Source: {aud.source}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700 }}>{aud.size}</span>
                      <div style={{ color: 'var(--color-success)', fontSize: '0.7rem', marginTop: 2 }}>{aud.status}</div>
                    </div>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239, 68, 68, 0.6)' }}
                      onClick={() => handleDeleteAudience(aud.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* Creative Assets Listing tab */
        <div className="glass-panel" style={{ padding: 28 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Asset Library Catalog</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {creatives.map(cr => (
              <div key={cr.id} style={{ border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
                <img src={cr.url} alt="creative library" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    <span>{cr.type} • {cr.aspect}</span>
                    <span style={{ color: 'var(--color-accent)' }}>Active</span>
                  </div>
                  <strong style={{ fontSize: '0.85rem', display: 'block', lineHeight: 1.4 }}>{cr.headline}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
