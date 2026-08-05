import React from 'react';
import { Tag, DollarSign, Globe, Check, Palette } from 'lucide-react';

interface SmartInputControlsProps {
  currentField: string;
  value: string;
  onSelectOption: (optionText: string) => void;
}

export const SmartInputControls: React.FC<SmartInputControlsProps> = ({
  currentField,
  value,
  onSelectOption,
}) => {
  switch (currentField) {
    case 'businessCategory': {
      const categories = [
        'E-commerce & Retail',
        'SaaS & Software',
        'Restaurant & Food',
        'Fashion & Apparel',
        'Healthcare & Wellness',
        'Education & EdTech',
        'Real Estate & Property',
        'Fitness & Gym',
        'Beauty & Cosmetics',
        'Finance & Insurance',
        'Agency & Services',
        'Local Small Business',
      ];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag size={12} /> Suggested Categories (Click to select):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((cat) => {
              const isSelected = value.toLowerCase().includes(cat.toLowerCase());
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectOption(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? 'var(--color-primary-light, #818cf8)' : 'var(--color-text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {isSelected ? '✓ ' : '+ '}{cat}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'customerAgeGroup': {
      const ageGroups = ['18-24 (Gen Z)', '25-34 (Millennials)', '35-44', '45-54', '55+ (Seniors)', 'All Age Groups'];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Select Target Age Range:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ageGroups.map((age) => {
              const isSelected = value.includes(age);
              return (
                <button
                  key={age}
                  type="button"
                  onClick={() => {
                    if (!value) onSelectOption(age);
                    else if (value.includes(age)) onSelectOption(value.replace(age, '').replace(/,\s*,/g, ',').trim());
                    else onSelectOption(`${value}, ${age}`);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#818cf8' : 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {isSelected && <Check size={12} style={{ display: 'inline', marginRight: 4 }} />}
                  {age}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'genderTarget': {
      const genders = ['Both / All Genders', 'Female', 'Male'];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Select Primary Target Gender:
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {genders.map((g) => {
              const isSelected = value.toLowerCase() === g.toLowerCase();
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onSelectOption(g)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#818cf8' : 'var(--color-text)',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'location': {
      const locations = ['Local City Only', 'Statewide', 'Countrywide (India / US)', 'Global / Worldwide'];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Globe size={12} /> Quick Location Presets:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {locations.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => onSelectOption(loc)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  border: '1px solid var(--color-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                + {loc}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'businessGoals': {
      const goals = [
        'Increase Direct Sales',
        'Generate Qualified Leads',
        'Build Brand Awareness',
        'Drive Website Traffic',
        'Boost Social Media Followers',
        'Promote New Product Launch',
      ];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Select Primary Business Goals (Multi-select):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {goals.map((goal) => {
              const isSelected = value.includes(goal);
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => {
                    if (!value) onSelectOption(goal);
                    else if (value.includes(goal)) onSelectOption(value.replace(goal, '').replace(/,\s*,/g, ',').trim());
                    else onSelectOption(`${value}, ${goal}`);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#818cf8' : 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {isSelected ? '✓ ' : '+ '}{goal}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'monthlyBudget': {
      const presets = [
        '₹10,000 ($120/mo)',
        '₹25,000 ($300/mo)',
        '₹50,000 ($600/mo)',
        '₹1,00,000 ($1200/mo)',
        '₹2,50,000 ($3000/mo)',
      ];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <DollarSign size={12} /> Recommended Monthly Budget Presets:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presets.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onSelectOption(b)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  border: '1px solid var(--color-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'brandTone': {
      const tones = [
        'Professional & Corporate',
        'Casual & Friendly',
        'Bold & Energetic',
        'Luxury & Premium',
        'Fun & Playful',
        'Empathetic & Warm',
      ];
      const colorPalettes = [
        { name: 'Indigo Modern', hex: '#4F46E5' },
        { name: 'Royal Purple', hex: '#7C3AED' },
        { name: 'Luxury Gold', hex: '#D97706' },
        { name: 'Crimson Red', hex: '#E11D48' },
        { name: 'Teal Green', hex: '#0D9488' },
      ];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Select Brand Tone:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {tones.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  const match = (value || '').match(/Brand Color:\s*[^,]+/i);
                  const existingColor = match ? match[0] : null;
                  const newValue = existingColor ? `${t}, ${existingColor}` : t;
                  onSelectOption(newValue);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  border: '1px solid var(--color-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                + {t}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Palette size={12} /> Select Brand Aesthetic Color Theme:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {colorPalettes.map((cp) => (
              <button
                key={cp.name}
                type="button"
                onClick={() => {
                  const newColorStr = `Brand Color: ${cp.name} (${cp.hex})`;
                  let newValue = value || '';
                  if (/Brand Color:\s*[^,]+/i.test(newValue)) {
                    newValue = newValue.replace(/Brand Color:\s*[^,]+/i, newColorStr);
                  } else {
                    newValue = newValue ? `${newValue}, ${newColorStr}` : newColorStr;
                  }
                  onSelectOption(newValue);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 16,
                  fontSize: '0.75rem',
                  border: '1px solid var(--color-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: cp.hex, display: 'inline-block' }} />
                {cp.name}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'postingFrequency': {
      const frequencies = [
        'Daily (7 posts / week)',
        '5 times / week',
        '3 times / week (Recommended)',
        'Weekly (1 post / week)',
      ];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Select Preferred Posting Frequency:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {frequencies.map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => onSelectOption(freq)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  border: '1px solid var(--color-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'languages': {
      const langs = ['English', 'Hindi', 'Hinglish', 'Bengali', 'Marathi', 'Telugu', 'Tamil', 'Gujarati', 'Spanish'];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Select Preferred Marketing Languages (Multi-select):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {langs.map((l) => {
              const isSelected = value.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    if (!value) onSelectOption(l);
                    else if (value.includes(l)) onSelectOption(value.replace(l, '').replace(/,\s*,/g, ',').trim());
                    else onSelectOption(`${value}, ${l}`);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#818cf8' : 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {isSelected ? '✓ ' : '+ '}{l}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'businessUSP': {
      const uspSuggestions = [
        'Best Quality & Exceptional 24/7 Support',
        'Most Affordable Price Guarantee',
        'Fast Same-Day Delivery / Delivery Guarantee',
        '100% Organic, Natural & Sustainable',
        'Customized & Personalized Solutions',
      ];
      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Common USP Idea Tags:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {uspSuggestions.map((usp) => (
              <button
                key={usp}
                type="button"
                onClick={() => onSelectOption(usp)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  border: '1px solid var(--color-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                + {usp}
              </button>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};
