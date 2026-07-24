import React, { useState, useEffect } from 'react';
import { Users, Search, Download, Filter, MessageSquare, PhoneCall, Mail, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface LeadsDashboardProps {
  businessId: string;
  onToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export const LeadsDashboard: React.FC<LeadsDashboardProps> = ({ businessId, onToast }) => {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  // AI Lead Assistant Drawer state
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [aiAssistData, setAiAssistData] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [generatedText, setGeneratedText] = useState<string>('');

  const fetchLeads = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.leads.getAll(businessId),
        api.leads.getStats(businessId),
      ]);
      setLeads(leadsRes.leads || []);
      setStats(statsRes);
    } catch (err: any) {
      onToast('Error', err.message || 'Failed to fetch leads', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [businessId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return fetchLeads();
    setLoading(true);
    try {
      const res = await api.leads.search(businessId, searchQuery);
      setLeads(res.leads || []);
    } catch (err: any) {
      onToast('Search Failed', err.message, 'alert');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvData = await api.leads.exportCsv(businessId);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_${businessId}_${Date.now()}.csv`;
      a.click();
      onToast('Exported', 'Leads downloaded successfully as CSV', 'success');
    } catch (err: any) {
      onToast('Export Failed', err.message, 'alert');
    }
  };

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      await api.leads.update(leadId, { status });
      onToast('Status Updated', `Lead status changed to ${status}`, 'success');
      fetchLeads();
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    }
  };

  const handleOpenAiAssist = async (lead: any) => {
    setSelectedLead(lead);
    setLoadingAi(true);
    setGeneratedText('');
    try {
      const data = await api.leads.getAiAssist(lead.id);
      setAiAssistData(data);
    } catch (err: any) {
      onToast('AI Error', err.message || 'Failed to generate AI lead analysis', 'alert');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGenerateWhatsApp = async () => {
    if (!selectedLead) return;
    setLoadingAi(true);
    try {
      const res = await api.leads.generateWhatsApp(selectedLead.id);
      setGeneratedText(res.message || '');
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!selectedLead) return;
    setLoadingAi(true);
    try {
      const res = await api.leads.generateEmail(selectedLead.id);
      setGeneratedText(res.message || '');
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGenerateCallScript = async () => {
    if (!selectedLead) return;
    setLoadingAi(true);
    try {
      const res = await api.leads.generateCallScript(selectedLead.id);
      setGeneratedText(res.script || '');
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    } finally {
      setLoadingAi(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (selectedStatus === 'ALL') return true;
    return (l.status || 'NEW') === selectedStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lead Management CRM & AI Assistant</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Meta Lead Ads sync, lead tracking, CSV export, and AI-powered follow-up generator.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-xs transition-all border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Total Leads</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">New Leads</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.byStatus?.NEW || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Contacted</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.byStatus?.CONTACTED || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Converted</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.byStatus?.CONVERTED || 0}</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="CONVERTED">Converted</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-sm text-slate-500">Loading leads...</span>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Leads Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Connect Meta Lead Ads or capture leads via your website form to view them in your CRM.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-4">Lead Name</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Source & Campaign</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">AI Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>
                        {lead.name}
                        {lead.requirement && (
                          <p className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">{lead.requirement}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                      <div>{lead.email}</div>
                      {lead.phone && <div className="text-[11px] text-slate-400">{lead.phone}</div>}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {lead.source || 'MANUAL'}
                      </span>
                      {lead.campaign && <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">{lead.campaign}</div>}
                    </td>

                    <td className="py-4 px-4">
                      <select
                        value={lead.status || 'NEW'}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <option value="NEW">NEW</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="QUALIFIED">QUALIFIED</option>
                        <option value="CONVERTED">CONVERTED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenAiAssist(lead)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> AI Assist
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Lead Assistant Modal / Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> AI Assistant for {selectedLead.name}
                </h3>
                <p className="text-xs text-slate-500">{selectedLead.email} • {selectedLead.phone || 'No phone'}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {loadingAi ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="ml-2 text-sm text-slate-500">Generating AI insights...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Priority & Summary Banner */}
                {aiAssistData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-indigo-50/50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    <div className="md:col-span-2">
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">AI Summary</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{aiAssistData.summary}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">Suggested Priority</span>
                      <div className="mt-1">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            aiAssistData.priority?.level === 'HIGH'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : aiAssistData.priority?.level === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {aiAssistData.priority?.level || 'MEDIUM'} PRIORITY
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1">{aiAssistData.priority?.reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Action Tabs */}
                <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <button
                    onClick={handleGenerateWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Template
                  </button>
                  <button
                    onClick={handleGenerateEmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100"
                  >
                    <Mail className="w-3.5 h-3.5" /> Email Draft
                  </button>
                  <button
                    onClick={handleGenerateCallScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-100"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Call Script
                  </button>
                </div>

                {/* Output Text Area */}
                {generatedText ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Generated Material:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedText);
                          onToast('Copied', 'Text copied to clipboard!', 'info');
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={8}
                      value={generatedText}
                      className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Click one of the buttons above to generate a WhatsApp message, Email reply, or Call script for this lead.
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
