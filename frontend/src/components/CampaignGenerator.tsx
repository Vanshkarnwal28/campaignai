import { useState } from 'react';
import { ChevronRight, Cpu, Award, Zap, BarChart2 } from 'lucide-react';
import { api } from '../services/api';

interface CampaignGeneratorProps {
  businessId: string;
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
  onDraftGenerated: (draftId: string, strategy: any) => void;
}

export default function CampaignGenerator({ businessId, addToast, onDraftGenerated }: CampaignGeneratorProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [draftId, setDraftId] = useState('');

  // Step 1: Basic Business details
  const [basicDetails, setBasicDetails] = useState({
    name: '',
    objective: 'CONVERSIONS',
    dailyBudget: '100',
    businessName: '',
    website: '',
    industry: '',
    product: '',
    targetCountry: 'United States',
    goal: 'Sales conversions',
    festivalTheme: ''
  });

  // Step 2: Strategy Review
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    addToast('Analyzing inputs', 'Generating AI strategy based on your theme...', 'info');
    try {
      const payload = {
        ...basicDetails,
      };
      const draft = await api.campaigns.createDraft(businessId, payload);
      setDraftId(draft.id);
      
      const strategy = await api.campaigns.generateDraftStrategy(businessId, draft.id);
      setGeneratedStrategy(strategy);
      setStep(2); // Move to Strategy Review
      addToast('AI Strategy Generated', 'Review estimated ROAS, target specs, and visual prompts.', 'success');
    } catch (err: any) {
      addToast('Strategy Build Failed', err.message, 'alert');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLibrary = () => {
    onDraftGenerated(draftId, generatedStrategy);
  };

  return (
    <div style={{ padding: '40px 8%', display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>AI Campaign Generator</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Describe your target audience and get high-converting strategies in seconds.</p>
      </div>

      {/* Step Indicators */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {['1. Business Context & Theme', '2. AI Strategy Summary'].map((title, idx) => (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              height: 4, 
              borderRadius: 2, 
              background: step > idx ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
              transition: 'background 0.3s'
            }}></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step === idx + 1 ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>
              {title}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Form */}
      {step === 1 && (
        <div className="glass-panel" style={{ padding: 40, maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h3 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>Basic Campaign details</h3>
            
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Campaign Name</label>
              <input 
                className="form-input" 
                placeholder="e.g. Summer Linen Organic Launch" 
                value={basicDetails.name} 
                onChange={e => setBasicDetails({...basicDetails, name: e.target.value})} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Objective</label>
                <select 
                  className="form-input" 
                  value={basicDetails.objective} 
                  onChange={e => setBasicDetails({...basicDetails, objective: e.target.value})}
                  style={{ background: 'rgba(15,23,42,0.1)' }}
                >
                  <option value="CONVERSIONS">Conversions (Sales)</option>
                  <option value="LEAD_GEN">Lead Generation</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Daily Budget (USD)</label>
                <input 
                  className="form-input" 
                  type="number" 
                  value={basicDetails.dailyBudget} 
                  onChange={e => setBasicDetails({...basicDetails, dailyBudget: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Business Name</label>
                <input 
                  className="form-input" 
                  placeholder="Omni Retail Inc." 
                  value={basicDetails.businessName} 
                  onChange={e => setBasicDetails({...basicDetails, businessName: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Website URL</label>
                <input 
                  className="form-input" 
                  type="url" 
                  placeholder="https://omni-retail.com" 
                  value={basicDetails.website} 
                  onChange={e => setBasicDetails({...basicDetails, website: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Industry</label>
                <input 
                  className="form-input" 
                  placeholder="D2C Sustainable Fashion" 
                  value={basicDetails.industry} 
                  onChange={e => setBasicDetails({...basicDetails, industry: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Festival / Event Theme</label>
                <input 
                  className="form-input" 
                  placeholder="e.g. Diwali, Black Friday, Christmas" 
                  value={basicDetails.festivalTheme} 
                  onChange={e => setBasicDetails({...basicDetails, festivalTheme: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>Target Country</label>
                <input 
                  className="form-input" 
                  placeholder="United States" 
                  value={basicDetails.targetCountry} 
                  onChange={e => setBasicDetails({...basicDetails, targetCountry: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <button className="btn-primary" type="submit" style={{ justifyContent: 'center', marginTop: 10 }} disabled={loading}>
              {loading ? <Cpu className="animate-spin" size={16} /> : <ChevronRight size={16} />}
              {loading ? ' Generating AI Strategy...' : ' Generate Strategy'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Strategy Review Dashboard */}
      {step === 2 && generatedStrategy && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Estimated Metrics cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>EXPECTED ROAS</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)' }}>{generatedStrategy.expectedROAS}x</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Estimated return conversion</span>
            </div>
            <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>EXPECTED CTR</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{generatedStrategy.expectedCTR}%</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Benchmark: 1.2% in category</span>
            </div>
            <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>EXPECTED CPC</span>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>${generatedStrategy.expectedCPC}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Refined target parameters</span>
            </div>
            <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>HEALTH PREDICTION</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{generatedStrategy.campaignHealthPrediction}%</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Daily optimization sync</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
            
            {/* Left panels: Copy Deck & Strategy Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div className="glass-panel" style={{ padding: 28 }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={18} style={{ color: 'var(--color-primary)' }} /> Marketing Strategy Summary
                </h3>
                <p style={{ color: 'var(--color-text-main)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 20 }}>
                  {generatedStrategy.marketingStrategySummary}
                </p>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                  <strong>Creative guidelines recommendation:</strong> {generatedStrategy.creativeIdeas}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 28 }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Generated Copy Deck (Variations)</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>TOP PERFORMANCE HEADLINES (10)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {generatedStrategy.headlines?.map((h: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: 10, fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                          <span style={{ color: 'var(--color-primary)' }}>{idx + 1}.</span> {h}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>TOP PRIMARY TEXTS (10)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {generatedStrategy.primaryTexts?.map((t: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: 10, fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border)', lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--color-primary)' }}>{idx + 1}.</span> {t}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>AI GENERATED VISUAL IDEAS</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {generatedStrategy.imagePrompts?.map((prompt: string, idx: number) => (
                        <div key={idx} style={{ 
                          display: 'flex', flexDirection: 'column', gap: 10, 
                          background: 'rgba(0,0,0,0.2)', padding: '12px', 
                          borderRadius: 12, border: '1px solid var(--color-border)' 
                        }}>
                          <div style={{ 
                            width: '100%', height: 140, borderRadius: 8, 
                            background: `linear-gradient(45deg, var(--color-primary), var(--color-secondary))`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 600, fontSize: '0.9rem', textAlign: 'center', padding: 20
                          }}>
                            {/* Mock generated image using css gradient */}
                            <span style={{opacity: 0.8}}>[ AI Visual Variant {idx + 1} ]</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                            <strong>Midjourney Prompt:</strong> {prompt}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Right panels: Targeting specs & Placements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={16} style={{ color: 'var(--color-secondary)' }} /> Targeting Specifications
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.85rem' }}>
                  <div>
                    <strong>Audience:</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{generatedStrategy.audience}</div>
                  </div>
                  <div>
                    <strong>Interest Tags:</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{generatedStrategy.interestTargeting}</div>
                  </div>
                  <div>
                    <strong>Behaviors:</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{generatedStrategy.behaviors}</div>
                  </div>
                  <div>
                    <strong>Lookalike Segment Suggestion:</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{generatedStrategy.lookalikeSuggestions}</div>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={16} style={{ color: 'var(--color-primary)' }} /> Placements & Bidding
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.85rem' }}>
                  <div>
                    <strong>Placements:</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{generatedStrategy.placements}</div>
                  </div>
                  <div>
                    <strong>Optimization Goal:</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{generatedStrategy.optimizationGoal}</div>
                  </div>
                  <div>
                    <strong>Budget Recommendation:</strong>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{generatedStrategy.budgetRecommendation}</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button 
                className="btn-primary" 
                style={{ padding: 16, justifyContent: 'center', fontSize: '1rem', width: '100%' }}
                onClick={handleProceedToLibrary}
              >
                Proceed to Creative Library & Previews <ChevronRight size={16} />
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
