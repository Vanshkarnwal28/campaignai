import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Cpu, ArrowRight, Shield } from 'lucide-react';
import { api } from '../services/api';

interface AdminLoginScreenProps {
  onAuthSuccess: (user: any) => void;
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
  onBackToUserLogin: () => void;
}

/**
 * AdminLoginScreen — Separate login portal for ADMIN users only.
 * No registration. Only users with role = ADMIN can access.
 * Route: /admin/login
 */
export function AdminLoginScreen({ onAuthSuccess, addToast, onBackToUserLogin }: AdminLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.adminLogin(email, password);

      if (res.user?.role !== 'ADMIN') {
        setErrorMessage('Access Denied: Only Administrator accounts can access the Admin Portal.');
        addToast('Access Denied', 'You do not have ADMIN privileges.', 'alert');
        return;
      }

      addToast('Admin Login', `Welcome, Admin ${res.user.name}`, 'success');
      onAuthSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid administrator credentials.');
      addToast('Login Failed', err.message || 'Authentication failed', 'alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--color-bg-end)',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 440, width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
            border: '2px solid rgba(239,68,68,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Shield size={28} style={{ color: '#ef4444' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
            Admin Console
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Restricted portal — authorized administrators only
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 12,
            borderLeft: '4px solid var(--color-danger)', background: 'rgba(239, 68, 68, 0.05)', fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <div className="glass-panel" style={{ padding: 32 }}>
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 500 }}>Admin Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  type="email"
                  placeholder="admin@campaignai.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 500 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ justifyContent: 'center', padding: '12px', marginTop: 8, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
            >
              {loading ? <Cpu className="animate-spin" size={16} /> : <span>Sign In to Admin Console</span>}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        {/* Back to business login */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onBackToUserLogin}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            ← Back to Business Login
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', opacity: 0.6 }}>
          This portal is monitored and all access is logged.
        </div>
      </div>
    </div>
  );
}
