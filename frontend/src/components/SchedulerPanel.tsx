import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, XCircle, Calendar, RefreshCw, CheckCircle2, Send } from 'lucide-react';
import { api } from '../services/api';

interface SchedulerPanelProps {
  businessId: string;
  onToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export const SchedulerPanel: React.FC<SchedulerPanelProps> = ({ businessId, onToast }) => {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [triggering, setTriggering] = useState(false);

  const fetchPosts = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await api.scheduler.getPosts(businessId);
      setPosts(res.posts || []);
    } catch (err: any) {
      onToast('Error', err.message || 'Failed to fetch scheduled posts', 'alert');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [businessId]);

  const handlePause = async (id: string) => {
    try {
      await api.scheduler.pause(id);
      onToast('Paused', 'Scheduled post paused', 'info');
      fetchPosts();
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.scheduler.resume(id);
      onToast('Resumed', 'Scheduled post resumed', 'success');
      fetchPosts();
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.scheduler.cancel(id);
      onToast('Cancelled', 'Scheduled post cancelled', 'info');
      fetchPosts();
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    }
  };

  const handleTriggerNow = async () => {
    setTriggering(true);
    try {
      const res = await api.scheduler.trigger();
      onToast('Publisher Triggered', `Processed ${res.processedCount || 0} posts (${res.failedCount || 0} failed)`, 'success');
      fetchPosts();
    } catch (err: any) {
      onToast('Error', err.message || 'Failed to trigger scheduler', 'alert');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Auto Scheduler & Meta Publisher</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated publishing engine for Facebook Pages & Instagram Business accounts.
          </p>
        </div>

        <button
          onClick={handleTriggerNow}
          disabled={triggering}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
        >
          {triggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {triggering ? 'Publishing Due Posts...' : 'Trigger Immediate Publisher'}
        </button>
      </div>

      {/* Posts Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-sm text-slate-500">Loading scheduled queue...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Scheduled Posts</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Schedule posts from your Content Calendar or Campaign Builder to view and manage them here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-4">Platform & Type</th>
                  <th className="py-3.5 px-4">Caption / Visual</th>
                  <th className="py-3.5 px-4">Scheduled Time</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {posts.map((post) => {
                  const scheduledDate = post.scheduledTime
                    ? new Date(post.scheduledTime?._seconds ? post.scheduledTime._seconds * 1000 : post.scheduledTime)
                    : null;

                  return (
                    <tr key={post.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${
                              post.platform === 'Facebook'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                            }`}
                          >
                            {post.platform}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">{post.postType || 'Image Post'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{post.caption}</p>
                        {post.headline && <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 font-semibold">{post.headline}</p>}
                      </td>

                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {scheduledDate ? scheduledDate.toLocaleString() : 'Immediate'}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            post.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : post.status === 'SCHEDULED'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : post.status === 'PAUSED'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {post.status === 'PUBLISHED' && <CheckCircle2 className="w-3 h-3" />}
                          {post.status === 'PAUSED' && <Pause className="w-3 h-3" />}
                          {post.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                          {post.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {post.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handlePause(post.id)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg transition-colors"
                              title="Pause Publishing"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}

                          {post.status === 'PAUSED' && (
                            <button
                              onClick={() => handleResume(post.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg transition-colors"
                              title="Resume Publishing"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}

                          {post.status !== 'PUBLISHED' && post.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCancel(post.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors"
                              title="Cancel Post"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
