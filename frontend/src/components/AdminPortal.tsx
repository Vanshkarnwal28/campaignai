import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Building, Activity, DollarSign, LifeBuoy, Terminal,
  Send, Settings, Search, RefreshCw, Cpu, Layers, LogOut,
  Calendar, Globe, Sliders, Database, Copy,
  Download, AlertCircle, FileText, CheckSquare, Plus, RefreshCcw
} from 'lucide-react';
import { api } from '../services/api';

interface AdminPortalProps {
  user: any;
  onLogout: () => void;
  addToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export function AdminPortal({ user, onLogout, addToast }: AdminPortalProps) {
  // Tabs: overview (Dashboard), clients (Mod 1), campaigns (Mod 2), scheduler (Mod 3), seo (Mod 4), finance (Mod 5), health (Mod 6), prompts, logs
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'campaigns' | 'scheduler' | 'seo' | 'finance' | 'health' | 'prompts' | 'logs'>('overview');

  // Real Database State (from existing endpoints)
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [businessesList, setBusinessesList] = useState<any[]>([]);
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active Workspace / Client Context
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [impersonating, setImpersonating] = useState<boolean>(false);

  // Module 1 Form state (Client brand detail overrides)
  const [overrideForm, setOverrideForm] = useState({
    businessName: '',
    usp: '',
    idealCustomer: '',
    offer: '',
    budget: '',
    brandColors: '',
    logoUrl: '',
  });

  // Module 2 states (Ad Creative Preview Tweak Sandbox)
  const [sandboxCopy, setSandboxCopy] = useState({
    primaryText: "Tired of fast fashion that ruins the environment? 🌍 Meet VibeWear. Crafted from 100% organic cotton streetwear designed to look good, feel premium, and protect the planet. 🔥 Get 50% off your first BOGO order today! #SustainableStreetwear #VibeWear",
    headline: "Urban Streetwear. Zero Ecological footprint. 🌿",
    description: "Premium organic street apparel for Gen Z. Buy 1, Get 1 50% Off - Limited Offer.",
    cta: "SHOP_NOW",
  });
  const [sandboxTweakPrompt, setSandboxTweakPrompt] = useState('');
  const [sandboxTargeting, setSandboxTargeting] = useState({
    interests: "Streetwear, Sustainable fashion, Eco-friendly, Sneakers, Urban culture",
    ageMin: 18,
    ageMax: 30,
    locations: "Mumbai, Bangalore, Delhi NCR, Pune",
  });
  const [sandboxBudget, setSandboxBudget] = useState(1000);
  const [sandboxDuration, setSandboxDuration] = useState(14);
  const [isRegeneratingSandbox, setIsRegeneratingSandbox] = useState(false);

  // Module 3 states (Social Post Scheduler & Auto-post Engine)
  const [schedulerPosts, setSchedulerPosts] = useState<any[]>([
    { id: 1, date: 5, platform: 'facebook', time: '10:00 AM', caption: 'Eco-streetwear has a new name. Meet VibeWear.', status: 'PUBLISHED' },
    { id: 2, date: 5, platform: 'instagram', time: '10:00 AM', caption: '🌿 Sustainable, style-forward, organic.', status: 'PUBLISHED' },
    { id: 3, date: 12, platform: 'google_business', time: '10:00 AM', caption: 'VibeWear Grand Opening: Buy 1 Get 1 50% Off!', status: 'FAILED', reason: 'Google API Token Expired' },
    { id: 4, date: 18, platform: 'instagram', time: '10:00 AM', caption: 'Gen Z streetwear made responsibly. Fresh drops every Friday.', status: 'QUEUED' },
    { id: 5, date: 24, platform: 'facebook', time: '10:00 AM', caption: 'Step out in comfort. 100% organic cotton hoods now live.', status: 'QUEUED' },
  ]);
  const [customInjectText, setCustomInjectText] = useState('');
  const [customInjectPlatform, setCustomInjectPlatform] = useState('instagram');
  const [customInjectTime, setCustomInjectTime] = useState('10:00 AM');
  const [customInjectDay, setCustomInjectDay] = useState(26);

  // Module 4 states (SEO Center)
  const [seoHealth, setSeoHealth] = useState({
    score: 84,
    missingTitles: 3,
    missingH1: 1,
    brokenLinks: 0,
    homepageTitle: "VibeWear Streetwear | Sustainable Organic Street Fashion",
    homepageDesc: "Urban streetwear crafted from 100% certified organic cotton. Explore eco-friendly unisex t-shirts, hoodies, and sneakers. Order now for 50% off BOGO.",
    schemaJson: `{
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  "name": "VibeWear",
  "url": "https://vibewear.techvision.in",
  "description": "Sustainable street fashion apparel store."
}`,
  });
  const [keywords, setKeywords] = useState([
    { word: "organic streetwear", volume: "4.5K", rank: 14, change: "▲6", status: "Improving" },
    { word: "sustainable hoodies", volume: "2.1K", rank: 8, change: "▲3", status: "Top 10" },
    { word: "eco-friendly street fashion", volume: "800", rank: 4, change: "▲10", status: "Top 5" },
    { word: "streetwear Gen Z India", volume: "1.2K", rank: 26, change: "▼2", status: "Neutral" },
  ]);
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // Module 5 states (Finance Splits)
  const [financeMetrics, setFinanceMetrics] = useState({
    activeStarterCount: 8,
    activeEliteCount: 12,
    grossRevenue: 160000, // INR total split model
    agencyFeePercentage: 20,
    gstPercentage: 18,
  });

  // Prompt edit states (from real endpoints)
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('campaign_generator');
  const [editedPromptText, setEditedPromptText] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // Platform setting states (real + visual)
  const [editedSettings, setEditedSettings] = useState<any>({});

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Load all system admin data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [st, usr, bus, cmp, sub, tkt, log, prm, stg] = await Promise.all([
        api.admin.getStats().catch(() => null),
        api.admin.getUsers().catch(() => []),
        api.admin.getBusinesses().catch(() => []),
        api.admin.getCampaigns().catch(() => []),
        api.admin.getSubscriptions().catch(() => []),
        api.admin.getTickets().catch(() => []),
        api.admin.getAuditLogs().catch(() => []),
        api.admin.getPrompts().catch(() => ({})),
        api.admin.getSettings().catch(() => null),
      ]);

      setStats(st);
      setUsersList(usr);
      setBusinessesList(bus);
      setCampaignsList(cmp);
      setSubscriptionsList(sub);
      setTicketsList(tkt);
      setAuditLogs(log);
      setPrompts(prm);
      setPlatformSettings(stg);

      if (stg) {
        setEditedSettings(stg);
      }

      if (prm && prm['campaign_generator']) {
        setEditedPromptText(prm['campaign_generator']);
      }

      // Select default workspace if available
      if (bus && bus.length > 0) {
        const defaultBus = bus[0];
        setSelectedBusinessId(defaultBus.id);
      }
    } catch (err: any) {
      addToast('Data Fetch Error', err.message || 'Failed to sync admin portal logs', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update client onboarding override form state when active business changes
  useEffect(() => {
    if (!selectedBusinessId) return;
    const activeBus = businessesList.find(b => b.id === selectedBusinessId);
    if (activeBus) {
      setOverrideForm({
        businessName: activeBus.name || '',
        usp: activeBus.profile?.usp || 'Sustainable organic cotton streetwear for Gen Z with urban aesthetics.',
        idealCustomer: activeBus.profile?.idealCustomer || 'Gen Z and young millennials (18-30) interested in green living and streetwear.',
        offer: activeBus.profile?.offer || 'Buy 1 Get 1 50% Off and Free Shipping on first order.',
        budget: activeBus.profile?.monthlyBudget ? `₹${activeBus.profile.monthlyBudget}` : '₹30,000 / month',
        brandColors: activeBus.profile?.brandColors || 'Deep Obsidian (#1A1A1A) and Neon Mint (#55EFC4)',
        logoUrl: activeBus.profile?.logoUrl || 'https://images.unsplash.com/photo-1579298245158-33e8f548f613?w=120&auto=format&fit=crop&q=60',
      });
    }
  }, [selectedBusinessId, businessesList]);

  // API operations
  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    try {
      await api.admin.updateUserRole(targetUserId, newRole);
      addToast('Role Updated', `User set to ${newRole}`, 'success');
      loadAdminData();
    } catch (err: any) {
      addToast('Update Failed', err.message, 'alert');
    }
  };

  const handleUpdateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      await api.admin.updateCampaignStatus(campaignId, status);
      addToast('Campaign Updated', `Status changed to ${status}`, 'success');
      loadAdminData();
    } catch (err: any) {
      addToast('Update Failed', err.message, 'alert');
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await api.admin.updateTicketStatus(ticketId, status);
      addToast('Ticket Updated', `Support ticket status set to ${status}`, 'success');
      loadAdminData();
    } catch (err: any) {
      addToast('Update Failed', err.message, 'alert');
    }
  };

  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    try {
      await api.admin.updatePrompt(selectedPromptKey, editedPromptText);
      addToast('Prompt Updated', `AI model template for ${selectedPromptKey} updated.`, 'success');
      setPrompts(prev => ({ ...prev, [selectedPromptKey]: editedPromptText }));
    } catch (err: any) {
      addToast('Save Failed', err.message, 'alert');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Onboarding Overrides (Module 1)
  const handleSaveOnboardingOverride = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Override Applied', `Onboarding answers updated on database for workspace: ${overrideForm.businessName}`, 'success');
    // Simulate updating in our local state list
    setBusinessesList(prev => prev.map(b => {
      if (b.id === selectedBusinessId) {
        return {
          ...b,
          name: overrideForm.businessName,
          profile: {
            ...b.profile,
            usp: overrideForm.usp,
            idealCustomer: overrideForm.idealCustomer,
            offer: overrideForm.offer,
            monthlyBudget: overrideForm.budget.replace(/[^0-9]/g, ''),
            brandColors: overrideForm.brandColors,
            logoUrl: overrideForm.logoUrl
          }
        };
      }
      return b;
    }));
  };

  // Re-render / Gemini Regenerate copy simulation (Module 2)
  const handleRegenerateAdCopy = () => {
    if (!sandboxTweakPrompt.trim()) return;
    setIsRegeneratingSandbox(true);

    setTimeout(() => {
      let updatedCopy = { ...sandboxCopy };
      const tweakLower = sandboxTweakPrompt.toLowerCase();

      if (tweakLower.includes('urgent') || tweakLower.includes('hurry') || tweakLower.includes('scarcity')) {
        updatedCopy.primaryText = "⏰ HURRY! Stock is running extremely low on our sustainable drop. Crafted from 100% organic cotton, these pieces won't restock! Get 50% Off BOGO before midnight tonight! 🚀 Use code ZEROFOOTPRINT. Buy yours now!";
        updatedCopy.headline = "BOGO 50% Off Expires TONIGHT! ⏰";
        updatedCopy.description = "Urgent sustainable streetwear deal. Order now, wear responsible fashion.";
      } else if (tweakLower.includes('formal') || tweakLower.includes('professional') || tweakLower.includes('minimal')) {
        updatedCopy.primaryText = "Discover structural streetwear designed with ecology in mind. VibeWear presents its debut collection made exclusively from certified organic fibers. Minimalist designs, maximal comfort, and zero carbon footprint. Enjoy BOGO half-off incentives for a limited time.";
        updatedCopy.headline = "Conscious Apparel. Built for Modernity.";
        updatedCopy.description = "Shop sustainable unisex hoodies and staples. Eco-friendly shipping guaranteed.";
      } else if (tweakLower.includes('emoji') || tweakLower.includes('casual')) {
        updatedCopy.primaryText = " streetwear that doesn't cost the Earth! 🌿👕 We made these hoodies 100% organic and incredibly soft. Buy one, get another half price!! 😍 Shipping is on us. Hit the button below and upgrade your wardrobe responsibly! 👇 #EcoStreetwear";
        updatedCopy.headline = "Upgrade Your Outfit & Protect Nature! ⚡";
        updatedCopy.description = "Exclusive Buy 1 Get 1 50% Off streetwear essentials. Free shipping included.";
      } else {
        // Generic tweak application
        updatedCopy.primaryText = `[AI Tweak: "${sandboxTweakPrompt}"] Tired of eco-unfriendly fashion? VibeWear streetwear is made responsibly with certified organic cotton. Premium street fit. Buy 1, Get 1 50% Off! 🔥`;
        updatedCopy.headline = `VibeWear: Sustainable street styling!`;
      }

      setSandboxCopy(updatedCopy);
      setIsRegeneratingSandbox(false);
      setSandboxTweakPrompt('');
      addToast('AI Regenerated', 'Gemini successfully rewrote copy variations based on prompt tweaks.', 'success');
    }, 1200);
  };

  // Event Scheduler - push holiday events (Module 3)
  const handlePushHolidayCampaign = (eventName: string) => {
    addToast('Campaign Broadcasted', `Injected automated template for "${eventName}" into active calendar slot for selected client workspaces.`, 'success');
    const newPost = {
      id: Date.now(),
      date: 15,
      platform: 'instagram',
      time: '10:00 AM',
      caption: `🎉 Wishing everyone a stellar and bright celebration! In honor of ${eventName}, enjoy 15% off sustainable street shirts. Use code HOLIDAY Conscientiously made.`,
      status: 'QUEUED'
    };
    setSchedulerPosts(prev => [...prev, newPost]);
  };

  // Event Scheduler - manual inject
  const handleInjectContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInjectText.trim()) return;

    const newPost = {
      id: Date.now(),
      date: Number(customInjectDay),
      platform: customInjectPlatform,
      time: customInjectTime,
      caption: customInjectText,
      status: 'QUEUED'
    };

    setSchedulerPosts(prev => [...prev, newPost]);
    setCustomInjectText('');
    addToast('Post Queued', `Custom post successfully injected into Queue Day ${customInjectDay}`, 'success');
  };

  // Re-run SEO Scan (Module 4)
  const triggerSeoScan = () => {
    addToast('SEO Scanner Running', 'Crawling domain links, indexing H1 elements, and analyzing site index status...', 'info');
    setTimeout(() => {
      setSeoHealth(prev => ({
        ...prev,
        score: 91,
        missingTitles: 1,
        missingH1: 0,
      }));
      addToast('SEO Audit Complete', 'Score upgraded to 91/100. Missing tags fixed.', 'success');
    }, 1500);
  };

  // Add Keyword (Module 4)
  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordInput.trim()) return;
    setKeywords(prev => [
      ...prev,
      { word: newKeywordInput, volume: "1.0K", rank: 45, change: "▲1", status: "New" }
    ]);
    setNewKeywordInput('');
    addToast('Keyword Added', 'Tracking initiated for new keyword term.', 'success');
  };

  // Save Settings (Module 6)
  const handleSaveSettings = async () => {
    try {
      await api.admin.updateSettings(editedSettings);
      setPlatformSettings(editedSettings);
      addToast('Settings Saved', 'Global node features and API details saved.', 'success');
    } catch (err: any) {
      addToast('Save Failed', err.message, 'alert');
    }
  };

  // Calculations for Invoices and Splitting Ledger (Module 5)
  const activeClientObject = businessesList.find(b => b.id === selectedBusinessId) || { name: 'VibeWear Streetwear' };
  const currentPlan = subscriptionsList.find(s => s.businessId === selectedBusinessId)?.plan || 'Elite Plan (₹10,000)';

  // Calculate pricing split
  const isStarter = currentPlan.toLowerCase().includes('starter') || currentPlan.toLowerCase().includes('5,000') || !currentPlan;
  const billAmount = isStarter ? 5000 : 10000;
  const splitAdWallet = Math.round(billAmount * 0.5); // 50% split for Meta ad budget
  const splitAgencyFee = Math.round(billAmount * 0.2); // 20% Net Agency fee
  const splitGst = Math.round((splitAgencyFee + splitAdWallet) * 0.18); // 18% Statutory GST
  const splitHostingReserve = billAmount - splitAdWallet - splitAgencyFee - splitGst;

  // Toggle active starter/elite split (finance metrics simulation)
  const handleSimulateSplitTweak = (tier: 'starter' | 'elite', operation: 'add' | 'remove') => {
    setFinanceMetrics(prev => {
      const change = operation === 'add' ? 1 : -1;
      const countKey = tier === 'starter' ? 'activeStarterCount' : 'activeEliteCount';
      const cost = tier === 'starter' ? 5000 : 10000;
      const newCount = Math.max(0, prev[countKey] + change);
      const diff = (newCount - prev[countKey]) * cost;

      return {
        ...prev,
        [countKey]: newCount,
        grossRevenue: prev.grossRevenue + diff
      };
    });
    addToast('Ledger Simulated', 'Updated ledger projection totals.', 'info');
  };

  // Render client impersonation screen if active
  if (impersonating) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          background: 'linear-gradient(90deg, #0076a3 0%, #0b2240 100%)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 14px rgba(0, 118, 163, 0.2)',
          borderBottom: '1px solid rgba(0,118,163,0.3)',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              display: 'inline-flex', padding: '3px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', fontWeight: 700
            }}>IMPERSONATION ACTIVE</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Viewing Workspace: <strong>{activeClientObject.name}</strong></span>
          </div>
          <button
            onClick={() => {
              setImpersonating(false);
              addToast('Impersonation Terminated', 'Returned back to Super Admin Dashboard context.', 'info');
            }}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid #ffffff',
              background: 'transparent', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Exit Client View
          </button>
        </div>

        {/* Impersonated Screen Preview */}
        <div style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Business Dashboard Overview</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Welcome, {activeClientObject.name} team. Here is your AI automated campaign performance.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ padding: '6px 12px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 8, color: '#4ade80', fontSize: '0.75rem', fontWeight: 600 }}>
                ● AI Engine Online
              </span>
              <span style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#94a3b8', fontSize: '0.75rem' }}>
                Subscription: {currentPlan}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <div className="glass-panel" style={{ padding: 20, background: 'rgba(30, 41, 59, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>MONTHLY LEAD TARGET</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>134 Leads <span style={{ fontSize: '0.9rem', color: '#4ade80' }}>+12%</span></div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: '67%', height: '100%', background: '#0076a3' }} />
              </div>
            </div>
            <div className="glass-panel" style={{ padding: 20, background: 'rgba(30, 41, 59, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ACTIVE ADS BUDGET</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>₹{splitAdWallet.toLocaleString()}/mo</div>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 12 }}>Automatically syncing with Meta Ads Manager daily</p>
            </div>
            <div className="glass-panel" style={{ padding: 20, background: 'rgba(30, 41, 59, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>CREATIVE ASSETS GENERATED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>48 assets</div>
              <p style={{ fontSize: '0.7rem', color: '#4ade80', marginTop: 12 }}>All assets successfully uploaded to local storage</p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 24, background: 'rgba(30, 41, 59, 0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Onboarding Responses Provided by Client</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.85rem' }}>
              <div>
                <strong style={{ color: '#0076a3' }}>What is your Business name?</strong>
                <p style={{ color: '#f8fafc', marginTop: 4, marginBottom: 12 }}>{overrideForm.businessName}</p>

                <strong style={{ color: '#0076a3' }}>Ideal Target customer demographics?</strong>
                <p style={{ color: '#f8fafc', marginTop: 4, marginBottom: 12 }}>{overrideForm.idealCustomer}</p>

                <strong style={{ color: '#0076a3' }}>Core offer or promotion?</strong>
                <p style={{ color: '#f8fafc', marginTop: 4, marginBottom: 12 }}>{overrideForm.offer}</p>
              </div>
              <div>
                <strong style={{ color: '#0076a3' }}>Unique Selling Proposition (USP)?</strong>
                <p style={{ color: '#f8fafc', marginTop: 4, marginBottom: 12 }}>{overrideForm.usp}</p>

                <strong style={{ color: '#0076a3' }}>Preferred monthly marketing budget?</strong>
                <p style={{ color: '#f8fafc', marginTop: 4, marginBottom: 12 }}>{overrideForm.budget}</p>

                <strong style={{ color: '#0076a3' }}>Official brand colors?</strong>
                <p style={{ color: '#f8fafc', marginTop: 4, marginBottom: 12 }}>{overrideForm.brandColors}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filtered Lists
  const filteredUsers = usersList.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#040d1a', color: '#f8fafc', fontFamily: 'var(--font-sans)' }}>

      {/* --- ADMIN SIDEBAR (TechVision Navy #0b2240 with Cyan Accents) --- */}
      <aside style={{
        width: 270,
        background: '#061329',
        borderRight: '1px solid rgba(0, 118, 163, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: 22,
        position: 'sticky',
        top: 0,
        height: '100vh'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #0076a3 0%, #0b2240 100%)',
            border: '1.5px solid rgba(0, 118, 163, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 4px 14px rgba(0, 118, 163, 0.3)'
          }}>
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>TechVision</div>
            <div style={{ fontSize: '0.65rem', color: '#0076a3', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Automated Hub</div>
          </div>
        </div>

        {/* Global Operations Badge */}
        <div style={{
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(34, 197, 94, 0.04)',
          border: '1px solid rgba(34, 197, 94, 0.15)',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4ade80' }}>All Nodes Operational</div>
        </div>

        {/* Workspace Dropdown context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Business Context</label>
          <div style={{ position: 'relative' }}>
            <Building size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#0076a3' }} />
            <select
              value={selectedBusinessId}
              onChange={e => setSelectedBusinessId(e.target.value)}
              style={{
                width: '100%',
                background: '#040d1a',
                border: '1px solid rgba(0, 118, 163, 0.3)',
                borderRadius: 8,
                padding: '8px 10px 8px 30px',
                color: '#ffffff',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {businessesList.map(b => (
                <option key={b.id} value={b.id}>{b.name || `Business ${b.id.slice(0,6)}`}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {[
            { id: 'overview', label: 'Executive Overview', icon: Activity },
            { id: 'clients', label: 'Client Onboardings', icon: Users, badge: businessesList.length },
            { id: 'campaigns', label: 'Ad Approvals Sandbox', icon: Layers, badge: campaignsList.length },
            { id: 'scheduler', label: 'Content Scheduler', icon: Calendar },
            { id: 'seo', label: 'SEO & Performance', icon: Globe },
            { id: 'finance', label: 'GST Bookkeeping & Ledger', icon: DollarSign },
            { id: 'health', label: 'Node & API Health', icon: Database },
            { id: 'prompts', label: 'System AI Prompts', icon: Cpu },
            { id: 'logs', label: 'Security Audit Logs', icon: Terminal },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, rgba(0, 118, 163, 0.2), rgba(11, 34, 64, 0.3))' : 'transparent',
                  borderLeft: isActive ? '3px solid #0076a3' : '3px solid transparent',
                  color: isActive ? '#f8fafc' : '#94a3b8', fontWeight: isActive ? 600 : 400,
                  fontSize: '0.8rem', transition: 'all 0.15s ease', textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={16} style={{ color: isActive ? '#0076a3' : '#64748b' }} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{
                    padding: '1px 6px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700,
                    background: isActive ? '#0076a3' : 'rgba(255,255,255,0.08)', color: '#fff'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin profile footer */}
        <div style={{
          padding: 12, borderRadius: 12, background: 'rgba(11,34,64,0.3)',
          border: '1px solid rgba(0,118,163,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#0076a3', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem'
            }}>
              {(user?.name || 'A')[0]}
            </div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>{user?.name || 'Admin'}</div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Super Admin</div>
            </div>
          </div>
          <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* --- MAIN ADMIN CONTENT AREA --- */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', background: '#030712' }}>

        {/* Top Header */}
        <header style={{
          padding: '16px 32px', background: 'rgba(3, 7, 18, 0.8)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0, 118, 163, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', textTransform: 'capitalize' }}>
              {activeTab === 'overview' && 'Executive Overview & Main Command Center'}
              {activeTab === 'clients' && 'Module 1: Client & Onboarding Workspace'}
              {activeTab === 'campaigns' && 'Module 2: Campaign Approval & Ad Manager Hub'}
              {activeTab === 'scheduler' && 'Module 3: Content Calendar & Social Scheduler'}
              {activeTab === 'seo' && 'Module 4: Website SEO & Performance Center'}
              {activeTab === 'finance' && 'Module 5: Finance, Invoicing & GST Accounting'}
              {activeTab === 'health' && 'Module 6: System Settings & API Health Management'}
              {activeTab === 'prompts' && 'System Prompts Config'}
              {activeTab === 'logs' && 'Platform Audit Logs'}
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Logged in as Super Admin • Node ID: tv-digital-node-prod-02 • Release: {stats?.systemVersion || 'v2.4.0'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={loadAdminData} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', gap: 6, border: '1px solid rgba(0,118,163,0.3)', color: '#0076a3' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Telemetry
            </button>
          </div>
        </header>

        {/* Body Content */}
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* 1. EXECUTIVE OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* Executive Alerts Ticker */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={18} style={{ color: '#ef4444' }} />
                  <span style={{ color: '#fca5a5' }}>
                    <strong>System Alert:</strong> Google Business Profile authorization expired for client workspace: <strong>{activeClientObject.name}</strong>.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('clients')}
                  style={{
                    background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: 6,
                    padding: '4px 12px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Verify Tokens
                </button>
              </div>

              {/* KPI Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div className="glass-panel" style={{ padding: 20, background: 'rgba(11,34,64,0.15)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL ACTIVE CLIENTS</span>
                    <Users size={16} style={{ color: '#0076a3' }} />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: 8 }}>{businessesList.length} Accounts</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
                    Starter Plans: <span style={{ color: '#0076a3', fontWeight: 700 }}>{financeMetrics.activeStarterCount}</span> • Elite Plans: <span style={{ color: '#0076a3', fontWeight: 700 }}>{financeMetrics.activeEliteCount}</span>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 20, background: 'rgba(11,34,64,0.15)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>ACTIVE META AD SPEND</span>
                    <Layers size={16} style={{ color: '#0076a3' }} />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: 8 }}>₹{((financeMetrics.activeStarterCount * 2500) + (financeMetrics.activeEliteCount * 5000)).toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: 8 }}>
                    ▲ Live budgets syncing via Meta Ads Graph API
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 20, background: 'rgba(11,34,64,0.15)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>PENDING AI APPROVALS</span>
                    <Cpu size={16} style={{ color: '#0076a3' }} />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: 8 }}>3 campaigns</div>
                  <div style={{ fontSize: '0.75rem', color: '#eab308', marginTop: 8 }}>
                    Awaiting human review in approval sandbox
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 20, background: 'rgba(11,34,64,0.15)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL REVENUE COLLECTED</span>
                    <DollarSign size={16} style={{ color: '#0076a3' }} />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: 8 }}>₹{financeMetrics.grossRevenue.toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
                    GST Tax Liability (18%): ₹{(financeMetrics.grossRevenue * 0.18).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Operations Overview Split Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                {/* Active Clients and Meta Budget health */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Live Onboarding Workspace Matrix</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,118,163,0.2)', color: '#94a3b8', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>Client Workspace</th>
                          <th style={{ padding: '8px 12px' }}>Plan Tier</th>
                          <th style={{ padding: '8px 12px' }}>Meta Graph Token</th>
                          <th style={{ padding: '8px 12px' }}>GBP Token</th>
                          <th style={{ padding: '8px 12px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {businessesList.map(b => {
                          const plan = subscriptionsList.find(s => s.businessId === b.id)?.plan || 'Elite Plan (₹10,000)';
                          const isGBPActive = b.id !== selectedBusinessId; // Simulating only GBP token failure for selected client
                          return (
                            <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '12px 12px', fontWeight: 600 }}>{b.name || 'Client Workspace'}</td>
                              <td style={{ padding: '12px 12px', color: '#0076a3', fontWeight: 600 }}>{plan}</td>
                              <td style={{ padding: '12px 12px' }}>
                                <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  ● Active
                                </span>
                              </td>
                              <td style={{ padding: '12px 12px' }}>
                                <span style={{ color: isGBPActive ? '#4ade80' : '#ef4444', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  ● {isGBPActive ? 'Active' : 'Expired'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 12px' }}>
                                <button
                                  onClick={() => {
                                    setSelectedBusinessId(b.id);
                                    setActiveTab('clients');
                                  }}
                                  style={{
                                    background: 'transparent', border: '1px solid rgba(0,118,163,0.3)',
                                    borderRadius: 6, color: '#0076a3', fontSize: '0.7rem', padding: '3px 8px', cursor: 'pointer'
                                  }}
                                >
                                  Open
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* VPS and node analytics summary */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Hostinger Node Stats</h3>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Logs Count: {stats?.auditLogsCount || 0}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>
                      <span>VPS CPU Usage</span>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>34%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: '34%', height: '100%', background: '#0076a3' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>
                      <span>RAM Utilization</span>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>2.1 GB / 8 GB</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: '26.25%', height: '100%', background: '#0076a3' }} />
                    </div>
                  </div>

                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(0,118,163,0.05)', border: '1px solid rgba(0,118,163,0.15)', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: '#93c5fd', marginBottom: 4 }}>BullMQ Redis Queue</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                      <span style={{ color: '#94a3b8' }}>Jobs Completed:</span>
                      <span style={{ fontWeight: 700 }}>1,489</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                      <span style={{ color: '#94a3b8' }}>Active Jobs:</span>
                      <span style={{ color: '#4ade80', fontWeight: 700 }}>1</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 2. CLIENT & ONBOARDING TAB (MODULE 1) */}
          {activeTab === 'clients' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
              {/* Question response viewer and profile update */}
              <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>10-Question Onboarding Responses</h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Workspace: <strong>{activeClientObject.name}</strong></span>
                </div>

                <form onSubmit={handleSaveOnboardingOverride} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>1. BUSINESS LEGAL NAME / BRAND</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.85rem', padding: '10px 14px', background: '#040d1a', color: '#fff', border: '1px solid rgba(0,118,163,0.25)' }}
                      value={overrideForm.businessName}
                      onChange={e => setOverrideForm({ ...overrideForm, businessName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>2. BRAND UNIQUE SELLING PROPOSITION (USP)</label>
                    <textarea
                      rows={2}
                      className="form-input"
                      style={{ fontSize: '0.85rem', padding: '10px 14px', background: '#040d1a', color: '#fff', border: '1px solid rgba(0,118,163,0.25)' }}
                      value={overrideForm.usp}
                      onChange={e => setOverrideForm({ ...overrideForm, usp: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>3. IDEAL TARGET CUSTOMER / DEMOGRAPHICS</label>
                    <textarea
                      rows={2}
                      className="form-input"
                      style={{ fontSize: '0.85rem', padding: '10px 14px', background: '#040d1a', color: '#fff', border: '1px solid rgba(0,118,163,0.25)' }}
                      value={overrideForm.idealCustomer}
                      onChange={e => setOverrideForm({ ...overrideForm, idealCustomer: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>4. MARKETING CORE OFFER</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '0.85rem', padding: '10px 14px', background: '#040d1a', color: '#fff', border: '1px solid rgba(0,118,163,0.25)' }}
                        value={overrideForm.offer}
                        onChange={e => setOverrideForm({ ...overrideForm, offer: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>5. MONTHLY ESTIMATED BUDGET</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '0.85rem', padding: '10px 14px', background: '#040d1a', color: '#fff', border: '1px solid rgba(0,118,163,0.25)' }}
                        value={overrideForm.budget}
                        onChange={e => setOverrideForm({ ...overrideForm, budget: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>6. BRAND ACCENT COLORS & HEX CODES</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.85rem', padding: '10px 14px', background: '#040d1a', color: '#fff', border: '1px solid rgba(0,118,163,0.25)' }}
                      value={overrideForm.brandColors}
                      onChange={e => setOverrideForm({ ...overrideForm, brandColors: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>7. OFFICIAL LOGO URL</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.85rem', padding: '10px 14px', background: '#040d1a', color: '#fff', border: '1px solid rgba(0,118,163,0.25)' }}
                      value={overrideForm.logoUrl}
                      onChange={e => setOverrideForm({ ...overrideForm, logoUrl: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <button type="submit" className="btn-primary" style={{ padding: '10px 20px', background: '#0076a3', border: '1px solid rgba(0,118,163,0.3)', fontSize: '0.8rem', borderRadius: 8 }}>
                      Save Onboarding Overrides
                    </button>
                  </div>
                </form>
              </div>

              {/* Tokens matrix and Impersonation launcher */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Token Matrix */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>API Token & Authorization Matrix</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { name: 'Meta Graph API', key: 'meta', active: true, desc: 'Used for Facebook campaigns' },
                      { name: 'Instagram Graph API', key: 'instagram', active: true, desc: 'Used for organic scheduling' },
                      { name: 'Google Business Profile', key: 'gbp', active: selectedBusinessId !== businessesList[0]?.id, desc: 'Used for local map listings' },
                    ].map(token => (
                      <div key={token.key} style={{
                        padding: 14, borderRadius: 10, background: 'rgba(4,13,26,0.5)',
                        border: '1px solid rgba(0,118,163,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{token.name}</span>
                            <span style={{
                              padding: '2px 6px', borderRadius: 6, fontSize: '0.6rem', fontWeight: 700,
                              background: token.active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: token.active ? '#4ade80' : '#ef4444'
                            }}>
                              {token.active ? 'ACTIVE' : 'EXPIRED'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>{token.desc}</div>
                        </div>
                        {!token.active && (
                          <button
                            onClick={() => {
                              addToast('Simulating Auth', `Opening OAuth popup dialog to re-authorize ${token.name}...`, 'info');
                              setTimeout(() => {
                                addToast('OAuth Success', `${token.name} token refreshed successfully.`, 'success');
                                loadAdminData();
                              }, 1200);
                            }}
                            style={{
                              background: '#0076a3', border: 'none', borderRadius: 6,
                              padding: '5px 10px', fontSize: '0.7rem', color: '#fff', fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            Authorize
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impersonation Mode */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Troubleshooting Console</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: 18 }}>
                    Need to preview the workspace exactly as the client sees it? Impersonate the client with one click.
                  </p>
                  <button
                    onClick={() => {
                      setImpersonating(true);
                      addToast('Impersonating Workspace', `Entering client console for: ${activeClientObject.name}`, 'info');
                    }}
                    style={{
                      width: '100%', background: 'linear-gradient(135deg, #0076a3 0%, #0b2240 100%)',
                      border: '1px solid rgba(0,118,163,0.3)', color: '#ffffff', fontWeight: 700,
                      padding: '12px 20px', borderRadius: 10, fontSize: '0.85rem', cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0, 118, 163, 0.25)'
                    }}
                  >
                    Login as Client ("{activeClientObject.name}")
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. CAMPAIGN APPROVAL SANDBOX (MODULE 2) */}
          {activeTab === 'campaigns' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Creative Sandbox Customizer */}
              <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>AI Copywriter & Creative Sandbox</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Review copy generated by Gemini and request adjustments before publishing.</p>
                </div>

                {/* Gemini Copy Customizer prompt */}
                <div style={{
                  background: 'rgba(0,118,163,0.05)',
                  border: '1px solid rgba(0,118,163,0.2)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#93c5fd' }}>TWEAK COPY WITH GEMINI</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Make headline more urgent, change tone to casual"
                      style={{ background: '#040d1a', border: '1px solid rgba(0,118,163,0.25)', fontSize: '0.8rem', padding: '10px 14px' }}
                      value={sandboxTweakPrompt}
                      onChange={e => setSandboxTweakPrompt(e.target.value)}
                    />
                    <button
                      onClick={handleRegenerateAdCopy}
                      disabled={isRegeneratingSandbox}
                      style={{
                        padding: '10px 18px', background: '#0076a3', border: 'none',
                        borderRadius: 10, color: '#ffffff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isRegeneratingSandbox ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>
                </div>

                {/* Target Audience Inspector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Sliders size={14} style={{ color: '#0076a3' }} />
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>TARGET AUDIENCE CONFIGURATION</label>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Audience Interests (Meta Tags)</span>
                    <input
                      type="text"
                      className="form-input"
                      style={{ background: '#040d1a', border: '1px solid rgba(0,118,163,0.15)', fontSize: '0.8rem', padding: '8px 12px', marginTop: 4 }}
                      value={sandboxTargeting.interests}
                      onChange={e => setSandboxTargeting({ ...sandboxTargeting, interests: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Age range</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                        <input
                          type="number"
                          className="form-input"
                          style={{ background: '#040d1a', border: '1px solid rgba(0,118,163,0.15)', fontSize: '0.8rem', padding: '8px 12px', textAlign: 'center' }}
                          value={sandboxTargeting.ageMin}
                          onChange={e => setSandboxTargeting({ ...sandboxTargeting, ageMin: Number(e.target.value) })}
                        />
                        <span style={{ color: '#94a3b8' }}>to</span>
                        <input
                          type="number"
                          className="form-input"
                          style={{ background: '#040d1a', border: '1px solid rgba(0,118,163,0.15)', fontSize: '0.8rem', padding: '8px 12px', textAlign: 'center' }}
                          value={sandboxTargeting.ageMax}
                          onChange={e => setSandboxTargeting({ ...sandboxTargeting, ageMax: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Target Locations</span>
                      <input
                        type="text"
                        className="form-input"
                        style={{ background: '#040d1a', border: '1px solid rgba(0,118,163,0.15)', fontSize: '0.8rem', padding: '8px 12px', marginTop: 4 }}
                        value={sandboxTargeting.locations}
                        onChange={e => setSandboxTargeting({ ...sandboxTargeting, locations: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Budget & Duration Overrides */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>DAILY BUDGET (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ background: '#040d1a', border: '1px solid rgba(0,118,163,0.15)', fontSize: '0.8rem', padding: '8px 12px' }}
                      value={sandboxBudget}
                      onChange={e => setSandboxBudget(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>CAMPAIGN DURATION (DAYS)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ background: '#040d1a', border: '1px solid rgba(0,118,163,0.15)', fontSize: '0.8rem', padding: '8px 12px' }}
                      value={sandboxDuration}
                      onChange={e => setSandboxDuration(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Real database status updater */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>PLATFORM LIVE CAMPAIGNS MONITOR</label>
                  <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {campaignsList.filter(c => c.businessId === selectedBusinessId).map(c => (
                      <div key={c.id} style={{
                        padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,118,163,0.15)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem'
                      }}>
                        <span>{c.name} ({c.objective})</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ color: '#4ade80', fontWeight: 600 }}>₹{c.dailyBudget}/day</span>
                          <button
                            onClick={() => handleUpdateCampaignStatus(c.id, c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
                            style={{
                              background: c.status === 'ACTIVE' ? '#ef4444' : '#22c55e', border: 'none', borderRadius: 4,
                              padding: '2px 6px', color: '#fff', fontSize: '0.65rem', cursor: 'pointer'
                            }}
                          >
                            {c.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button
                    onClick={() => addToast('Campaign Approved', 'Successfully verified copy and pushed to Meta Ads Manager API.', 'success')}
                    style={{ flex: 1, padding: '12px 20px', background: '#22c55e', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Approve & Deploy to Meta
                  </button>
                </div>
              </div>

              {/* Feed Preview Sandbox (Interactive Social Post mockup) */}
              <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Meta Ad Preview (Instagram/Facebook Feed)</h3>

                <div style={{
                  background: '#0a0f1d',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  fontFamily: 'system-ui'
                }}>
                  {/* Post Header */}
                  <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0076a3 0%, #0b2240 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem'
                    }}>
                      {activeClientObject.name[0] || 'V'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{activeClientObject.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 1 }}>Sponsored • Instagram Ads</div>
                    </div>
                  </div>

                  {/* Post Caption */}
                  <div style={{ padding: '0 14px 12px 14px', fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                    {sandboxCopy.primaryText}
                  </div>

                  {/* Post Image Container */}
                  <div style={{
                    width: '100%', height: 260,
                    background: 'linear-gradient(135deg, #081225 0%, #0b2240 100%)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    padding: 24,
                    textAlign: 'center'
                  }}>
                    {/* Glowing effect inside ad preview */}
                    <div style={{
                      position: 'absolute', width: 140, height: 140, borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(0, 118, 163, 0.25) 0%, transparent 70%)',
                      filter: 'blur(30px)'
                    }} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#0076a3', letterSpacing: '0.1em', zIndex: 2 }}>{activeClientObject.name}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: 8, zIndex: 2, maxWidth: 300 }}>{sandboxCopy.headline}</div>
                    <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600, marginTop: 12, zIndex: 2 }}>{overrideForm.offer}</div>
                  </div>

                  {/* Post Footer Callout */}
                  <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#070a14' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>VIBEWEAR.TECHVISION.IN</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{sandboxCopy.headline.slice(0, 32)}...</span>
                    </div>
                    <button style={{
                      background: '#0076a3', color: '#fff', border: 'none', borderRadius: 4,
                      padding: '8px 16px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                    }}>
                      {sandboxCopy.cta.replace('_', ' ')}
                    </button>
                  </div>
                </div>

                {/* Ad Performance Estimator stats */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: 16,
                  borderRadius: 12,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12,
                  textAlign: 'center',
                  fontSize: '0.75rem'
                }}>
                  <div>
                    <div style={{ color: '#94a3b8' }}>Estimated Impressions</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 2, color: '#fff' }}>32K - 54K</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8' }}>Target CTR</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 2, color: '#0076a3' }}>3.24%</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8' }}>Estimated CPC</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 2, color: '#22c55e' }}>₹12.50</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. CONTENT CALENDAR & SOCIAL SCHEDULER (MODULE 3) */}
          {activeTab === 'scheduler' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 24 }}>
              {/* Monthly Post Calendar */}
              <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Global Social Schedule Calendar</h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Engine Slot: <strong>10:00 AM Auto-Post Engine</strong></span>
                </div>

                {/* Calendar Grid representation */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 18 }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, paddingBottom: 6 }}>{day}</div>
                  ))}
                  {Array.from({ length: 30 }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dayPosts = schedulerPosts.filter(p => p.date === dayNum);
                    return (
                      <div key={idx} style={{
                        height: 64, border: '1px solid rgba(0, 118, 163, 0.1)', borderRadius: 8,
                        background: 'rgba(4, 13, 26, 0.4)', padding: 6, position: 'relative',
                        display: 'flex', flexDirection: 'column', gap: 4
                      }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>{dayNum}</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {dayPosts.map(p => (
                            <span key={p.id} title={p.caption} style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: p.status === 'PUBLISHED' ? '#22c55e' : p.status === 'FAILED' ? '#ef4444' : '#0076a3'
                            }} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status Queue table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
                    <CheckSquare size={16} style={{ color: '#0076a3' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>AUTO-POST ENGINE QUEUE (ACTIVE CAMPAIGN)</span>
                  </div>
                  {schedulerPosts.map(post => (
                    <div key={post.id} style={{
                      padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.65rem',
                          background: post.platform === 'facebook' ? '#1877f2' : post.platform === 'instagram' ? '#e1306c' : '#4285f4', color: '#fff'
                        }}>{post.platform.toUpperCase()}</span>
                        <span style={{ color: '#e2e8f0', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{post.caption}"</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8' }}>Day {post.date} @ {post.time}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700,
                          background: post.status === 'PUBLISHED' ? 'rgba(34, 197, 94, 0.15)' : post.status === 'FAILED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 118, 163, 0.15)',
                          color: post.status === 'PUBLISHED' ? '#4ade80' : post.status === 'FAILED' ? '#ef4444' : '#0076a3'
                        }}>{post.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event festival pushes & Manual injector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Event Festival Manager */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                    <RefreshCcw size={16} style={{ color: '#0076a3' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Event & Festival Manager</h3>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 14, lineHeight: 1.4 }}>
                    Push holiday creative layouts to all client accounts simultaneously.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { name: 'Diwali Festive Sale Campaign', date: 'November' },
                      { name: 'New Year Spectacular Promo', date: 'January 1' },
                      { name: 'Independence Day BOGO Splash', date: 'August 15' },
                    ].map((fest, idx) => (
                      <div key={idx} style={{
                        padding: 12, borderRadius: 10, background: 'rgba(4,13,26,0.4)',
                        border: '1px solid rgba(0,118,163,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{fest.name}</div>
                          <span style={{ fontSize: '0.65rem', color: '#0076a3' }}>Schedule: {fest.date}</span>
                        </div>
                        <button
                          onClick={() => handlePushHolidayCampaign(fest.name)}
                          style={{
                            background: '#0076a3', border: 'none', borderRadius: 6,
                            padding: '4px 10px', fontSize: '0.65rem', color: '#fff', cursor: 'pointer', fontWeight: 600
                          }}
                        >
                          Push Bulk
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manual Content Injector */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Manual Creative Injector</h3>
                  <form onSubmit={handleInjectContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Caption Text</span>
                      <textarea
                        className="form-input"
                        rows={2}
                        placeholder="Write social post caption here (bypasses AI)..."
                        style={{ fontSize: '0.8rem', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)', marginTop: 4 }}
                        value={customInjectText}
                        onChange={e => setCustomInjectText(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Platform</span>
                        <select
                          className="form-input"
                          style={{ fontSize: '0.8rem', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)', padding: '6px 10px', marginTop: 4 }}
                          value={customInjectPlatform}
                          onChange={e => setCustomInjectPlatform(e.target.value)}
                        >
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="google_business">Google Map GBP</option>
                        </select>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Day of Month</span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          className="form-input"
                          style={{ fontSize: '0.8rem', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)', padding: '6px 10px', marginTop: 4 }}
                          value={customInjectDay}
                          onChange={e => setCustomInjectDay(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Queue Time</span>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '0.8rem', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)', padding: '6px 10px', marginTop: 4 }}
                          value={customInjectTime}
                          onChange={e => setCustomInjectTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <button type="submit" style={{
                      padding: '10px 16px', background: '#0076a3', border: 'none', borderRadius: 8,
                      color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', marginTop: 6
                    }}>
                      Inject into Queue
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* 5. Website SEO & Performance Center (MODULE 4) */}
          {activeTab === 'seo' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 24 }}>
              {/* Site Health & AI Meta Tags */}
              <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>On-Page SEO Site Audit</h3>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Automated site crawler and indexing status.</p>
                  </div>
                  <button onClick={triggerSeoScan} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', border: '1px solid rgba(0,118,163,0.3)', color: '#0076a3' }}>
                    Trigger Crawl Audit
                  </button>
                </div>

                {/* Audit numbers grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, textAlign: 'center' }}>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(0,118,163,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Health Score</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4ade80', marginTop: 4 }}>{seoHealth.score}%</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Missing H1s</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: seoHealth.missingH1 > 0 ? '#ef4444' : '#4ade80', marginTop: 4 }}>{seoHealth.missingH1}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Missing Titles</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: seoHealth.missingTitles > 0 ? '#ef4444' : '#4ade80', marginTop: 4 }}>{seoHealth.missingTitles}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Broken Links</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4ade80', marginTop: 4 }}>{seoHealth.brokenLinks}</div>
                  </div>
                </div>

                {/* AI Meta tag review */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>AI META-TAG GENERATOR & OVERRIDES</label>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Homepage Meta Title</span>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.8rem', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)', marginTop: 4 }}
                      value={seoHealth.homepageTitle}
                      onChange={e => setSeoHealth({ ...seoHealth, homepageTitle: e.target.value })}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Homepage Meta Description</span>
                    <textarea
                      rows={3}
                      className="form-input"
                      style={{ fontSize: '0.8rem', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)', marginTop: 4 }}
                      value={seoHealth.homepageDesc}
                      onChange={e => setSeoHealth({ ...seoHealth, homepageDesc: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Local JSON-LD Schema</span>
                    <textarea
                      rows={4}
                      className="form-input"
                      style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)' }}
                      value={seoHealth.schemaJson}
                      onChange={e => setSeoHealth({ ...seoHealth, schemaJson: e.target.value })}
                    />
                  </div>

                  <button
                    onClick={() => addToast('Meta Tags Saved', 'AI schema and meta descriptions committed to Hostinger node header.', 'success')}
                    style={{ padding: '10px 16px', background: '#0076a3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Approve Meta Tags & Update Site
                  </button>
                </div>
              </div>

              {/* Snippet Delivery Hub & Keywords */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Snippet Hub */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Manual Snippet Injection Hub</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12, lineHeight: 1.4 }}>
                    Deploy the CampaignAI indexing and leads tracking snippet into your clients WordPress or Shopify sites.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ fontSize: '0.65rem', color: '#0076a3', fontWeight: 700, display: 'block', marginBottom: 4 }}>JAVASCRIPT TRACKER SCRIPT (WordPress / Shopify Header)</span>
                      <pre style={{
                        padding: 12, background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)', borderRadius: 8,
                        fontSize: '0.7rem', color: '#a5b4fc', overflowX: 'auto', fontFamily: 'monospace'
                      }}>
                        {`<script src="https://cdn.campaignai.in/tracker.js" id="cai-tracker" data-workspace="${selectedBusinessId}"></script>`}
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`<script src="https://cdn.campaignai.in/tracker.js" id="cai-tracker" data-workspace="${selectedBusinessId}"></script>`);
                          addToast('Copied', 'JS tracking snippet copied to clipboard.', 'success');
                        }}
                        style={{
                          position: 'absolute', right: 10, top: 22, background: 'rgba(255,255,255,0.08)',
                          border: 'none', borderRadius: 4, padding: '3px 6px', color: '#fff', cursor: 'pointer', display: 'flex'
                        }}
                      >
                        <Copy size={12} />
                      </button>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4 }}>
                      For manual redirects injection: upload the tracking block directly to the server `.htaccess` file or target theme.
                    </div>
                  </div>
                </div>

                {/* Keyword tracking board */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Keyword Tracking Board</h3>

                  {/* Add Keyword Form */}
                  <form onSubmit={handleAddKeyword} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter search term..."
                      style={{ fontSize: '0.75rem', padding: '6px 10px', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)' }}
                      value={newKeywordInput}
                      onChange={e => setNewKeywordInput(e.target.value)}
                    />
                    <button type="submit" style={{
                      padding: '6px 12px', background: '#0076a3', border: 'none', borderRadius: 6,
                      color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <Plus size={12} /> Add
                    </button>
                  </form>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0,118,163,0.2)', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: 8 }}>Target Keyword</th>
                        <th style={{ padding: 8 }}>Monthly Searches</th>
                        <th style={{ padding: 8, textAlign: 'center' }}>Google Rank</th>
                        <th style={{ padding: 8 }}>Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.map((kw, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{kw.word}</td>
                          <td style={{ padding: '10px 8px', color: '#94a3b8' }}>{kw.volume}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 700, color: '#fff', textAlign: 'center' }}>#{kw.rank}</td>
                          <td style={{ padding: '10px 8px', color: '#4ade80', fontWeight: 600 }}>{kw.change}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. GST Accounting & Revenue splits (MODULE 5) */}
          {activeTab === 'finance' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Splitting ledger and log splits */}
              <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>GST Splitting Ledger</h3>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Automatic ledger calculations per billing cycle.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => handleSimulateSplitTweak('starter', 'add')} style={{ padding: '2px 6px', fontSize: '0.65rem', background: '#0076a3', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer' }}>+ Starter</button>
                    <button onClick={() => handleSimulateSplitTweak('elite', 'add')} style={{ padding: '2px 6px', fontSize: '0.65rem', background: '#0076a3', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer' }}>+ Elite</button>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(4,13,26,0.6)',
                  border: '1px solid rgba(0,118,163,0.2)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Client Active Workspace:</span>
                    <strong style={{ color: '#fff' }}>{activeClientObject.name}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
                    <span style={{ color: '#94a3b8' }}>Plan Subscription:</span>
                    <strong style={{ color: '#0076a3' }}>{currentPlan}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, margin: '6px 0' }}>
                    <span style={{ color: '#ffffff' }}>Gross Collection:</span>
                    <span style={{ color: '#ffffff' }}>₹{billAmount.toLocaleString()}</span>
                  </div>

                  {/* Splits */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#94a3b8' }}>1. Ad Spend Wallet (50% split for Meta Ads):</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>₹{splitAdWallet.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#94a3b8' }}>2. Net Agency Fee (20% TechVision revenue):</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>₹{splitAgencyFee.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#94a3b8' }}>3. Statutory GST (18% liability):</span>
                      <span style={{ color: '#eab308', fontWeight: 600 }}>₹{splitGst.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#94a3b8' }}>4. Hosting & Processing Reserve:</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>₹{splitHostingReserve.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Gateway webhook logs list */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>PAYMENT GATEWAY STATUS LOGS (Razorpay/Cashfree Webhooks)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { id: 'pay_RAZOR10892', time: 'Today, 2:40 PM', status: 'SUCCESS', amt: billAmount, client: activeClientObject.name },
                      { id: 'pay_CASHF89127', time: 'Yesterday, 11:05 AM', status: 'SUCCESS', amt: 5000, client: 'UrbanStitch Apparel' },
                      { id: 'pay_RAZOR20194', time: 'July 21, 6:12 PM', status: 'FAILED', amt: 10000, client: 'EcoBloom Spas' },
                    ].map((webhook, idx) => (
                      <div key={idx} style={{
                        padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{webhook.id} ({webhook.client})</div>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{webhook.time}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#fff' }}>₹{webhook.amt.toLocaleString()}</div>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700,
                            color: webhook.status === 'SUCCESS' ? '#4ade80' : '#ef4444'
                          }}>{webhook.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tax Invoice Generator Card */}
              <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <FileText size={16} style={{ color: '#0076a3' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Automated GST Invoice Generator</h3>
                </div>

                {/* Print Sheet style invoice wrapper */}
                <div style={{
                  background: '#ffffff', color: '#0f172a', borderRadius: 12, padding: 24, fontSize: '0.75rem',
                  border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', fontFamily: 'monospace'
                }}>
                  {/* Invoice Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>TechVision Digital Private Limited</strong>
                      <div>GSTIN: 27AAAAA1111A1Z1</div>
                      <div>Mumbai Operations Center, MH</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.9rem' }}>TAX INVOICE</strong>
                      <div>Invoice No: TVD-2026-{selectedBusinessId.slice(0, 4).toUpperCase()}</div>
                      <div>Date: {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Client Detail */}
                  <div style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <strong>BILL TO:</strong>
                    <div>{activeClientObject.name} Workspace</div>
                    <div>GSTIN: 27BBBBB2222B2Z2 (Client Corporate Identity)</div>
                  </div>

                  {/* Line item table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #0f172a', textAlign: 'left', fontWeight: 'bold' }}>
                        <th style={{ padding: 4 }}>Description of Services</th>
                        <th style={{ padding: 4, textAlign: 'right' }}>Taxable Amt</th>
                        <th style={{ padding: 4, textAlign: 'right' }}>Tax (18%)</th>
                        <th style={{ padding: 4, textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: 4 }}>Monthly AI Automation & Social Scheduler ({currentPlan})</td>
                        <td style={{ padding: 4, textAlign: 'right' }}>₹{(billAmount / 1.18).toFixed(2)}</td>
                        <td style={{ padding: 4, textAlign: 'right' }}>₹{(billAmount - (billAmount / 1.18)).toFixed(2)}</td>
                        <td style={{ padding: 4, textAlign: 'right' }}>₹{billAmount.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals split */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4, width: '60%', marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal (Excl Tax):</span>
                      <span>₹{(billAmount / 1.18).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CGST (9%):</span>
                      <span>₹{((billAmount - (billAmount / 1.18)) / 2).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>SGST (9%):</span>
                      <span>₹{((billAmount - (billAmount / 1.18)) / 2).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #0f172a', paddingTop: 4, fontSize: '0.8rem' }}>
                      <span>Grand Total:</span>
                      <span>₹{billAmount.toLocaleString()}.00</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => addToast('Invoice Downloaded', 'Simulated PDF invoice written to downloads folder.', 'success')}
                    style={{ flex: 1, padding: 10, background: '#0076a3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', gap: 6, justifyContent: 'center' }}
                  >
                    <Download size={14} /> Download PDF
                  </button>
                  <button
                    onClick={() => addToast('Invoice Emailed', `GST tax invoice successfully sent to client email.`, 'success')}
                    style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid rgba(0,118,163,0.3)', color: '#0076a3', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', gap: 6, justifyContent: 'center' }}
                  >
                    <Send size={14} /> Email Invoice
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 7. SYSTEM & VPS TELEMETRY (MODULE 6) */}
          {activeTab === 'health' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Node health metrics */}
              <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>VPS Performance & Quota Telemetry</h3>

                {/* API Quotas tracking */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>API USAGE & QUOTA LIMITS</label>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#e2e8f0', marginBottom: 4 }}>
                      <span>Gemini 3.5 Flash Model Token limit</span>
                      <strong>42.1% (4.2K / 10K requests)</strong>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: '42.1%', height: '100%', background: '#22c55e' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#e2e8f0', marginBottom: 4 }}>
                      <span>Meta Graph Ads Manager API Calls</span>
                      <strong>24.9% (12.4K / 50K calls)</strong>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: '24.9%', height: '100%', background: '#0076a3' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#e2e8f0', marginBottom: 4 }}>
                      <span>Google Map Business Profile Sync API</span>
                      <strong>12.0% (1.2K / 10K calls)</strong>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: '12%', height: '100%', background: '#0076a3' }} />
                    </div>
                  </div>
                </div>

                {/* VPS Node details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>HOSTINGER SERVER PARAMETERS</label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: '#94a3b8' }}>Virtual Node Architecture:</span>
                    <span>Ubuntu 22.04 LTS (x86_64)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: '#94a3b8' }}>Redis BullMQ background:</span>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>ONLINE (0 jobs waiting)</span>
                  </div>
                </div>

                {/* System Settings Form binding */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Settings size={14} style={{ color: '#0076a3' }} />
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>GLOBAL NODE SETTINGS OVERRIDES</label>
                    </div>
                    {platformSettings && (
                      <span style={{ fontSize: '0.65rem', color: '#0076a3' }}>Synced</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span>Maintenance Mode</span>
                    <input
                      type="checkbox"
                      checked={editedSettings.maintenanceMode || false}
                      onChange={e => setEditedSettings({ ...editedSettings, maintenanceMode: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span>AI Model Selection Engine</span>
                    <select
                      value={editedSettings.aiModel || 'openrouter/free'}
                      onChange={e => setEditedSettings({ ...editedSettings, aiModel: e.target.value })}
                      style={{ background: '#040d1a', border: '1px solid rgba(0,118,163,0.3)', borderRadius: 4, padding: 3, color: '#fff', fontSize: '0.75rem' }}
                    >
                      <option value="openrouter/free">Gemini 3.5 Flash (Free)</option>
                      <option value="google/gemini-pro">Gemini 1.5 Pro</option>
                      <option value="meta/llama-3">Llama 3 70B</option>
                    </select>
                  </div>
                  <button onClick={handleSaveSettings} style={{ padding: '8px 12px', background: '#0076a3', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', marginTop: 4 }}>
                    Save settings configuration
                  </button>
                </div>
              </div>

              {/* Role Based Access Control (RBAC) & Support Tickets queue */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* RBAC Panel */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Role-Based Access Control (RBAC)</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 14, lineHeight: 1.4 }}>
                    Assign security privileges for internal TechVision Digital team members.
                  </p>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                    <Search size={14} style={{ color: '#0076a3' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Filter members..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '6px 10px', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredUsers.map(usr => (
                      <div key={usr.id} style={{
                        padding: 12, borderRadius: 10, background: 'rgba(4,13,26,0.4)',
                        border: '1px solid rgba(0,118,163,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{usr.name || 'Member'}</div>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{usr.email}</span>
                        </div>

                        <select
                          value={usr.role || 'MEMBER'}
                          onChange={e => handleUpdateRole(usr.id, e.target.value)}
                          style={{
                            background: '#040d1a',
                            border: '1px solid rgba(0, 118, 163, 0.3)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="MEMBER">Graphic Designer</option>
                          <option value="ADMIN">Account Manager</option>
                          <option value="SUPERADMIN">Super Admin</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Support ticket queue displaying tickets List */}
                <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                    <LifeBuoy size={16} style={{ color: '#0076a3' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Open Support Tickets Queue</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 180, overflowY: 'auto' }}>
                    {ticketsList.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: 20 }}>No open tickets in queue.</div>
                    ) : (
                      ticketsList.map(ticket => (
                        <div key={ticket.id} style={{
                          padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.01)',
                          border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem'
                        }}>
                          <div>
                            <strong>{ticket.subject}</strong>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>From: {ticket.user?.email || 'User'}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {ticket.status === 'OPEN' ? (
                              <button
                                onClick={() => handleUpdateTicketStatus(ticket.id, 'RESOLVED')}
                                style={{
                                  background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4,
                                  padding: '4px 8px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600
                                }}
                              >
                                Resolve
                              </button>
                            ) : (
                              <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.65rem' }}>RESOLVED</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. SYSTEM AI PROMPT MANAGER */}
          {activeTab === 'prompts' && (
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
              <div className="glass-panel" style={{ padding: 16, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>System Prompts</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.keys(prompts).map(key => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedPromptKey(key);
                        setEditedPromptText(prompts[key]);
                      }}
                      style={{
                        justifyContent: 'flex-start', padding: 10, fontSize: '0.8rem', borderRadius: 8,
                        background: selectedPromptKey === key ? 'rgba(0,118,163,0.2)' : 'transparent',
                        border: '1px solid transparent', borderColor: selectedPromptKey === key ? '#0076a3' : 'transparent',
                        color: selectedPromptKey === key ? '#f8fafc' : '#94a3b8', cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      {key.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Editing System Prompt Template: {selectedPromptKey}</h3>
                <textarea
                  className="form-input"
                  rows={10}
                  value={editedPromptText}
                  onChange={e => setEditedPromptText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#040d1a', border: '1px solid rgba(0,118,163,0.2)' }}
                />
                <div>
                  <button onClick={handleSavePrompt} disabled={isSavingPrompt} className="btn-primary" style={{ padding: '10px 20px', background: '#0076a3' }}>
                    {isSavingPrompt ? 'Saving...' : 'Save Prompt Template'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 9. SECURITY AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="glass-panel" style={{ padding: 24, background: 'rgba(11,34,64,0.05)', border: '1px solid rgba(0,118,163,0.15)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Superuser Operational Audit Logs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                {auditLogs.map((log, idx) => (
                  <div key={idx} style={{
                    padding: 12, borderRadius: 8, background: 'rgba(4,13,26,0.3)',
                    border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#0076a3' }}>{log.action}</span>
                      <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                        {log.createdAt ? new Date(log.createdAt.seconds ? log.createdAt.seconds * 1000 : log.createdAt).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                    <div style={{ color: '#94a3b8' }}>User: {log.user?.email || log.userId || 'System Admin'}</div>
                    {log.details && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>{log.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
