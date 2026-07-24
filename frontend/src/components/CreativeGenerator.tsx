import { useState } from 'react';
import { Upload, Cpu, Save, Crop, Play, RefreshCw } from 'lucide-react';

interface CreativeGeneratorProps {
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
  onCreativeSaved: (creative: any) => void;
  initialPrompt?: string;
}

export default function CreativeGenerator({ addToast, onCreativeSaved, initialPrompt = '' }: CreativeGeneratorProps) {
  const [imagePrompt, setImagePrompt] = useState(initialPrompt || 'Sustainable lightweight linen shirt flatlay, natural lighting');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600');
  
  // Customization styling parameters
  const [logoPlacement, setLogoPlacement] = useState('BOTTOM_RIGHT');
  const [brandColor1, setBrandColor1] = useState('#6366f1');
  const [brandColor2, setBrandColor2] = useState('#06b6d4');
  const [cropAspect, setCropAspect] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [hasCtaOverlay, setHasCtaOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState('15% Off Your First Order');

  const [generating, setGenerating] = useState(false);

  const handleGenerateAIImage = async () => {
    setGenerating(true);
    addToast('Generating Asset', 'Sending prompt to AI image generation engine...', 'info');
    try {
      await new Promise(r => setTimeout(r, 2000));
      const mockImages = [
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=600'
      ];
      const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
      setMediaUrl(randomImg);
      addToast('Image Generated', 'High-end commercial photo added to canvas.', 'success');
    } catch (e: any) {
      addToast('Asset generation failed', e.message, 'alert');
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
      addToast('File uploaded', `${file.name} loaded to preview workspace.`, 'success');
    }
  };

  const handleSaveCreative = () => {
    const creativeAsset = {
      imageUrl: mediaUrl,
      imagePrompt,
      mediaType,
      brandColors: [brandColor1, brandColor2],
      logoPlacement,
      ctaOverlay: hasCtaOverlay ? overlayText : null,
      cropAspect
    };
    addToast('Creative Saved', 'Asset uploaded to your library catalog successfully.', 'success');
    onCreativeSaved(creativeAsset);
  };

  return (
    <div style={{ padding: '40px 8%', display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      <div>
        <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Creative Library & Generator</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Upload files or write AI prompts to design product photography and direct CTA layouts.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 32, alignItems: 'start' }}>
        
        {/* Left Side: Parameters panel */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>Creative Controls</h3>

          {/* Media source tab selection */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Media Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button 
                className={mediaType === 'IMAGE' ? 'btn-primary' : 'btn-secondary'} 
                style={{ padding: 10, fontSize: '0.8rem', justifyContent: 'center' }} 
                onClick={() => setMediaType('IMAGE')}
              >
                Image
              </button>
              <button 
                className={mediaType === 'VIDEO' ? 'btn-primary' : 'btn-secondary'} 
                style={{ padding: 10, fontSize: '0.8rem', justifyContent: 'center' }} 
                onClick={() => {
                  setMediaType('VIDEO');
                  setMediaUrl('https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-modeling-a-linen-dress-41589-large.mp4');
                }}
              >
                Video Clip
              </button>
            </div>
          </div>

          {/* Upload and AI prompt boxes */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Upload Media File</label>
            <div style={{ border: '1px dashed var(--color-border)', borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
              <Upload size={20} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Drag file here or click to browse</div>
              <input type="file" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer' }} onChange={handleFileUpload} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Generate AI Product Photo</label>
            <textarea 
              className="form-input" 
              rows={3} 
              style={{ fontSize: '0.8rem', padding: 10 }}
              value={imagePrompt} 
              onChange={e => setImagePrompt(e.target.value)}
              placeholder="Describe the product flatlay or lifestyle model shot..." 
            />
            <button 
              className="btn-secondary" 
              style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.8rem', marginTop: 10 }}
              onClick={handleGenerateAIImage}
              disabled={generating}
            >
              {generating ? <RefreshCw className="animate-spin" size={14} /> : <Cpu size={14} />} Generate AI Asset
            </button>
          </div>

          {/* Aspect details, Logo positioning, colors */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Crop Aspect Ratio</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {['1:1', '9:16', '16:9'].map((aspect: any) => (
                <button 
                  key={aspect} 
                  className={cropAspect === aspect ? 'btn-primary' : 'btn-secondary'} 
                  style={{ padding: 8, fontSize: '0.75rem', justifyContent: 'center' }} 
                  onClick={() => setCropAspect(aspect)}
                >
                  <Crop size={10} /> {aspect}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Watermark Logo Position</label>
            <select 
              className="form-input" 
              style={{ fontSize: '0.8rem', padding: 8, background: 'rgba(15,23,42,0.1)' }}
              value={logoPlacement}
              onChange={e => setLogoPlacement(e.target.value)}
            >
              <option value="TOP_LEFT">Top Left</option>
              <option value="TOP_RIGHT">Top Right</option>
              <option value="BOTTOM_LEFT">Bottom Left</option>
              <option value="BOTTOM_RIGHT">Bottom Right</option>
              <option value="NONE">None (No Watermark)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Overlay CTA Banner</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <input type="checkbox" checked={hasCtaOverlay} onChange={e => setHasCtaOverlay(e.target.checked)} />
              <span style={{ fontSize: '0.8rem' }}>Enable CTA Banner Overlay</span>
            </div>
            {hasCtaOverlay && (
              <input 
                className="form-input" 
                style={{ fontSize: '0.8rem', padding: 8 }}
                value={overlayText}
                onChange={e => setOverlayText(e.target.value)}
                placeholder="Text overlay banner..."
              />
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem', fontWeight: 600 }}>Brand Palette Accent Colors</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="color" value={brandColor1} onChange={e => setBrandColor1(e.target.value)} style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{brandColor1}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="color" value={brandColor2} onChange={e => setBrandColor2(e.target.value)} style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{brandColor2}</span>
              </div>
            </div>
          </div>

          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={handleSaveCreative}>
            <Save size={16} /> Save & Commit Asset
          </button>

        </div>

        {/* Right Side: Interactive Preview Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-panel" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
            
            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', alignSelf: 'flex-start', marginBottom: 20 }}>LIVE WORKSPACE CANVAS PREVIEW</h4>
            
            {/* The responsive frame */}
            <div style={{
              width: cropAspect === '1:1' ? 340 : cropAspect === '9:16' ? 240 : 420,
              height: cropAspect === '1:1' ? 340 : cropAspect === '9:16' ? 420 : 240,
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              border: `2px solid ${brandColor1}`,
              background: '#090d16',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              
              {/* Media layer */}
              {mediaType === 'IMAGE' ? (
                <img src={mediaUrl} alt="Preview Canvas" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <video src={mediaUrl} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <Play size={24} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.7, color: '#fff' }} />
                </div>
              )}

              {/* Watermark Logo placement */}
              {logoPlacement !== 'NONE' && (
                <div style={{
                  position: 'absolute',
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  backdropFilter: 'blur(5px)',
                  letterSpacing: '0.05em',
                  top: logoPlacement.startsWith('TOP') ? 14 : 'auto',
                  bottom: logoPlacement.startsWith('BOTTOM') ? 14 : 'auto',
                  left: logoPlacement.endsWith('LEFT') ? 14 : 'auto',
                  right: logoPlacement.endsWith('RIGHT') ? 14 : 'auto',
                  border: `1px solid ${brandColor2}`
                }}>
                  🚀 LOGO
                </div>
              )}

              {/* Bottom CTA Banner overlay */}
              {hasCtaOverlay && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '10px 14px',
                  background: `linear-gradient(90deg, ${brandColor1}, ${brandColor2})`,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {overlayText}
                </div>
              )}

            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <span>Aspect: {cropAspect}</span>
              <span>•</span>
              <span>Watermark: {logoPlacement}</span>
              <span>•</span>
              <span>Media: {mediaType}</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
