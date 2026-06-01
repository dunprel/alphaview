'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Eye, Clock, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminSidebar from '@/components/admin/AdminSidebar';
import api from '@/lib/api/client';
import { timeAgo, formatDuration } from '@/lib/utils';

type StatusFilter = 'review' | 'live' | 'rejected' | 'all';

export default function AdminContentPage() {
  const [content,  setContent]  = useState<any[]>([]);
  const [status,   setStatus]   = useState<StatusFilter>('review');
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/admin/content', {
      params: { status: status === 'all' ? undefined : status, search },
    });
    setContent(data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [status, search]);

  const approve = async (id: string) => {
    try {
      await api.patch(`/admin/content/${id}/approve`);
      toast.success('Content approved and published!');
      setContent(prev => prev.filter(c => c.id !== id));
      setSelected(null);
    } catch { toast.error('Failed to approve content'); }
  };

  const reject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Enter a rejection reason'); return; }
    try {
      await api.patch(`/admin/content/${id}/reject`, { reason: rejectReason });
      toast.success('Content rejected');
      setContent(prev => prev.filter(c => c.id !== id));
      setSelected(null);
      setRejectReason('');
    } catch { toast.error('Failed to reject content'); }
  };

  const STATUS_TABS: { value: StatusFilter; label: string; color: string }[] = [
    { value: 'review',   label: 'Pending Review', color: 'text-av-warning'  },
    { value: 'live',     label: 'Live',           color: 'text-av-success'  },
    { value: 'rejected', label: 'Rejected',        color: 'text-av-danger'   },
    { value: 'all',      label: 'All',             color: 'text-av-text'     },
  ];

  return (
    <div className="flex min-h-screen bg-av-bg">
      <AdminSidebar active="content" />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>Content Moderation</h1>
            <p className="text-av-text-muted text-sm mt-1">Review, approve, and manage all platform content</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Status tabs */}
          <div className="flex bg-av-surface border border-av-border rounded-av overflow-hidden">
            {STATUS_TABS.map(({ value, label, color }) => (
              <button key={value} onClick={() => setStatus(value)}
                className={`px-4 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                  status === value ? `text-white` : `${color} opacity-60 hover:opacity-100`
                }`}
                style={status === value ? { background: 'linear-gradient(135deg,#7c3aed,#d946ef)' } : {}}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-av-text-dim" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title, producer..."
              className="av-input pl-9 py-2 text-sm w-full" />
          </div>
        </div>

        {/* Table */}
        <div className="av-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-av-border">
                {['Content', 'Producer', 'Price', 'Duration', 'Submitted', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-av-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-av-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-24 rounded" /></td>
                  ))}</tr>
                ))
              ) : content.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-av-text-muted text-sm">
                  No content found for this filter.
                </td></tr>
              ) : content.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="hover:bg-av-surface/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-12 rounded bg-av-elevated overflow-hidden flex-shrink-0">
                        {c.thumbnailUrl && <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-av-text line-clamp-1 max-w-[160px]">{c.title}</div>
                        <div className="text-xs text-av-text-muted capitalize">{c.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-av-text-muted">{c.producer?.studioName}</td>
                  <td className="px-5 py-3.5 text-sm font-mono text-av-text">₦{c.priceNgn?.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-av-text-muted">{formatDuration(c.durationMins)}</td>
                  <td className="px-5 py-3.5 text-xs text-av-text-muted">{timeAgo(c.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`av-badge text-[10px] ${
                      c.status === 'live'     ? 'av-badge-green'  :
                      c.status === 'review'   ? 'av-badge-yellow' :
                      c.status === 'rejected' ? 'av-badge-red'    : 'av-badge-purple'
                    }`}>
                      {c.status === 'review' && <Clock size={9} />}
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSelected(c)}
                        className="p-1.5 rounded-av text-av-text-muted hover:text-av-purple-lt hover:bg-av-surface transition-all"
                        title="Preview">
                        <Eye size={14} />
                      </button>
                      {c.status === 'review' && (
                        <>
                          <button onClick={() => approve(c.id)}
                            className="p-1.5 rounded-av text-av-text-muted hover:text-av-success hover:bg-av-success/10 transition-all"
                            title="Approve">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => setSelected({ ...c, rejecting: true })}
                            className="p-1.5 rounded-av text-av-text-muted hover:text-av-danger hover:bg-av-danger/10 transition-all"
                            title="Reject">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* ── Detail / Reject Modal ── */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
              className="w-full max-w-lg av-card p-6" onClick={e => e.stopPropagation()}>

              <div className="flex items-start gap-4 mb-5">
                <div className="w-16 h-22 rounded-av overflow-hidden bg-av-elevated flex-shrink-0" style={{ height: 88 }}>
                  {selected.thumbnailUrl && <img src={selected.thumbnailUrl} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h3 className="font-semibold text-av-text">{selected.title}</h3>
                  <p className="text-xs text-av-text-muted mt-1">by {selected.producer?.studioName}</p>
                  <div className="flex gap-2 mt-2">
                    {selected.genre?.map((g: string) => <span key={g} className="av-badge-purple text-[10px]">{g}</span>)}
                  </div>
                </div>
              </div>

              <p className="text-sm text-av-text-muted leading-relaxed mb-5">{selected.description}</p>

              {selected.rejecting ? (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-av-text-muted block">Rejection reason *</label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    rows={3} placeholder="Explain why this content is being rejected..."
                    className="av-input resize-none text-sm" />
                  <div className="flex gap-3">
                    <button onClick={() => setSelected(null)} className="btn-ghost flex-1 text-sm">Cancel</button>
                    <button onClick={() => reject(selected.id)} className="flex-1 py-2.5 rounded-av text-sm font-semibold text-white bg-av-danger hover:bg-red-700 transition-colors">
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setSelected(null)} className="btn-ghost flex-1 text-sm">Close</button>
                  {selected.status === 'review' && (
                    <>
                      <button onClick={() => setSelected({ ...selected, rejecting: true })}
                        className="flex-1 py-2.5 rounded-av text-sm font-semibold text-av-danger border border-av-danger/40 hover:bg-av-danger/10 transition-colors">
                        Reject
                      </button>
                      <button onClick={() => approve(selected.id)} className="btn-primary flex-1 text-sm">
                        <CheckCircle size={15} /> Approve & Publish
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
