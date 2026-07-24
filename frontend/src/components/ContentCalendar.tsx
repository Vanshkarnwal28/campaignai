import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Sparkles, RefreshCw, Clock, ChevronRight } from 'lucide-react';
import { api } from '../services/api';

interface ContentCalendarProps {
  businessId: string;
  onToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export const ContentCalendar: React.FC<ContentCalendarProps> = ({ businessId, onToast }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [calendarEntries, setCalendarEntries] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

  const fetchCalendar = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await api.content.getCalendar(businessId);
      setCalendarEntries(data.entries || []);
    } catch (err: any) {
      onToast('Error', err.message || 'Failed to load content calendar', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [businessId]);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const res = await api.content.generatePlan(businessId);
      onToast('Success', res.message || 'Weekly content calendar generated!', 'success');
      await fetchCalendar();
    } catch (err: any) {
      onToast('Generation Failed', err.message || 'Could not generate content plan', 'alert');
    } finally {
      setGenerating(false);
    }
  };

  const handleSchedulePost = async (entry: any) => {
    try {
      await api.scheduler.schedule({
        businessId,
        calendarEntryId: entry.id,
        caption: entry.caption,
        headline: entry.headline,
        hashtags: entry.hashtags,
        imageUrl: entry.imageUrl,
        platform: entry.platform || 'Instagram',
        scheduledTime: entry.scheduledTime ? new Date(entry.scheduledTime).toISOString() : new Date().toISOString(),
        postType: entry.postType,
      });
      onToast('Scheduled', `Post scheduled for ${entry.platform}`, 'success');
      fetchCalendar();
    } catch (err: any) {
      onToast('Error', err.message || 'Failed to schedule post', 'alert');
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Content Calendar</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Weekly Mon–Fri social plan with AI copy, headlines, CTAs, hashtags, & optimal times.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              List View
            </button>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
          >
            {generating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? 'Generating Weekly Plan...' : 'Generate Weekly Calendar'}
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-sm text-slate-500">Loading content calendar...</span>
        </div>
      ) : calendarEntries.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <CalendarIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Content Plan Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Click 'Generate Weekly Calendar' above to create a custom 5-day social media plan tailored to your business.
          </p>
          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700"
          >
            <Sparkles className="w-4 h-4" /> Generate 5-Day Plan
          </button>
        </div>
      ) : activeTab === 'calendar' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {daysOfWeek.map((dayName, idx) => {
            const entry = calendarEntries.find(
              (e) => (e.dayName || '').toLowerCase() === dayName.toLowerCase() || e.day === idx + 1
            );

            return (
              <div
                key={dayName}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm group"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{dayName}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        entry?.platform === 'Facebook'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                      }`}
                    >
                      {entry?.platform || 'Social'}
                    </span>
                  </div>

                  {entry ? (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 line-clamp-1">
                        {entry.headline || 'Social Post'}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {entry.caption}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{entry.bestPostingTime || '10:00 AM'}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(entry.hashtags || []).slice(0, 3).map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">No post scheduled</div>
                  )}
                </div>

                {entry && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        entry.status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {entry.status || 'SCHEDULED'}
                    </span>

                    <button
                      onClick={() => setSelectedEntry(entry)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5"
                    >
                      Details <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {calendarEntries.map((entry) => (
              <div key={entry.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{entry.dayName}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{entry.platform}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{entry.postType}</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{entry.headline}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{entry.caption}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                    <span className="font-semibold text-indigo-500">CTA: {entry.cta}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Best Time: {entry.bestPostingTime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      entry.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {entry.status}
                  </span>
                  <button
                    onClick={() => handleSchedulePost(entry)}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Schedule Now
                  </button>
                  <button
                    onClick={() => setSelectedEntry(entry)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{selectedEntry.dayName} Post Details</h3>
                <p className="text-xs text-slate-500">{selectedEntry.platform} • {selectedEntry.postType}</p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Headline</label>
                <p className="text-slate-900 dark:text-white font-medium text-sm mt-0.5">{selectedEntry.headline}</p>
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Caption</label>
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap mt-0.5 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">{selectedEntry.caption}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Call to Action (CTA)</label>
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">{selectedEntry.cta}</p>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Best Posting Time</label>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5">{selectedEntry.bestPostingTime}</p>
                </div>
              </div>

              {selectedEntry.hashtags?.length > 0 && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Hashtags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedEntry.hashtags.map((h: string, i: number) => (
                      <span key={i} className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[11px]">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedEntry.imagePrompt && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">AI Image Prompt</label>
                  <p className="text-slate-500 italic mt-0.5 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">{selectedEntry.imagePrompt}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleSchedulePost(selectedEntry);
                  setSelectedEntry(null);
                }}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl"
              >
                Schedule This Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
