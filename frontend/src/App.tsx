import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Plus,
  Search,
  Bell,
  User as UserIcon,
  LayoutDashboard,
  Wand2,
  TrendingUp,
  LogOut,
  Sun,
  Moon,
  Send,
  Cpu,
  FileText,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  DollarSign,
  MousePointerClick,
  Target,
  ChevronRight,
  Info,
  X,
  Building,
  Menu,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import { api } from './services/api';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthScreens } from './components/AuthScreens';
import { AdminPortal } from './components/AdminPortal';
import CampaignGenerator from './components/CampaignGenerator';
import ConnectMeta from './components/ConnectMeta';
import { ContentCalendar } from './components/ContentCalendar';
import { SchedulerPanel } from './components/SchedulerPanel';
import { ProfileScreen } from './components/ProfileScreen';
import { ErrorBoundary } from './components/ErrorBoundary';


// --- Toast notification utility ---
interface ToastMsg {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'alert' | 'info';
}

export default function App() {
  // Theme & Navigation State
  const [isLight, setIsLight] = useState(true);
  const [currentPage, setCurrentPage] = useState<'landing' | 'auth' | 'admin-login' | 'onboarding' | 'dashboard' | 'builder' | 'generator' | 'manager' | 'analytics' | 'support' | 'admin' | 'connect-meta' | 'calendar' | 'scheduler' | 'settings' | 'profile'>('landing');
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      setGlobalError(`${event.message} at ${event.filename}:${event.lineno}`);
    };
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  
  // Workspace selection
  const activeWorkspace = user?.businessName || 'Omni Retail Inc.';
  
  // Chat Assistant sliding drawer state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'model', content: "Hello! 👋 I am the official DIPARI AI Help Assistant. How can I help you with DIPARI AI today? Ask me about account setup, Meta integration, creating campaigns, content scheduling, lead CRM, analytics, or platform features!" }
  ]);
  const [assistantInput, setAssistantInput] = useState('');
  const [currentConvoId, setCurrentConvoId] = useState<string | undefined>(undefined);
  
  // Onboarding chatbot state
  const [onboardingAnswers, setOnboardingAnswers] = useState<{ q: string; a: string }[]>([]);
  const [currentOnboardingIndex, setCurrentOnboardingIndex] = useState(0);
  const [chatbotMessages, setChatbotMessages] = useState<any[]>([]);
  const [chatbotInput, setChatbotInput] = useState('');
  const [onboardingQuestions, setOnboardingQuestions] = useState<string[]>([]);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [isStrategyGenerating, setIsStrategyGenerating] = useState(false);

  // App metrics & lists loaded from DB
  const [metrics, setMetrics] = useState<any>({
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    cpc: 0,
    cpm: 0,
    ctr: 0,
    roas: 0,
    campaignsCount: 0,
    activeCampaigns: 0
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  // New campaign wizard form state
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    objective: 'CONVERSIONS',
    dailyBudget: 100,
    creativePrompt: '',
    targetAgeMin: 21,
    targetAgeMax: 45,
    targetLocation: 'United States'
  });
  const [isBuildingCampaign, setIsBuildingCampaign] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [previewCreative, setPreviewCreative] = useState<any>(null);

  // Support ticket form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  // Admin state
  const [adminBusinesses, setAdminBusinesses] = useState<any[]>([]);
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);

  // UI status helpers
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [isNotificationTrayOpen, setIsNotificationTrayOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // --- Handle Meta OAuth Callback from URL params ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const success = params.get('success');

    // Handle admin login route
    if (window.location.pathname === '/admin/login') {
      setCurrentPage('auth');
      return;
    }
    
    if (window.location.pathname === '/meta/callback') {
      if (error) {
        addToast('Meta Connection Failed', error, 'alert');
        window.history.replaceState({}, '', '/connect-meta');
        setCurrentPage('connect-meta');
        return;
      }
      
      if (code && state) {
        try {
          const stateData = JSON.parse(atob(state));
          const businessId = stateData.businessId;
          
          // Exchange code via backend
          api.meta.connect(code, businessId)
            .then(() => {
              addToast('Meta Connected', 'Successfully connected to Meta Ads', 'success');
              window.history.replaceState({}, '', '/connect-meta');
              setCurrentPage('connect-meta');
            })
            .catch((err: any) => {
              addToast('Meta Connection Failed', err.message, 'alert');
              window.history.replaceState({}, '', '/connect-meta');
              setCurrentPage('connect-meta');
            });
        } catch (e) {
          addToast('Invalid OAuth State', 'Could not process Meta callback', 'alert');
          window.history.replaceState({}, '', '/connect-meta');
          setCurrentPage('connect-meta');
        }
      }
    } else if (window.location.pathname === '/connect-meta') {
      if (success === 'true') {
        addToast('Meta Connected', 'Successfully connected to Meta Ads', 'success');
        window.history.replaceState({}, '', '/connect-meta');
      } else if (error) {
        addToast('Meta Connection Failed', error, 'alert');
        window.history.replaceState({}, '', '/connect-meta');
      }
    }
  }, []);

  // --- Load Profile and Data ---
  useEffect(() => {
    let unsubscribe: any = null;

    const setupAuth = () => {
      if (!auth) {
        const token = localStorage.getItem('campaignai_token');
        if (token) {
          api.auth.getProfile()
            .then(async (res) => {
              setUser(res);
              if (res.role === 'ADMIN') {
                try {
                  const businesses = await api.admin.getBusinesses();
                  setAdminBusinesses(businesses);
                  const tkts = await api.admin.getTickets();
                  setAdminTickets(tkts);
                  const stats = await api.admin.getStats();
                  setAdminStats(stats);
                  const logs = await api.admin.getAuditLogs();
                  setAdminLogs(logs);
                  setCurrentPage('admin');
                } catch {
                  setCurrentPage('dashboard');
                }
              } else if (!res.onboardingCompleted) {
                api.business.getQuestions().then(qList => {
                  setOnboardingQuestions(qList);
                  setChatbotMessages([{ role: 'model', content: `Hello ${res.name}! Let's design your strategy. ${qList[0]}` }]);
                  setCurrentPage('onboarding');
                });
              } else {
                if (window.location.pathname === '/connect-meta') {
                  setCurrentPage('connect-meta');
                } else {
                  setCurrentPage('dashboard');
                }
              }
              addToast('Welcome Back', `Successfully logged in as ${res.name}`, 'success');
            })
            .catch(() => {
              localStorage.removeItem('campaignai_token');
              setCurrentPage('landing');
            });
        }
        return;
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // if (!firebaseUser.emailVerified) {
          //   setUser(null);
          //   // Let the UI stay on auth screen to show verification alert
          //   return;
          // }
          
          try {
            const token = await firebaseUser.getIdToken();
            localStorage.setItem('campaignai_token', token);
            const res = await api.auth.getProfile();
            setUser(res);
            if (currentPage === 'landing' || currentPage === 'auth') {
              if (res.role === 'ADMIN') {
                // Admin users go straight to the admin console on reload
                try {
                  const businesses = await api.admin.getBusinesses();
                  setAdminBusinesses(businesses);
                  const tickets = await api.admin.getTickets();
                  setAdminTickets(tickets);
                  const stats = await api.admin.getStats();
                  setAdminStats(stats);
                  const logs = await api.admin.getAuditLogs();
                  setAdminLogs(logs);
                  setCurrentPage('admin');
                } catch {
                  setCurrentPage('dashboard');
                }
              } else if (!res.onboardingCompleted) {
                const qList = await api.business.getQuestions();
                setOnboardingQuestions(qList);
                setChatbotMessages([{ role: 'model', content: `Hello ${res.name}! Let's design your strategy. ${qList[0]}` }]);
                setCurrentPage('onboarding');
              } else {
                if (window.location.pathname === '/connect-meta') {
                  setCurrentPage('connect-meta');
                } else {
                  setCurrentPage('dashboard');
                }
              }
            }
          } catch (e) {
            console.error('Failed to sync profile', e);
            localStorage.removeItem('campaignai_token');
            setUser(null);
            setCurrentPage('landing');
          }
        } else {
          const protectedPages = ['dashboard', 'builder', 'manager', 'analytics', 'support', 'admin', 'onboarding', 'connect-meta', 'leads', 'calendar', 'scheduler', 'settings'];
          setUser(null);
          localStorage.removeItem('campaignai_token');
          if (protectedPages.includes(currentPage)) {
            setCurrentPage('landing');
          }
        }
      });
    };

    setupAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch campaign dashboard data whenever workspace changes
  useEffect(() => {
    if (user && user.businessId) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user || !user.businessId) return;
    try {
      const bid = user.businessId;
      const summ = await api.campaigns.getSummary(bid);
      setMetrics(summ);

      await api.campaigns.getDaily(bid);

      const cmps = await api.campaigns.getCampaigns(bid);
      setCampaigns(cmps);

      const notifs = await api.support.getNotifications(bid);
      setNotifications(notifs);

      const opts = await api.campaigns.getOptimizations(bid);
      setOptimizations(opts);

      const recs = await api.campaigns.getRecommendations(bid);
      setRecommendations(recs);

      const tkts = await api.support.getTickets();
      setTickets(tkts);
    } catch (e) {
      console.error("Error loading dashboard data", e);
    }
  };

  // Toast dispatch
  const addToast = (title: string, message: string, type: 'success' | 'alert' | 'info') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Toggle Theme
  const toggleTheme = () => {
    setIsLight(!isLight);
    document.documentElement.classList.toggle('dark');
  };



  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setCurrentPage('landing');
    addToast('Logged Out', 'You have been safely disconnected.', 'info');
  };

  // --- Onboarding chatbot wizard ---
  const handleChatbotSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatbotInput.trim()) return;

    const currentQ = onboardingQuestions[currentOnboardingIndex];
    const userA = chatbotInput;
    const updatedAnswers = [...onboardingAnswers, { q: currentQ, a: userA }];
    setOnboardingAnswers(updatedAnswers);

    setChatbotMessages(prev => [...prev, { role: 'user', content: userA }]);
    setChatbotInput('');

    const nextIndex = currentOnboardingIndex + 1;
    if (nextIndex < onboardingQuestions.length) {
      setCurrentOnboardingIndex(nextIndex);
      setTimeout(() => {
        setChatbotMessages(prev => [...prev, {
          role: 'model',
          content: onboardingQuestions[nextIndex]
        }]);
      }, 500);
    } else {
      // Completed onboarding
      setIsOnboardingCompleted(true);
      setIsStrategyGenerating(true);
      setChatbotMessages(prev => [...prev, { role: 'model', content: "All details captured! Processing target demographics and SWOT charts..." }]);

      try {
        await api.business.submitAnswers(user.businessId, updatedAnswers);
        setIsStrategyGenerating(false);
        setChatbotMessages(prev => [...prev, { role: 'model', content: "Strategy engine completed. Click the button below to view your Dashboard." }]);
      } catch (err: any) {
        addToast('Strategy Build Failed', err.message, 'alert');
        setIsStrategyGenerating(false);
      }
    }
  };

  // --- AI Campaign builder steps ---
  const handleBuildCampaignStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardStep(2);
  };

  const handleGenerateAdDraft = async () => {
    if (!newCampaign.creativePrompt) {
      addToast('Missing prompt', 'Please describe the focus of your creative first', 'alert');
      return;
    }
    setIsBuildingCampaign(true);
    try {
      // Build campaign trigger (handles AI creative generation and saves state)
      const res = await api.campaigns.buildCampaign(user.businessId, newCampaign);
      setPreviewCreative(res.creative);
      setWizardStep(3);
      setIsBuildingCampaign(false);
      addToast('AI Copies Generated', 'Review generated text & headlines', 'success');
    } catch (err: any) {
      addToast('Generation failed', err.message, 'alert');
      setIsBuildingCampaign(false);
    }
  };

  const handlePublishCampaign = async () => {
    await loadDashboardData();
    setWizardStep(1);
    // Reset wizard
    setNewCampaign({
      name: '',
      objective: 'CONVERSIONS',
      dailyBudget: 100,
      creativePrompt: '',
      targetAgeMin: 21,
      targetAgeMax: 45,
      targetLocation: 'United States'
    });
    setPreviewCreative(null);
    setCurrentPage('dashboard');
    addToast('Campaign Published', 'Now active on Meta Ads and sync logs initialized', 'success');
  };

  // --- Meta campaigns status slider ---
  const toggleCampaignStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await api.campaigns.updateStatus(id, nextStatus);
      addToast('Status Updated', `Campaign status changed to ${nextStatus}`, 'success');
      loadDashboardData();
    } catch (err: any) {
      addToast('Error', err.message, 'alert');
    }
  };

  // --- Tickets ---
  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDesc) return;
    try {
      await api.support.createTicket(ticketSubject, ticketDesc);
      addToast('Ticket Submitted', 'Our engineering team will review shortly.', 'success');
      setTicketSubject('');
      setTicketDesc('');
      loadDashboardData();
    } catch (err: any) {
      addToast('Ticket Error', err.message, 'alert');
    }
  };

  // --- AI chat assistant responses ---
  const sendAssistantMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim()) return;

    const msg = assistantInput;
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setAssistantInput('');

    try {
      const res = await api.assistant.sendMessage(user.businessId, msg, currentConvoId);
      setCurrentConvoId(res.conversationId);
      setChatMessages(prev => [...prev, { role: 'model', content: res.reply }]);
    } catch (err: any) {
      addToast('Assistant connection failed', err.message, 'alert');
    }
  };

  // --- Admin actions ---
  const loadAdminDashboard = async () => {
    try {
      await api.admin.getUsers();
      const businesses = await api.admin.getBusinesses();
      setAdminBusinesses(businesses);
      const tickets = await api.admin.getTickets();
      setAdminTickets(tickets);
      const stats = await api.admin.getStats();
      setAdminStats(stats);
      const logs = await api.admin.getAuditLogs();
      setAdminLogs(logs);
      setCurrentPage('admin');
    } catch (err: any) {
      addToast('Admin Privileges Required', 'Only system administrators can load this view.', 'alert');
    }
  };

  const updateTicketAdmin = async (id: string, status: string) => {
    try {
      await api.admin.updateTicketStatus(id, status);
      addToast('Ticket Updated', `Status changed to ${status}`, 'success');
      loadAdminDashboard();
    } catch (err: any) {
      addToast('Error updating ticket', err.message, 'alert');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {globalError && (
        <div style={{ padding: '24px', background: '#fee2e2', color: '#991b1b', borderBottom: '1px solid #f87171', fontFamily: 'monospace', zIndex: 99999 }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Captured React Render Crash:</h3>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{globalError}</pre>
          <button onClick={() => { setGlobalError(null); window.location.reload(); }} style={{ marginTop: '12px', padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Dismiss</button>
        </div>
      )}
      
      {/* --- TOAST NOTIFICATIONS WRAPPER --- */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast" style={{
            borderLeft: toast.type === 'success' ? '4px solid var(--color-success)' :
                        toast.type === 'alert' ? '4px solid var(--color-danger)' : '4px solid var(--color-secondary)'
          }}>
            {toast.type === 'success' && <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />}
            {toast.type === 'alert' && <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />}
            {toast.type === 'info' && <Info size={18} style={{ color: 'var(--color-secondary)' }} />}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{toast.title}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{toast.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* --- 1. LANDING PAGE --- */}
      {currentPage === 'landing' && (
        <div style={{ overflow: 'hidden' }}>
          {/* Header */}
          <header style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '24px 8%', borderBottom: '1px solid var(--color-border)',
            position: 'sticky', top: 0, backdropFilter: 'blur(20px)', zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.8rem' }}>🚀</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.04em' }}>
                Campaign<span className="text-gradient">AI</span>
              </span>
            </div>
            <nav style={{ display: 'flex', gap: 32, fontWeight: 500, fontSize: '0.95rem' }}>
              <a href="#features" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'var(--transition-smooth)' }}>Features</a>
              <a href="#pricing" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Pricing</a>
              <a href="#faq" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>FAQ</a>
            </nav>
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn-secondary" onClick={() => { setAuthView('login'); setCurrentPage('auth'); }}>Sign In</button>
              <button className="btn-primary" onClick={() => { setAuthView('register'); setCurrentPage('auth'); }}>Start Free</button>
            </div>
          </header>

          {/* Hero Section */}
          <section style={{ padding: '120px 8% 80px 8%', textAlign: 'center', position: 'relative' }}>
            <div className="glow-aura" style={{ top: '10%', left: '50%', transform: 'translateX(-50%)' }}></div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
              borderRadius: '99px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)',
              marginBottom: 32, fontSize: '0.85rem'
            }}>
              <span style={{ color: 'var(--color-secondary)' }}>●</span> Powered by OpenRouter AI & Meta Graph APIs
            </div>
            <h1 style={{
              fontSize: '4.5rem', fontWeight: 800, fontFamily: 'var(--font-display)',
              lineHeight: 1.1, letterSpacing: '-0.05em', maxWidth: 900, margin: '0 auto 24px auto'
            }}>
              Autonomous Meta Ads <br />
              <span className="text-gradient">Engineered to Convert</span>
            </h1>
            <p style={{
              fontSize: '1.25rem', color: 'var(--color-text-muted)', maxWidth: 650,
              margin: '0 auto 40px auto', fontWeight: 400
            }}>
              Connect your brand details, and our automated workflows write the copy, target optimal user segments, and manage hourly bid adjustments autonomously.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
              <button className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem' }} onClick={() => { setAuthView('register'); setCurrentPage('auth'); }}>
                Launch Autonomous Campaign <ArrowRight size={18} />
              </button>
            </div>

            {/* Dashboard Mockup Showcase */}
            <div style={{
              marginTop: 80, border: '1px solid var(--color-border)', borderRadius: 24,
              overflow: 'hidden', padding: 12, background: 'rgba(255, 255, 255, 0.02)',
              boxShadow: '0 30px 100px rgba(0,0,0,0.8)'
            }}>
              <div style={{
                borderRadius: 16, background: '#090d16', border: '1px solid var(--color-border)',
                height: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}>
                {/* Fake App header */}
                <div style={{ height: 50, borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></div>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }}></div>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }}></div>
                  <div style={{ marginLeft: 24, width: 250, height: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}></div>
                </div>
                {/* Fake App body */}
                <div style={{ display: 'flex', flex: 1 }}>
                  <div style={{ width: 200, borderRight: '1px solid var(--color-border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ height: 24, background: 'var(--color-primary)', borderRadius: 6, opacity: 0.15 }}></div>
                    <div style={{ height: 24, background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}></div>
                    <div style={{ height: 24, background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}></div>
                    <div style={{ height: 24, background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}></div>
                  </div>
                  <div style={{ flex: 1, padding: 30, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                      <div className="glass-panel" style={{ padding: 20 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MOCK MONTHLY ROAS</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 4 }}>3.42x</div>
                      </div>
                      <div className="glass-panel" style={{ padding: 20 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MOCK ACQUISITION CPA</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 4 }}>₹12.40</div>
                      </div>
                      <div className="glass-panel" style={{ padding: 20 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MOCK SPEND RATIO</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 4 }}>₹4,821.50</div>
                      </div>
                    </div>
                    {/* Fake line chart */}
                    <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: 20 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Performance Scale Matrix</div>
                      <svg viewBox="0 0 500 150" style={{ width: '100%', height: '80%', marginTop: 10 }}>
                        <defs>
                          <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,120 Q80,40 160,80 T320,30 T480,10 L480,150 L0,150 Z" fill="url(#glowGrad)"></path>
                        <path d="M0,120 Q80,40 160,80 T320,30 T480,10" fill="none" stroke="var(--color-primary)" strokeWidth="3"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Grid */}
          <section id="pricing" style={{ padding: '80px 8%', textAlign: 'center', borderTop: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: 12 }}>Transparent Scaling Plans</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 60 }}>Choose the strategy that aligns with your ad accounts budget caps.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
              {/* Tile 1: Basic */}
              <div className="glass-panel" style={{ padding: 30, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 4 }}>Free Plan</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Basic (Free 7 days trial)</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, margin: '16px 0' }}>Free</div>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, fontSize: '0.85rem', color: 'var(--color-text-muted)', flex: 1, padding: 0 }}>
                  <li>✓ 3 post (2 standard, 1 carrousal) / week</li>
                  <li>✓ graphics regeneration 3 times</li>
                  <li>✓ No Ad campaign</li>
                  <li>✓ Experience the next generation Marketing</li>
                </ul>
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setAuthView('register'); setCurrentPage('auth'); }}>Start Free Trial</button>
              </div>

              {/* Tile 2: Advance */}
              <div className="glass-panel" style={{ padding: 30, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20, border: '1px solid var(--color-primary)', boxShadow: '0 0 30px rgba(99, 102, 241, 0.1)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)', textTransform: 'uppercase' }}>Pro Campaign</span>
                    <span style={{ background: 'var(--color-primary)', fontSize: '0.7rem', padding: '3px 8px', borderRadius: 99, color: 'white', fontWeight: 'bold' }}>POPULAR</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 4 }}>Advance</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, margin: '16px 0', color: 'var(--color-primary-light)' }}>₹5,900</div>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, fontSize: '0.85rem', color: 'var(--color-text-muted)', flex: 1, padding: 0 }}>
                  <li>✓ 3 post (2 standard, 1 carrousal) / week</li>
                  <li>✓ graphics regeneration 3 times</li>
                  <li>✓ 15 days Ad campaign</li>
                  <li>✓ 24X7 support</li>
                  <li>✓ Visible growth in sales in 1 week</li>
                  <li style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 10, marginTop: 4, fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span>Ad Budget:</span>
                      <strong>₹3,540</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span>API Cost:</span>
                      <strong>₹613.6</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 2, marginTop: 2 }}>
                      <span>Total cost:</span>
                      <strong style={{ color: 'var(--color-primary)' }}>₹4,153.6</strong>
                    </div>
                  </li>
                </ul>
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setAuthView('register'); setCurrentPage('auth'); }}>Choose Advance</button>
              </div>

              {/* Tile 3: Premium */}
              <div className="glass-panel" style={{ padding: 30, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 4 }}>Enterprise Scale</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Premium</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, margin: '16px 0' }}>₹11,800</div>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, fontSize: '0.85rem', color: 'var(--color-text-muted)', flex: 1, padding: 0 }}>
                  <li>✓ 5 post (2 standard, 1 carrousal) / week</li>
                  <li>✓ graphics regeneration 3 times</li>
                  <li>✓ 30 days Ad campaign</li>
                  <li>✓ 24X7 support</li>
                  <li>✓ Visible growth in sales in 1 week</li>
                  <li style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 10, marginTop: 4, fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span>Ad Budget:</span>
                      <strong>₹7,080</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span>API Cost:</span>
                      <strong>₹1,227.2</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 2, marginTop: 2 }}>
                      <span>Total cost:</span>
                      <strong style={{ color: 'var(--color-primary)' }}>₹8,307.2</strong>
                    </div>
                  </li>
                </ul>
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--color-secondary)' }} onClick={() => { setAuthView('register'); setCurrentPage('auth'); }}>Choose Premium</button>
              </div>

              {/* Tile 4: Customized */}
              <div className="glass-panel" style={{ padding: 30, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 4 }}>Flexible Budget</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Customized</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '16px 0' }}>Contact us</div>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, fontSize: '0.85rem', color: 'var(--color-text-muted)', flex: 1, padding: 0 }}>
                  <li style={{ lineHeight: 1.5 }}>want to create a customized plan as per your budget then please contact us</li>
                </ul>
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setAuthView('register'); setCurrentPage('auth'); }}>Contact Us</button>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" style={{ padding: '80px 8%', borderTop: '1px solid var(--color-border)', maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: 40, fontFamily: 'var(--font-display)' }}>Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Do I need a credit card to sign up?</h4>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>No, you can sign up and explore the strategy generation engine. Credentials and payment configurations are only required when publishing live campaigns to Meta Ad Accounts.</p>
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: 8 }}>How does the daily bid optimization operate?</h4>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Our platform hooks into the Meta Marketing API, parsing click details and conversion events. If the hourly ROAS threshold is met, the system progressively boosts target sets, while automatically capping bids on underperforming audiences.</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer style={{ borderTop: '1px solid var(--color-border)', padding: '40px 8%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            <span>© 2026 DIPARI AI Technologies. All rights reserved. Made for enterprise marketing automation.</span>
            <button
              onClick={() => setCurrentPage('auth')}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.5, textDecoration: 'underline' }}
            >
              Admin Portal
            </button>
          </footer>
        </div>
      )}

      {/* --- 2. AUTHENTICATION PAGES --- */}
      {currentPage === 'auth' && (
        <AuthScreens
          defaultView={authView}
          onAuthSuccess={async (syncedUser) => {
            setUser(syncedUser);
            // ADMIN users who accidentally use the business login portal
            // are redirected to the admin console
            if (syncedUser.role === 'ADMIN') {
              try {
                await api.admin.getUsers();
                const businesses = await api.admin.getBusinesses();
                setAdminBusinesses(businesses);
                const tickets = await api.admin.getTickets();
                setAdminTickets(tickets);
                const stats = await api.admin.getStats();
                setAdminStats(stats);
                const logs = await api.admin.getAuditLogs();
                setAdminLogs(logs);
                setCurrentPage('admin');
              } catch {
                // Fall through to dashboard if admin data fails
                setCurrentPage('dashboard');
              }
              return;
            }
            if (!syncedUser.onboardingCompleted) {
              const qList = await api.business.getQuestions();
              setOnboardingQuestions(qList);
              setChatbotMessages([{ role: 'model', content: `Hello ${syncedUser.name}! I am the DIPARI AI Business Planner. Let's design your high-converting marketing strategy. ${qList[0]}` }]);
              setCurrentPage('onboarding');
            } else {
              setCurrentPage('dashboard');
            }
          }}
          addToast={addToast}
        />
      )}



      {/* --- 2.5 ADMIN PORTAL --- */}
      {currentPage === 'admin' && (
        <AdminPortal user={user} onLogout={handleLogout} addToast={addToast} />
      )}

      {/* --- 3. ONBOARDING CHATBOT PAGE --- */}
      {currentPage === 'onboarding' && (
        <div style={{ display: 'flex', flex: 1, minHeight: '100vh', background: 'var(--color-bg-end)' }}>
          {/* Left instructions */}
          <div style={{ width: 340, borderRight: '1px solid var(--color-border)', padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
                <span style={{ fontSize: '1.4rem' }}>🚀</span>
                <span style={{ fontWeight: 800 }}>DIPARI AI</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: 12 }}>Onboarding Chatbot</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Our AI Planner is gathering business objectives to configure SWOT analysis grids and create target demographic parameters.
              </p>
            </div>
            
            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
                <span>Strategy Profile Progress</span>
                <span>{Math.round(((currentOnboardingIndex + (isOnboardingCompleted ? 1 : 0)) / onboardingQuestions.length) * 100)}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: 'var(--color-primary)',
                  width: `${((currentOnboardingIndex + (isOnboardingCompleted ? 1 : 0)) / onboardingQuestions.length) * 100}%`,
                  transition: 'width 0.3s'
                }}></div>
              </div>
            </div>
          </div>

          {/* Right chat interface */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, padding: '40px 10%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {chatbotMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div className="glass-panel" style={{
                    padding: '16px 20px',
                    borderRadius: 16,
                    maxWidth: '70%',
                    background: msg.role === 'user' ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-card-bg)',
                    border: msg.role === 'user' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isStrategyGenerating && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  <Cpu size={16} className="animate-spin" />
                  Generating strategy profiles and SWOT maps...
                </div>
              )}
            </div>

            {/* Input area */}
            <div style={{ padding: '20px 10% 40px 10%', borderTop: '1px solid var(--color-border)' }}>
              {!isOnboardingCompleted ? (
                <form onSubmit={handleChatbotSend} style={{ display: 'flex', gap: 12 }}>
                  <input
                    className="form-input"
                    placeholder="Provide your response..."
                    value={chatbotInput}
                    onChange={e => setChatbotInput(e.target.value)}
                  />
                  <button className="btn-primary" type="submit">
                    <Send size={16} />
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <button className="btn-primary" style={{ padding: '16px 40px' }} onClick={async () => {
                    await loadDashboardData();
                    setCurrentPage('dashboard');
                  }}>
                    Open Performance Dashboard <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- 4. ENTERPRISE APP SHELL: DASHBOARD & WORKSPACES --- */}
      {['dashboard', 'builder', 'generator', 'manager', 'analytics', 'support', 'connect-meta', 'leads', 'calendar', 'scheduler', 'settings'].includes(currentPage) && (
        <div style={{ display: 'flex', flex: 1 }}>
          
          {/* SIDEBAR NAVIGATION */}
          <aside style={{
            width: sidebarCollapsed ? 70 : 260,
            borderRight: '1px solid var(--color-border)',
            background: 'var(--color-bg-start)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {/* Logo / Collapse Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {!sidebarCollapsed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.4rem' }}>🚀</span>
                    <span style={{ fontWeight: 800, fontFamily: 'var(--font-display)' }}>DIPARI AI</span>
                  </div>
                )}
                <button style={{
                  background: 'none', border: 'none', color: 'var(--color-text-muted)',
                  cursor: 'pointer', display: 'flex', margin: sidebarCollapsed ? '0 auto' : 'none'
                }} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                  <Menu size={18} />
                </button>
              </div>

              {/* Workspace Selector */}
              {!sidebarCollapsed && (
                <div className="glass-panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem' }}>
                  <Building size={16} style={{ color: 'var(--color-primary)' }} />
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{activeWorkspace}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Meta Ad Account</div>
                  </div>
                </div>
              )}

              {/* Nav links */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => setCurrentPage('dashboard')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'dashboard' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'dashboard' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <LayoutDashboard size={18} />
                  {!sidebarCollapsed && <span>Dashboard</span>}
                </button>
                <button onClick={() => setCurrentPage('builder')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'builder' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'builder' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <Wand2 size={18} />
                  {!sidebarCollapsed && <span>Campaign Wizard</span>}
                </button>
                <button onClick={() => setCurrentPage('generator')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'generator' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'generator' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <Cpu size={18} />
                  {!sidebarCollapsed && <span>AI Campaign Generator</span>}
                </button>
                <button onClick={() => setCurrentPage('manager')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'manager' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'manager' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <Activity size={18} />
                  {!sidebarCollapsed && <span>Ads Manager</span>}
                </button>
                <button onClick={() => setCurrentPage('analytics')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'analytics' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'analytics' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <TrendingUp size={18} />
                  {!sidebarCollapsed && <span>Analytics</span>}
                </button>
                <button onClick={() => setCurrentPage('calendar')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'calendar' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'calendar' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <CalendarIcon size={18} />
                  {!sidebarCollapsed && <span>Content Calendar</span>}
                </button>
                <button onClick={() => setCurrentPage('scheduler')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'scheduler' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'scheduler' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <Clock size={18} />
                  {!sidebarCollapsed && <span>Auto Scheduler</span>}
                </button>

                <button onClick={() => setCurrentPage('connect-meta')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'connect-meta' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'connect-meta' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <Activity size={18} />
                  {!sidebarCollapsed && <span>Connect Meta</span>}
                </button>
                <button onClick={() => setCurrentPage('support')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'support' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'support' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <FileText size={18} />
                  {!sidebarCollapsed && <span>Support Tickets</span>}
                </button>
                <button onClick={() => setCurrentPage('settings')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'settings' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'settings' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <SettingsIcon size={18} />
                  {!sidebarCollapsed && <span>Settings</span>}
                </button>
                <button onClick={() => setCurrentPage('profile')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                  border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'profile' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: currentPage === 'profile' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                }}>
                  <UserIcon size={18} />
                  {!sidebarCollapsed && <span>Profile</span>}
                </button>
                {user?.role === 'ADMIN' && (
                  <button onClick={loadAdminDashboard} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', width: '100%',
                    border: 'none', borderRadius: 10, cursor: 'pointer', background: currentPage === 'admin' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    color: currentPage === 'admin' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    transition: 'var(--transition-smooth)', textAlign: 'left', fontSize: '0.9rem'
                  }}>
                    <Shield size={18} />
                    {!sidebarCollapsed && <span>Admin Console</span>}
                  </button>
                )}
              </nav>
            </div>

            {/* Profile area */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--color-primary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#fff'
                  }}>
                    <UserIcon size={16} />
                  </div>
                  {!sidebarCollapsed && (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>PRO Tier</div>
                    </div>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* MAIN PAGE WRAPPER */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg-end)', overflowY: 'auto' }}>
            
            {/* TOP NAVIGATION BAR */}
            <header style={{
              height: 70, borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0 40px', background: 'var(--color-bg-start)',
              position: 'sticky', top: 0, zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
                <input placeholder="Search campaigns, creatives or recommendations..." style={{
                  background: 'none', border: 'none', color: 'var(--color-text-main)',
                  fontSize: '0.85rem', width: 280, outline: 'none'
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                  {isLight ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                
                {/* Notification Tray Toggle */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setIsNotificationTrayOpen(!isNotificationTrayOpen)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', position: 'relative' }}>
                    <Bell size={18} />
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span style={{
                        position: 'absolute', top: -4, right: -4, width: 8, height: 8,
                        background: 'var(--color-danger)', borderRadius: '50%'
                      }}></span>
                    )}
                  </button>
                  {isNotificationTrayOpen && (
                    <div className="glass-panel" style={{
                      position: 'absolute', right: 0, top: 30, width: 320, padding: 16,
                      display: 'flex', flexDirection: 'column', gap: 12, zIndex: 100
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>Notifications</div>
                      {notifications.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No unread updates.</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} style={{ fontSize: '0.8rem', opacity: n.isRead ? 0.6 : 1 }}>
                            <div style={{ fontWeight: 500 }}>{n.title}</div>
                            <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* --- PAGE: DASHBOARD VIEW --- */}
            {currentPage === 'dashboard' && (
              <main style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
                
                {/* Dashboard metrics Bento grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      <span>SPEND</span>
                      <DollarSign size={14} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0' }}>
                      ₹{metrics.totalSpend?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>● Sync Active</div>
                  </div>
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      <span>ROAS</span>
                      <Activity size={14} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0' }}>
                      {metrics.roas?.toFixed(2) || '0.00'}x
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>+14.2% vs target limit</div>
                  </div>
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      <span>CPC</span>
                      <MousePointerClick size={14} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0' }}>
                      ₹{metrics.cpc?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>-8% cost reduction</div>
                  </div>
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      <span>CONVERSIONS</span>
                      <Target size={14} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0' }}>
                      {metrics.totalConversions || '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CTR: {((metrics.ctr || 0) * 100).toFixed(2)}%</div>
                  </div>
                </div>

                {/* Dashboard Chart & Campaigns listing */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
                  {/* Left SVG Line Chart */}
                  <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h3 style={{ fontSize: '1.1rem' }}>ROAS Trajectory Analytics</h3>
                    <div style={{ flex: 1, minHeight: 240, position: 'relative' }}>
                      <svg viewBox="0 0 500 180" style={{ width: '100%', height: '100%' }}>
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Fake grid lines */}
                        <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                        {/* Chart path */}
                        <path d="M0,150 Q50,110 100,120 T200,80 T300,95 T400,60 T500,45 L500,180 L0,180 Z" fill="url(#chartGrad)"></path>
                        <path d="M0,150 Q50,110 100,120 T200,80 T300,95 T400,60 T500,45" fill="none" stroke="var(--color-primary)" strokeWidth="3" />
                      </svg>
                    </div>
                  </div>

                  {/* Right AI recommendations column */}
                  <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Cpu size={18} style={{ color: 'var(--color-primary)' }} /> AI Recommendations
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 280 }}>
                      {recommendations.map(rec => (
                        <div key={rec.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{rec.title}</div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{rec.description}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 500 }}>{rec.impact}</span>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => addToast('Recommendation Applied', 'Optimization logic updated', 'success')}>{rec.actionLabel}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Optimizations History Log */}
                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Optimization Log</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {optimizations.map(opt => (
                      <div key={opt.id} style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--color-border)', paddingBottom: 12, fontSize: '0.85rem' }}>
                        <Clock size={16} style={{ color: 'var(--color-primary)', marginTop: 2 }} />
                        <div>
                          <strong>{opt.action}</strong>
                          <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{opt.reason}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', marginTop: 4 }}>Impact: {opt.impactMetric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            )}

            {/* --- PAGE: CAMPAIGN WIZARD --- */}
            {currentPage === 'builder' && (
              <main style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <div className="glass-panel" style={{ maxWidth: 640, width: '100%', padding: 40 }}>
                  <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Autonomous Campaign Builder</h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 32 }}>Provide campaign specifications, and our AI copies wizard will do the rest.</p>
                  
                  {/* Step indicators */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
                    <div style={{ flex: 1, height: 4, background: wizardStep >= 1 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}></div>
                    <div style={{ flex: 1, height: 4, background: wizardStep >= 2 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}></div>
                    <div style={{ flex: 1, height: 4, background: wizardStep >= 3 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}></div>
                  </div>

                  {wizardStep === 1 && (
                    <form onSubmit={handleBuildCampaignStep1} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 500 }}>Campaign Name</label>
                        <input className="form-input" placeholder="e.g. Summer Organic Linen launch" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} required />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 500 }}>Objective</label>
                          <select className="form-input" value={newCampaign.objective} onChange={e => setNewCampaign({...newCampaign, objective: e.target.value})}>
                            <option value="CONVERSIONS">Conversions (Sales)</option>
                            <option value="LEAD_GEN">Lead Generation</option>
                            <option value="TRAFFIC">Traffic</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 500 }}>Daily Budget (USD)</label>
                          <input className="form-input" type="number" value={newCampaign.dailyBudget} onChange={e => setNewCampaign({...newCampaign, dailyBudget: parseFloat(e.target.value)})} required />
                        </div>
                      </div>
                      <button className="btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>Continue to Target <ArrowRight size={16} /></button>
                    </form>
                  )}

                  {wizardStep === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 500 }}>Target Age Min</label>
                          <input className="form-input" type="number" value={newCampaign.targetAgeMin} onChange={e => setNewCampaign({...newCampaign, targetAgeMin: parseInt(e.target.value)})} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 500 }}>Target Age Max</label>
                          <input className="form-input" type="number" value={newCampaign.targetAgeMax} onChange={e => setNewCampaign({...newCampaign, targetAgeMax: parseInt(e.target.value)})} />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 500 }}>Geographic Locations</label>
                        <input className="form-input" placeholder="e.g. United States, Canada" value={newCampaign.targetLocation} onChange={e => setNewCampaign({...newCampaign, targetLocation: e.target.value})} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 500 }}>AI Creative Creative Prompt</label>
                        <textarea className="form-input" rows={4} placeholder="Describe the style/subject of the creative image and main product angles..." value={newCampaign.creativePrompt} onChange={e => setNewCampaign({...newCampaign, creativePrompt: e.target.value})} required />
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setWizardStep(1)}>Back</button>
                        <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleGenerateAdDraft} disabled={isBuildingCampaign}>
                          {isBuildingCampaign ? <Cpu size={16} className="animate-spin" /> : 'Generate AI Copy & Assets'}
                        </button>
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && previewCreative && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      <div style={{ border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', background: '#090d16' }}>
                        <img src={previewCreative.imageUrl} alt="Ad Preview" style={{ width: '100%', height: 260, objectFit: 'cover' }} />
                        <div style={{ padding: 20 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>{previewCreative.cta}</div>
                          <h4 style={{ fontSize: '1.2rem', margin: '4px 0 8px 0' }}>{previewCreative.headline}</h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{previewCreative.description}</p>
                          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 12, fontSize: '0.8rem' }}>
                            <strong>Primary copy: </strong>{previewCreative.primaryText}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setWizardStep(2)}>Re-generate</button>
                        <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handlePublishCampaign}>
                          Publish & Launch on Meta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </main>
            )}

            {/* --- PAGE: AI CAMPAIGN GENERATOR --- */}
            {currentPage === 'generator' && (
              <main style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <CampaignGenerator
                  businessId={user?.businessId}
                  addToast={addToast}
                  onDraftGenerated={() => {
                    setCurrentPage('manager');
                    loadDashboardData();
                  }}
                />
              </main>
            )}

            {/* --- PAGE: ADS MANAGER VIEW --- */}
            {currentPage === 'manager' && (
              <main style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)' }}>Meta Campaign Manager</h2>
                  <button className="btn-primary" onClick={() => setCurrentPage('builder')}><Plus size={16} /> New Campaign</button>
                </div>

                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: 20 }}>CAMPAIGN NAME</th>
                        <th style={{ padding: 20 }}>STATUS</th>
                        <th style={{ padding: 20 }}>OBJECTIVE</th>
                        <th style={{ padding: 20 }}>DAILY BUDGET</th>
                        <th style={{ padding: 20 }}>HEALTH</th>
                        <th style={{ padding: 20 }}>META ID</th>
                        <th style={{ padding: 20 }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No campaigns launched yet. Run the builder wizard!</td>
                        </tr>
                      ) : (
                        campaigns.map(c => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: 20, fontWeight: 600 }}>{c.name}</td>
                            <td style={{ padding: 20 }}>
                              <span style={{
                                padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 500,
                                background: c.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: c.status === 'ACTIVE' ? 'var(--color-accent)' : 'var(--color-danger)'
                              }}>
                                {c.status}
                              </span>
                            </td>
                            <td style={{ padding: 20 }}>{c.objective}</td>
                            <td style={{ padding: 20, fontWeight: 500 }}>₹{c.dailyBudget}/day</td>
                            <td style={{ padding: 20, color: 'var(--color-accent)', fontWeight: 600 }}>{c.healthScore}%</td>
                            <td style={{ padding: 20, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{c.metaCampaignId}</td>
                            <td style={{ padding: 20 }}>
                              <button onClick={() => toggleCampaignStatus(c.id, c.status)} style={{
                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-main)'
                              }}>
                                {c.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </main>
            )}

            {/* --- PAGE: DEEP ANALYTICS VIEW --- */}
            {currentPage === 'analytics' && (
              <main style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
                <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)' }}>Marketing Channel Funnel</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                  <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>IMPRESSIONS</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '8px 0' }}>{metrics.totalImpressions?.toLocaleString() || '0'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>100% Top of Funnel</div>
                  </div>
                  <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>CLICKS</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '8px 0' }}>{metrics.totalClicks?.toLocaleString() || '0'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>{((metrics.totalClicks / (metrics.totalImpressions || 1)) * 100).toFixed(2)}% Conversion rate</div>
                  </div>
                  <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>CONVERSIONS</div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '8px 0' }}>{metrics.totalConversions || '0'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>{((metrics.totalConversions / (metrics.totalClicks || 1)) * 100).toFixed(2)}% Purchase rate</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 20 }}>Export Reporting Sheets</h3>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <button className="btn-primary" onClick={() => addToast('Exporting PDF', 'Preparing platform summary documents...', 'success')}>Export Campaign PDF</button>
                    <button className="btn-secondary" onClick={() => addToast('Exporting CSV', 'Preparing raw stats spreadsheet...', 'success')}>Export Analytics CSV</button>
                  </div>
                </div>
              </main>
            )}

            {/* --- PAGE: SUPPORT PANEL --- */}
            {currentPage === 'support' && (
              <main style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <div className="glass-panel" style={{ maxWidth: 640, width: '100%', padding: 40 }}>
                  <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Help Desk & Verification</h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 32 }}>Verify ad accounts, set domain pixels or report billing inquiries.</p>
                  
                  <form onSubmit={submitTicket} style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 500 }}>Ticket Subject</label>
                      <input className="form-input" placeholder="e.g. Help verifying pixel conversion events" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', fontWeight: 500 }}>Details</label>
                      <textarea className="form-input" rows={4} placeholder="Describe the configuration failure or custom setup support required..." value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} required />
                    </div>
                    <button className="btn-primary" type="submit">Submit Support Ticket</button>
                  </form>

                  <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Your Active Tickets</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tickets.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No support tickets active.</div>
                    ) : (
                      tickets.map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.subject}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{t.description}</div>
                          </div>
                          <span style={{
                            padding: '4px 10px', borderRadius: 99, fontSize: '0.7rem',
                            background: t.status === 'OPEN' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: t.status === 'OPEN' ? 'var(--color-warning)' : 'var(--color-success)'
                          }}>{t.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </main>
            )}

            {/* --- PAGE: CONTENT CALENDAR VIEW --- */}
            {currentPage === 'calendar' && user?.businessId && (
              <main style={{ padding: 40 }}>
                <ContentCalendar businessId={user.businessId} onToast={addToast} />
              </main>
            )}

            {/* --- PAGE: AUTO SCHEDULER VIEW --- */}
            {currentPage === 'scheduler' && user?.businessId && (
              <main style={{ padding: 40 }}>
                <SchedulerPanel businessId={user.businessId} onToast={addToast} />
              </main>
            )}

            {/* --- PAGE: PROFILE --- */}
            {currentPage === 'profile' && user && (
              <ErrorBoundary>
                <ProfileScreen businessId={user.businessId || 'default_business'} onToast={addToast} />
              </ErrorBoundary>
            )}

            {/* --- PAGE: CONNECT META --- */}
            {currentPage === 'connect-meta' && user?.businessId && (
              <ConnectMeta businessId={user.businessId} addToast={addToast} />
            )}

            {/* --- PAGE: SETTINGS --- */}
            {currentPage === 'settings' && (
              <main style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div>
                  <h1 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Settings</h1>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Manage your account, business profile, and integrations.</p>
                </div>

                {/* Account Info */}
                <div className="glass-panel" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserIcon size={18} style={{ color: 'var(--color-primary)' }} /> Account Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>FULL NAME</label>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{user?.name || '—'}</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>EMAIL</label>
                      <div style={{ fontSize: '0.95rem' }}>{user?.email || '—'}</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>ROLE</label>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700,
                        background: user?.role === 'ADMIN' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                        color: user?.role === 'ADMIN' ? '#ef4444' : 'var(--color-primary)'
                      }}>{user?.role || 'MEMBER'}</span>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>BUSINESS WORKSPACE</label>
                      <div style={{ fontSize: '0.95rem' }}>{user?.businessName || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Meta Integration shortcut */}
                <div className="glass-panel" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity size={18} style={{ color: 'var(--color-primary)' }} /> Meta Integration
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                    Connect your Facebook Business Manager to enable campaign publishing and analytics sync.
                  </p>
                  <button className="btn-secondary" onClick={() => setCurrentPage('connect-meta')} style={{ gap: 8 }}>
                    <Activity size={14} /> Manage Meta Connection
                  </button>
                </div>

                {/* Subscription */}
                <div className="glass-panel" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={18} style={{ color: 'var(--color-primary)' }} /> Subscription Plan
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{
                      padding: '6px 16px', borderRadius: 99, fontSize: '0.85rem', fontWeight: 700,
                      background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary)',
                      border: '1px solid rgba(99,102,241,0.3)'
                    }}>FREE TIER</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Upgrade to unlock advanced AI features and higher limits.</span>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="glass-panel" style={{ padding: 28, borderColor: 'rgba(239,68,68,0.2)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 12, color: 'var(--color-danger)' }}>Session</h3>
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 10, color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </main>
            )}

            {/* --- PAGE: ADMIN PLATFORM PANEL --- */}
            {currentPage === 'admin' && (
              <main style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
                <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)' }}>Superuser Admin Panel</h2>

                {adminStats && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    <div className="glass-panel" style={{ padding: 20 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>GLOBAL REGISTERED USERS</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>{adminStats.totalUsers}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: 20 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>ACTIVE BUSINESSES</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>{adminStats.totalBusinesses}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: 20 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>RUNNING META ADS</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>{adminStats.activeCampaigns}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: 20 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>ACTIVE SUBSCRIBERS</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: 4 }}>{adminStats.activeSubscribers}</div>
                    </div>
                  </div>
                )}

                {/* Users List & Tickets management */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div className="glass-panel" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Platform Subscriptions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {adminBusinesses.map(b => (
                        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 10, fontSize: '0.85rem' }}>
                          <div>
                            <strong>{b.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {b.id}</div>
                          </div>
                          <span>{b.subscriptions[0]?.plan || 'FREE'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Resolve Platform Tickets</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {adminTickets.map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 10, fontSize: '0.85rem' }}>
                          <div>
                            <strong>{t.subject}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>User: {t.user?.email}</div>
                          </div>
                          {t.status === 'OPEN' ? (
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => updateTicketAdmin(t.id, 'RESOLVED')}>Resolve</button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>RESOLVED</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Audit Logs list */}
                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Operational Audit logs</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {adminLogs.map(l => (
                      <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 6, fontSize: '0.8rem' }}>
                        <span><strong>{l.action}</strong>: {l.details}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>User: {l.user?.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            )}

          </div>

          {/* --- FLOATING PERSISTENT AI CHAT ASSISTANT --- */}
          <div style={{
            position: 'fixed', bottom: 24, left: 24, zIndex: 999
          }}>
            {/* Round floating button */}
            <button onClick={() => setIsAssistantOpen(!isAssistantOpen)} style={{
              width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)', transition: 'var(--transition-smooth)'
            }}>
              {isAssistantOpen ? <X size={22} /> : <MessageSquare size={22} />}
            </button>

            {/* Sliding drawer panel */}
            {isAssistantOpen && (
              <div className="glass-panel" style={{
                position: 'absolute', bottom: 70, left: 0, width: 360, height: 480,
                display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden'
              }}>
                <div style={{
                  padding: 20, borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <h4 style={{ fontSize: '0.9rem' }}>DIPARI AI Help Bot</h4>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}>Official Support Assistant</div>
                  </div>
                </div>

                {/* Messages list */}
                <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {chatMessages.map((m, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                      <div style={{
                        maxWidth: '85%', padding: '10px 14px', borderRadius: 12, fontSize: '0.85rem',
                        background: m.role === 'user' ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                        color: '#fff', border: m.role === 'user' ? 'none' : '1px solid var(--color-border)'
                      }}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input area */}
                <form onSubmit={sendAssistantMessage} style={{ padding: 16, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
                  <input className="form-input" placeholder="Ask a question about DIPARI AI..." value={assistantInput} onChange={e => setAssistantInput(e.target.value)} style={{ padding: 10, fontSize: '0.8rem' }} />
                  <button className="btn-primary" type="submit" style={{ padding: 10 }}><Send size={14} /></button>
                </form>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
