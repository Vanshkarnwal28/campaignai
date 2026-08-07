import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  History, 
  Upload, 
  Trash2, 
  Save,
  RefreshCw,
  FileText,
  CheckCircle,
  Lock,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

interface ProfileScreenProps {
  businessId: string;
  onToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ businessId, onToast }) => {
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Profile, Subscription & Payment details from server
  const [profileForm, setProfileForm] = useState({
    businessName: '',
    ownerName: '',
    contactNumber: '',
    whatsAppNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    websiteUrl: '',
    hasWebsite: true,
    logoUrl: '',
  });

  const [subscription, setSubscription] = useState<any>({
    plan: 'FREE',
    status: 'ACTIVE',
    startDate: '',
    expiryDate: '',
    nextBillingDate: '',
    autoRenew: true
  });

  const [payments, setPayments] = useState<any[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Upgrade Plan Modal state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Instamojo Gateway Modal state
  const [instamojoCheckout, setInstamojoCheckout] = useState<any>(null);
  const [instamojoPaymentMethod, setInstamojoPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState<any>(null);

  // Live Timer & UPI Collect States
  const [paymentTimerSeconds, setPaymentTimerSeconds] = useState(300); // 5:00 min countdown
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [upiVpa, setUpiVpa] = useState('user@upi');
  const [upiCollectSent, setUpiCollectSent] = useState(false);
  const [upiMessage, setUpiMessage] = useState('');

  // 1. Countdown Timer Hook
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && instamojoCheckout && paymentTimerSeconds > 0) {
      interval = setInterval(() => {
        setPaymentTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (paymentTimerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, instamojoCheckout, paymentTimerSeconds]);

  // 2. Real-time Status Polling Hook (every 3 seconds)
  useEffect(() => {
    let pollInterval: any = null;
    if (instamojoCheckout && isTimerRunning) {
      pollInterval = setInterval(async () => {
        try {
          const res = await api.payment.getStatus(instamojoCheckout.paymentRequestId);
          if (res?.status === 'PAID') {
            setIsTimerRunning(false);
            const paidPlan = instamojoCheckout.plan;
            const receipt = {
              plan: paidPlan,
              amount: instamojoCheckout.amount,
              paymentId: res.paymentId || `PAY_MOJO_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
              date: new Date().toLocaleDateString(),
            };
            setInstamojoCheckout(null);
            setPaymentSuccessReceipt(receipt);
            onToast('Payment Successful', `Instamojo Payment of ₹${receipt.amount.toLocaleString()} received! Subscription upgraded to ${paidPlan}.`, 'success');
            await fetchProfileDetails();
          }
        } catch { /* silent retry */ }
      }, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [instamojoCheckout, isTimerRunning]);

  const fetchProfileDetails = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.business.getProfileDetails(businessId);
      if (res) {
        const profile = res.profile || {};
        setProfileForm({
          businessName: profile.businessName || '',
          ownerName: profile.ownerName || '',
          contactNumber: profile.contactNumber || '',
          whatsAppNumber: profile.whatsAppNumber || '',
          email: profile.email || '',
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          country: profile.country || '',
          pincode: profile.pincode || '',
          websiteUrl: profile.websiteUrl || '',
          hasWebsite: profile.hasWebsite ?? (profile.websiteUrl !== 'Not Applicable'),
          logoUrl: profile.logoUrl || '',
        });
        setSubscription(res.subscription || {});
        setPayments(Array.isArray(res.payments) ? res.payments : []);
      }
    } catch (err: any) {
      onToast('Error loading profile', err.message || 'Could not fetch profile information', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [businessId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentRequestId = params.get('payment_request_id');
    if (!paymentRequestId) return;

    const verifyReturnedPayment = async () => {
      try {
        const result = await api.payment.getStatus(paymentRequestId);
        if (result.status === 'PAID') {
          onToast('Payment successful', `${result.plan} is now active.`, 'success');
          await fetchProfileDetails();
        } else if (result.status === 'FAILED') {
          onToast('Payment not completed', 'Your subscription was not changed.', 'alert');
        } else {
          onToast('Payment is processing', 'We will update your subscription once Instamojo confirms it.', 'info');
        }
      } catch (err: any) {
        onToast('Payment verification pending', err.message || 'We could not verify this payment yet.', 'info');
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    void verifyReturnedPayment();
  }, [businessId]);

  const handleInputChange = (field: string, value: any) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Website details checkbox toggle
  const handleWebsiteToggle = (checked: boolean) => {
    setProfileForm(prev => ({
      ...prev,
      hasWebsite: checked,
      websiteUrl: checked ? (prev.websiteUrl === 'Not Applicable' ? '' : prev.websiteUrl) : 'Not Applicable'
    }));
    setHasChanges(true);
  };

  // Logo file picker handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      onToast('File too large', 'Logo size cannot exceed 5 MB.', 'alert');
      return;
    }

    // Check formats
    const allowedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedFormats.includes(file.type)) {
      onToast('Invalid format', 'Supported formats are PNG, JPG, JPEG, and SVG.', 'alert');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm(prev => ({ ...prev, logoUrl: reader.result as string }));
      setHasChanges(true);
      onToast('Logo Uploaded', 'New logo uploaded successfully. Save changes to store it permanently.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setProfileForm(prev => ({ ...prev, logoUrl: '' }));
    setHasChanges(true);
    onToast('Logo Removed', 'Logo removed. Click Save changes to apply.', 'info');
  };

  // Submit profile edit changes
  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      await api.business.updateProfile(businessId, profileForm);
      onToast('Changes Saved', 'Your business profile details were successfully updated.', 'success');
      setHasChanges(false);
      await fetchProfileDetails();
    } catch (err: any) {
      onToast('Save Failed', err.message || 'Could not update profile data', 'alert');
    } finally {
      setLoading(false);
    }
  };

  // Subscription Actions
  const handleUpgradePlan = async (planName: string) => {
    setLoading(true);
    try {
      const result = await api.business.upgradePlan(businessId, planName);
      setIsUpgradeModalOpen(false);

      setPaymentTimerSeconds(300); // 5 minutes timer
      setIsTimerRunning(true);
      setUpiCollectSent(false);
      setUpiMessage('');

      setInstamojoCheckout({
        plan: planName,
        amount: result?.amount || ((planName === 'DEMO_TEST' || planName === 'DEMO_1INR') ? 1 : planName === 'STARTER' ? 1499 : planName === 'PRO' ? 4900 : 11800),
        paymentRequestId: result?.paymentRequestId || `MOJO_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        paymentUrl: result?.paymentUrl,
      });
    } catch (err: any) {
      onToast('Upgrade Failed', err.message, 'alert');
    } finally {
      setLoading(false);
    }
  };

  const handleSendUpiCollect = async () => {
    if (!instamojoCheckout) return;
    if (!upiVpa || !upiVpa.includes('@')) {
      onToast('Invalid UPI ID', 'Please enter a valid UPI VPA (e.g. 9876543210@paytm, user@ybl, user@upi)', 'alert');
      return;
    }
    setIsProcessingPayment(true);
    try {
      const res = await api.payment.sendUpiCollect(instamojoCheckout.paymentRequestId, upiVpa);
      setUpiCollectSent(true);
      setUpiMessage(res.message || `UPI Collect Request sent to ${upiVpa}! Open your UPI app to approve.`);
      onToast('UPI Request Sent', `Payment request of ₹${instamojoCheckout.amount} sent to ${upiVpa}. Open Google Pay / PhonePe / Paytm / BHIM to approve.`, 'info');
    } catch (err: any) {
      onToast('UPI Collect Failed', err.message, 'alert');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmInstamojoCheckout = async () => {
    if (!instamojoCheckout) return;
    setIsProcessingPayment(true);
    try {
      const res = await api.payment.confirmUpiPayment(instamojoCheckout.paymentRequestId);
      if (res?.status === 'PAID') {
        setIsTimerRunning(false);
        const paidPlan = instamojoCheckout.plan;
        const receipt = {
          plan: paidPlan,
          amount: instamojoCheckout.amount,
          paymentId: res.paymentId || `PAY_MOJO_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          date: new Date().toLocaleDateString(),
        };
        setInstamojoCheckout(null);
        setPaymentSuccessReceipt(receipt);
        onToast('Payment Successful', `Instamojo Payment of ₹${receipt.amount.toLocaleString()} confirmed! Subscription upgraded to ${paidPlan}.`, 'success');
        await fetchProfileDetails();
      }
    } catch (err: any) {
      onToast('Verification Pending', err.message || 'Payment approval pending in your UPI app.', 'alert');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRenewSubscription = async () => {
    if (subscription.plan === 'FREE') {
      onToast('Renew Not Applicable', 'Free subscriptions are renewed automatically.', 'info');
      return;
    }
    setLoading(true);
    try {
      await api.business.renewSubscription(businessId);
      onToast('Plan Renewed', 'Subscription extended successfully!', 'success');
      await fetchProfileDetails();
    } catch (err: any) {
      onToast('Renewal Failed', err.message, 'alert');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      await api.business.cancelSubscription(businessId);
      onToast('Subscription Cancelled', 'Auto-renew has been disabled.', 'success');
      await fetchProfileDetails();
    } catch (err: any) {
      onToast('Cancellation Failed', err.message, 'alert');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (payment: any) => {
    try {
      const result = await api.payment.downloadInvoice(payment.id);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onToast('Invoice Downloaded', `Invoice ${payment.invoiceId || result.fileName} was downloaded.`, 'success');
    } catch (err: any) {
      onToast('Invoice Download Failed', err.message || 'Could not download this invoice.', 'alert');
    }
  };

  // Safe Date parsers
  const parseSafeDate = (input: any): Date | null => {
    if (!input) return null;
    let date: Date;
    if (input.toDate && typeof input.toDate === 'function') {
      date = input.toDate();
    } else if (input._seconds) {
      date = new Date(input._seconds * 1000);
    } else {
      date = new Date(input);
    }
    return isNaN(date.getTime()) ? null : date;
  };

  const formatProfileDate = (dateStr: any) => {
    const parsed = parseSafeDate(dateStr);
    if (!parsed) return 'N/A';
    return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getRemainingDays = (expiryInput: any) => {
    const parsed = parseSafeDate(expiryInput);
    if (!parsed) return 0;
    const now = new Date();
    const diffTime = parsed.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  // Filter Payments
  const filteredPayments = payments.filter(p => {
    if (paymentFilter === 'ALL') return true;
    const parsedDate = parseSafeDate(p.paymentDate);
    if (!parsedDate) return true;
    
    const diffDays = (new Date().getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (paymentFilter === '30DAYS') return diffDays <= 30;
    if (paymentFilter === '6MONTHS') return diffDays <= 180;
    if (paymentFilter === '1YEAR') return diffDays <= 365;
    return true;
  });

  // Theme styles variables
  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: '6px',
    display: 'block'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '0.85rem',
    color: '#1e293b',
    background: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Business Profile Details</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Manage business details, brand assets, subscription tier upgrades, and view invoice transaction history.
          </p>
        </div>
        {loading && <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />}
      </div>

      {/* Main Grid: Left editable sections / Right summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }} className="profile-grid">
        
        {/* Left Column forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Logo Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <Building className="w-5 h-5 text-indigo-600" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Profile Photo & Brand Logo</h3>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '12px', border: '1px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profileForm.logoUrl ? (
                  <img src={profileForm.logoUrl} alt="Business logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Building className="w-8 h-8 text-slate-300" />
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}>
                    <Upload className="w-3.5 h-3.5" /> Upload Logo
                    <input type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  </label>
                  {profileForm.logoUrl && (
                    <button
                      onClick={handleRemoveLogo}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#fee2e2', border: 'none', color: '#ef4444', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>
                  Supported formats: PNG, JPG, JPEG, SVG. Maximum file size: 5 MB.
                </p>
              </div>
            </div>
          </div>

          {/* Business Information Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <Building className="w-5 h-5 text-indigo-600" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Business Information</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Business Name</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={profileForm.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="e.g. Acme Corporation"
                />
              </div>

              <div>
                <label style={labelStyle}>Owner Name</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={profileForm.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label style={labelStyle}>Contact Number</label>
                <input
                  type="tel"
                  style={inputStyle}
                  value={profileForm.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div>
                <label style={labelStyle}>WhatsApp Number</label>
                <input
                  type="tel"
                  style={inputStyle}
                  value={profileForm.whatsAppNumber}
                  onChange={(e) => handleInputChange('whatsAppNumber', e.target.value)}
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  style={inputStyle}
                  value={profileForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="e.g. contact@acme.com"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Business Address</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={profileForm.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g. 123 Main St, Suite 400"
                />
              </div>

              <div>
                <label style={labelStyle}>City</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={profileForm.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="e.g. Mumbai"
                />
              </div>

              <div>
                <label style={labelStyle}>State</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={profileForm.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="e.g. Maharashtra"
                />
              </div>

              <div>
                <label style={labelStyle}>Country</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={profileForm.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="e.g. India"
                />
              </div>

              <div>
                <label style={labelStyle}>Pincode</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={profileForm.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  placeholder="e.g. 400001"
                />
              </div>
            </div>
          </div>

          {/* Website Details Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <Globe className="w-5 h-5 text-indigo-600" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Website Details</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Website URL</label>
                <input
                  type="url"
                  style={{ ...inputStyle, background: !profileForm.hasWebsite ? '#f1f5f9' : '#ffffff' }}
                  value={profileForm.hasWebsite ? profileForm.websiteUrl : ''}
                  onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                  placeholder="e.g. https://www.acme.com"
                  disabled={!profileForm.hasWebsite}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={!profileForm.hasWebsite}
                  onChange={(e) => handleWebsiteToggle(!e.target.checked)}
                />
                I don’t have a website (Not Applicable)
              </label>

              {!profileForm.hasWebsite && (
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderLeft: '3px solid #64748b', borderRadius: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                  Website Status: <strong>Not Applicable</strong>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Contact info display and Subscription Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Preview Contact Info Card */}
          <div style={{ ...cardStyle, background: '#1e293b', color: '#f8fafc', border: 'none' }}>
            <div style={{ borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Contact Information Card</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Phone className="w-4 h-4 text-indigo-400 mt-0.5" />
                <div>
                  <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.65rem' }}>Phone & WhatsApp</span>
                  <strong>{profileForm.contactNumber || 'Not specified'}</strong>
                  {profileForm.whatsAppNumber && <div style={{ fontSize: '0.65rem', color: '#38bdf8' }}>WhatsApp: {profileForm.whatsAppNumber}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Mail className="w-4 h-4 text-indigo-400 mt-0.5" />
                <div>
                  <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.65rem' }}>Email Address</span>
                  <strong>{profileForm.email || 'Not specified'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Globe className="w-4 h-4 text-indigo-400 mt-0.5" />
                <div>
                  <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.65rem' }}>Website</span>
                  <strong>{profileForm.hasWebsite ? (profileForm.websiteUrl || 'Not entered') : 'Not Applicable'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin className="w-4 h-4 text-indigo-400 mt-0.5" />
                <div>
                  <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.65rem' }}>Business Address</span>
                  <strong>{profileForm.address ? `${profileForm.address}, ${profileForm.city}, ${profileForm.state}, ${profileForm.country} ${profileForm.pincode}` : 'Not specified'}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #334155', paddingTop: '14px', marginTop: '4px' }}>
              <button
                onClick={() => onToast('Editing Mode', 'You can now update the input fields directly.', 'info')}
                style={{ flex: 1, padding: '8px 10px', background: '#334155', border: 'none', color: '#ffffff', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Edit Profile
              </button>
              <button
                onClick={handleSaveChanges}
                style={{ flex: 1, padding: '8px 10px', background: '#4f46e5', border: 'none', color: '#ffffff', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Current Subscription Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Current Plan</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8rem' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>SUBSCRIPTION PLAN</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4f46e5', display: 'block', margin: '4px 0' }}>
                  {subscription.plan || 'FREE'}
                </span>
                <span style={{ display: 'inline-block', padding: '2px 8px', background: subscription.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2', color: subscription.status === 'ACTIVE' ? '#065f46' : '#991b1b', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                  {(subscription.status || 'Active').toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Start Date:</span>
                  <span style={{ fontWeight: 600 }}>{formatProfileDate(subscription.startDate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Expiry Date:</span>
                  <span style={{ fontWeight: 600 }}>{formatProfileDate(subscription.expiryDate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Next Billing:</span>
                  <span style={{ fontWeight: 600 }}>{formatProfileDate(subscription.nextBillingDate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Auto-Renewal:</span>
                  <span style={{ fontWeight: 600, color: subscription.autoRenew ? '#059669' : '#d97706' }}>
                    {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f3ff', padding: '10px 12px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: '#5b21b6', fontWeight: 'bold' }}>REMAINING DAYS</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#5b21b6' }}>
                  {getRemainingDays(subscription.expiryDate)} Days
                </span>
              </div>

                  <button
                onClick={() => setIsUpgradeModalOpen(true)}
                style={{ width: '100%', padding: '10px', background: '#4f46e5', border: 'none', color: '#ffffff', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 4px 0 rgba(79, 70, 229, 0.15)' }}
              >
                Upgrade Plan
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Payment History Section */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History className="w-5 h-5 text-indigo-600" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Payment History</h3>
          </div>

          {/* Payment filter dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '8px', background: '#f8fafc' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>FILTER PAYMENTS:</span>
            <select
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', color: '#334155' }}
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="ALL">All Payments</option>
              <option value="30DAYS">Last 30 Days</option>
              <option value="6MONTHS">Last 6 Months</option>
              <option value="1YEAR">Last 1 Year</option>
            </select>
          </div>
        </div>

        {/* Invoice List Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 'bold' }}>
                <th style={{ padding: '10px' }}>Invoice ID</th>
                <th style={{ padding: '10px' }}>Payment Date</th>
                <th style={{ padding: '10px' }}>Plan Purchased</th>
                <th style={{ padding: '10px' }}>Amount Paid</th>
                <th style={{ padding: '10px' }}>Payment Method</th>
                <th style={{ padding: '10px' }}>Transaction ID</th>
                <th style={{ padding: '10px' }}>Payment Status</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Invoice Download</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    No payment invoice logs found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay) => {
                  let badgeBg = '#f1f5f9';
                  let badgeColor = '#475569';
                  if (pay.status === 'PAID') {
                    badgeBg = '#d1fae5';
                    badgeColor = '#065f46';
                  } else if (pay.status === 'PENDING') {
                    badgeBg = '#fef3c7';
                    badgeColor = '#92400e';
                  } else if (pay.status === 'FAILED') {
                    badgeBg = '#fee2e2';
                    badgeColor = '#991b1b';
                  }

                  const invoiceCode = pay.invoiceId || (pay.paymentRequestId ? `INV-${pay.paymentRequestId.slice(-8).toUpperCase()}` : 'INV-2026-0001');
                  const payDate = pay.paymentDate || pay.paidAt || pay.createdAt;
                  const rawPlan = pay.planPurchased || pay.plan || 'PRO';
                  const planText = rawPlan.endsWith('Tier') ? rawPlan : `${rawPlan} Tier`;
                  const amountVal = Number(pay.amountPaid ?? pay.amount ?? 0);
                  const currSymbol = pay.currency === 'USD' ? '$' : '₹';
                  const methodText = pay.paymentMethod || 'Instamojo UPI';

                  return (
                    <tr key={pay.id || pay.paymentRequestId || Math.random()} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{invoiceCode}</td>
                      <td style={{ padding: '12px 10px' }}>{formatProfileDate(payDate)}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{planText}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#0f172a' }}>{currSymbol}{amountVal.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 10px' }}>{methodText}</td>
                      <td style={{ padding: '12px 10px', fontFamily: 'monospace' }}>{pay.transactionId || 'TXN-ONLINE'}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ padding: '2px 8px', background: badgeBg, color: badgeColor, borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                          {pay.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); void handleDownloadInvoice(pay); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4f46e5', fontWeight: 'bold', textDecoration: 'none' }}
                        >
                          <FileText className="w-3.5 h-3.5" /> PDF
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Actions Billing & Subscription Bar */}
      <div style={{ ...cardStyle, background: '#f8fafc', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', margin: 0 }}>Billing & Subscription Quick Actions</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            style={{ padding: '8px 16px', background: '#4f46e5', border: 'none', color: '#ffffff', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Upgrade Plan
          </button>
          <button
            onClick={handleRenewSubscription}
            style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Renew Subscription
          </button>
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Change Plan
          </button>
          <button
            onClick={handleCancelSubscription}
            style={{ padding: '8px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Cancel Subscription
          </button>
          <button
            onClick={() => onToast('PDF Export', 'Preparing combined invoices download archive...', 'success')}
            style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Download Invoice
          </button>
        </div>
      </div>

      {/* STICKY SAVE CHANGES FLOATING BUTTON */}
      {hasChanges && (
        <div 
          className="no-print"
          style={{ 
            position: 'fixed', 
            bottom: '20px', 
            right: '20px', 
            background: '#4f46e5', 
            color: '#ffffff', 
            padding: '12px 24px', 
            borderRadius: '12px', 
            boxShadow: '0 10px 15px -3px rgb(79 70 229 / 0.3), 0 4px 6px -4px rgb(79 70 229 / 0.3)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            border: 'none',
            zIndex: 90,
            animation: 'pulse 2s infinite'
          }}
          onClick={handleSaveChanges}
        >
          <Save className="w-4 h-4" /> Save Pending Changes
        </div>
      )}

      {/* PLAN UPGRADE MODAL */}
      {isUpgradeModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Select a Subscription Plan</h3>
              <button 
                onClick={() => setIsUpgradeModalOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', margin: '8px 0' }}>
              {/* ₹1 Demo Test Plan Card */}
              <div style={{ border: '2px dashed #10b981', borderRadius: '12px', padding: '16px', textAlign: 'center', background: '#ecfdf5', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: '#ffffff', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.55rem', fontWeight: 'bold' }}>
                  TEST DEMO
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#047857' }}>Demo Test</span>
                <div style={{ margin: '8px 0' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#065f46' }}>₹1</span>
                  <span style={{ fontSize: '0.7rem', color: '#047857' }}>/one-time</span>
                </div>
                <button
                  onClick={() => handleUpgradePlan('DEMO_TEST')}
                  style={{ width: '100%', padding: '6px', background: '#10b981', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Pay ₹1 Demo Test
                </button>
              </div>

              {/* Starter Plan Card */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center', background: subscription.plan === 'STARTER' ? '#f5f3ff' : '#ffffff' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Starter</span>
                <div style={{ margin: '8px 0' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>₹1,499</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>/month</span>
                </div>
                <button
                  onClick={() => handleUpgradePlan('STARTER')}
                  style={{ width: '100%', padding: '6px', background: '#4f46e5', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Choose Starter
                </button>
              </div>

              {/* Pro Plan Card */}
              <div style={{ border: '2px solid #4f46e5', borderRadius: '12px', padding: '16px', textAlign: 'center', background: '#f5f3ff', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#4f46e5', color: '#ffffff', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.55rem', fontWeight: 'bold' }}>
                  POPULAR
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4f46e5' }}>Pro</span>
                <div style={{ margin: '8px 0' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>₹4,900</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>/month</span>
                </div>
                <button
                  onClick={() => handleUpgradePlan('PRO')}
                  style={{ width: '100%', padding: '6px', background: '#4f46e5', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Choose Pro
                </button>
              </div>

              {/* Enterprise Plan Card */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textAlign: 'center', background: subscription.plan === 'ENTERPRISE' ? '#f5f3ff' : '#ffffff' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Enterprise</span>
                <div style={{ margin: '8px 0' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>₹11,800</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>/month</span>
                </div>
                <button
                  onClick={() => handleUpgradePlan('ENTERPRISE')}
                  style={{ width: '100%', padding: '6px', background: '#4f46e5', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Choose Enterprise
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- INSTAMOJO PAYMENT GATEWAY CHECKOUT MODAL --- */}
      {instamojoCheckout && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '20px', maxWidth: '520px', width: '100%', padding: '0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Instamojo Branded Header */}
            <div style={{ background: '#0a2540', color: '#ffffff', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#22c55e', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>INSTAMOJO GATEWAY</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock className="w-3 h-3 text-emerald-400" /> 256-bit SSL Secure</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '6px 0 0 0', color: '#ffffff' }}>Complete Subscription Payment</h3>
              </div>
              <button 
                onClick={() => setInstamojoCheckout(null)}
                style={{ border: 'none', background: 'rgba(255,255,255,0.1)', color: '#ffffff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Merchant & Order Summary */}
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Merchant Name</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>DIPARI AI Technologies Pvt Ltd</div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>Plan: <strong>{instamojoCheckout.plan} Tier</strong></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Amount</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4f46e5' }}>₹{instamojoCheckout.amount.toLocaleString()}</div>
                <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 'bold' }}>Includes GST</span>
              </div>
            </div>

            {/* Payment Method Selector & UPI Timer */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Live Countdown Timer Badge */}
              <div style={{
                background: paymentTimerSeconds > 0 ? '#fef3c7' : '#fee2e2',
                border: paymentTimerSeconds > 0 ? '1px solid #f59e0b' : '1px solid #ef4444',
                borderRadius: '12px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: paymentTimerSeconds > 0 ? '#f59e0b' : '#ef4444', animation: 'pulse 1.5s infinite' }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: paymentTimerSeconds > 0 ? '#92400e' : '#991b1b' }}>
                      {paymentTimerSeconds > 0 ? 'UPI Payment Request Active' : 'Payment Time Expired'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: paymentTimerSeconds > 0 ? '#b45309' : '#b91c1c' }}>
                      {paymentTimerSeconds > 0 ? 'Approve request in Google Pay, PhonePe, Paytm, or BHIM' : 'Timer reached 0:00. Please click retry to generate a new request.'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: paymentTimerSeconds > 0 ? '#d97706' : '#dc2626' }}>
                  {Math.floor(paymentTimerSeconds / 60).toString().padStart(2, '0')}:{(paymentTimerSeconds % 60).toString().padStart(2, '0')}
                </div>
              </div>

              {upiCollectSent && upiMessage && (
                <div style={{ background: '#dcfce7', border: '1px solid #22c55e', color: '#15803d', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  ✓ {upiMessage}
                </div>
              )}

              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Select Payment Method:</span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setInstamojoPaymentMethod('upi')}
                  style={{ padding: '10px 6px', border: instamojoPaymentMethod === 'upi' ? '2px solid #4f46e5' : '1px solid #cbd5e1', borderRadius: '10px', background: instamojoPaymentMethod === 'upi' ? '#f5f3ff' : '#ffffff', color: '#0f172a', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center' }}
                >
                  ⚡ UPI Collect App
                </button>
                <button
                  type="button"
                  onClick={() => setInstamojoPaymentMethod('card')}
                  style={{ padding: '10px 6px', border: instamojoPaymentMethod === 'card' ? '2px solid #4f46e5' : '1px solid #cbd5e1', borderRadius: '10px', background: instamojoPaymentMethod === 'card' ? '#f5f3ff' : '#ffffff', color: '#0f172a', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center' }}
                >
                  💳 Debit / Credit Card
                </button>
                <button
                  type="button"
                  onClick={() => setInstamojoPaymentMethod('netbanking')}
                  style={{ padding: '10px 6px', border: instamojoPaymentMethod === 'netbanking' ? '2px solid #4f46e5' : '1px solid #cbd5e1', borderRadius: '10px', background: instamojoPaymentMethod === 'netbanking' ? '#f5f3ff' : '#ffffff', color: '#0f172a', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center' }}
                >
                  🏦 Net Banking
                </button>
              </div>

              {/* UPI Collect VPA Section */}
              {instamojoPaymentMethod === 'upi' && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 'bold' }}>Enter Your UPI ID (VPA) or Scan QR:</label>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={upiVpa} 
                      onChange={e => setUpiVpa(e.target.value)}
                      placeholder="e.g. 9876543210@paytm, user@ybl, user@okaxis" 
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', color: '#0f172a', outline: 'none' }} 
                    />
                    <button
                      type="button"
                      onClick={handleSendUpiCollect}
                      disabled={isProcessingPayment || paymentTimerSeconds <= 0}
                      style={{ padding: '10px 16px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Send UPI Request
                    </button>
                  </div>

                  {/* QR Code & Mobile Deep Link Section */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', background: '#ffffff', border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '10px', marginTop: '4px' }}>
                    <div style={{ textAlign: 'center', background: '#ffffff', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=${(upiVpa && upiVpa.includes('@')) ? upiVpa : 'paymojo@instamojo'}&pn=DIPARI%20AI&tn=Subscription%20${instamojoCheckout.plan}&am=${instamojoCheckout.amount}&cu=INR&tr=${instamojoCheckout.paymentRequestId}`)}`}
                        alt="Scan QR to Pay" 
                        style={{ width: '130px', height: '130px', borderRadius: '4px' }}
                      />
                      <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>Scan with GPay/PhonePe</span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Open Directly in your UPI App:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <a 
                          href={`upi://pay?pa=${(upiVpa && upiVpa.includes('@')) ? upiVpa : 'paymojo@instamojo'}&pn=DIPARI%20AI&am=${instamojoCheckout.amount}&cu=INR`}
                          style={{ padding: '6px 8px', background: '#e0e7ff', color: '#3730a3', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' }}
                        >
                          Google Pay
                        </a>
                        <a 
                          href={`upi://pay?pa=${(upiVpa && upiVpa.includes('@')) ? upiVpa : 'paymojo@instamojo'}&pn=DIPARI%20AI&am=${instamojoCheckout.amount}&cu=INR`}
                          style={{ padding: '6px 8px', background: '#fae8ff', color: '#86198f', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' }}
                        >
                          PhonePe
                        </a>
                        <a 
                          href={`upi://pay?pa=${(upiVpa && upiVpa.includes('@')) ? upiVpa : 'paymojo@instamojo'}&pn=DIPARI%20AI&am=${instamojoCheckout.amount}&cu=INR`}
                          style={{ padding: '6px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' }}
                        >
                          Paytm UPI
                        </a>
                        <a 
                          href={`upi://pay?pa=${(upiVpa && upiVpa.includes('@')) ? upiVpa : 'paymojo@instamojo'}&pn=DIPARI%20AI&am=${instamojoCheckout.amount}&cu=INR`}
                          style={{ padding: '6px 8px', background: '#fef3c7', color: '#92400e', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' }}
                        >
                          BHIM UPI
                        </a>
                      </div>

                      {instamojoCheckout.paymentUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(instamojoCheckout.paymentUrl, '_blank', 'noopener,noreferrer')}
                          style={{ width: '100%', padding: '6px 10px', background: '#0a2540', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', marginTop: '4px' }}
                        >
                          🌐 Pay via Instamojo Gateway Web Link
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {instamojoPaymentMethod === 'card' && (
                <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 'bold' }}>Card Number:</label>
                  <input type="text" defaultValue="4111 •••• •••• 1111" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: '#0f172a' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" defaultValue="12/28" placeholder="MM/YY" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: '#0f172a' }} />
                    <input type="password" defaultValue="123" placeholder="CVV" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: '#0f172a' }} />
                  </div>
                </div>
              )}

              {instamojoPaymentMethod === 'netbanking' && (
                <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 'bold' }}>Select Your Bank:</label>
                  <select style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: '#0f172a', background: '#ffffff' }}>
                    <option>HDFC Bank (Net Banking)</option>
                    <option>ICICI Bank</option>
                    <option>State Bank of India (SBI)</option>
                    <option>Axis Bank</option>
                  </select>
                </div>
              )}

              {/* Primary Action Button: Confirm Payment Approval in UPI App */}
              <button
                type="button"
                onClick={handleConfirmInstamojoCheckout}
                disabled={isProcessingPayment || paymentTimerSeconds <= 0}
                style={{ width: '100%', padding: '14px', background: paymentTimerSeconds > 0 ? '#4f46e5' : '#94a3b8', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 800, cursor: isProcessingPayment ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)', marginTop: '8px' }}
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying UPI Payment Approval...
                  </>
                ) : (
                  <>
                    I Have Approved Payment in My UPI App <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- PAYMENT SUCCESS RECEIPT MODAL --- */}
      {paymentSuccessReceipt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 101, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '440px', width: '100%', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Payment Successful!</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Instamojo transaction completed successfully.</p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', textTransform: 'none', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Plan Subscribed:</span>
                <strong style={{ color: '#4f46e5' }}>{paymentSuccessReceipt.plan} Tier</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Amount Paid:</span>
                <strong style={{ color: '#0f172a' }}>₹{paymentSuccessReceipt.amount.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Transaction ID:</span>
                <span style={{ color: '#334155', fontFamily: 'monospace', fontSize: '0.75rem' }}>{paymentSuccessReceipt.paymentId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Date:</span>
                <span style={{ color: '#334155' }}>{paymentSuccessReceipt.date}</span>
              </div>
            </div>

            <button
              onClick={() => setPaymentSuccessReceipt(null)}
              style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Return to Business Profile
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
