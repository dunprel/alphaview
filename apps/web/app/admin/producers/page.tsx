'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BadgeCheck, Ban, Film, Users, DollarSign, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminSidebar from '@/components/admin/AdminSidebar';
import api from '@/lib/api/client';
import { formatNgn, timeAgo } from '@/lib/utils';

export default function AdminProducersPage() {
  const [producers, setProducers] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [selected,  setSelected]  = useState<any | null>(null);
  const [commission, setCommission] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/admin/producers', {
      params: { search: search || undefined, page, limit: 15 },
    });
    setProducers(data.data);
    setTotal(data.meta.total);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, page]);

  const verify = async (id: string) => {
    try {
      await api.patch(`/admin/producers/${id}/verify`);
      toast.success('Producer verified');
      setProducers(prev => prev.map(p => p.id === id ? { ...p, is_verified: true } : p));
    } catch { toast.error('Failed to verify'); }
  };

  const suspend = async (id: string) => {
    try {
      await api.patch(`/admin/producers/${id}/suspend`, { reason: 'Suspended by admin' });
      toast.success('Producer suspended');
      load();
    } catch { toast.error('Failed to suspend'); }
  };

  const updateCommission = async (id: string) => {
    const rate = parseFloat(commission);
    if (isNaN(rate) || rate < 0 || rate > 50) { toast.error('Rate must be 0–50'); return; }
    try {
      await api.patch(`/admin/producers/${id}/commission`, { rate });
      toast.success(`Commission updated to ${rate}%`);
      setSelected(null);
      load();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="flex min-h-screen bg-av-bg">
      <AdminSidebar active="producers" />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>Producers</h1>
            <p className="text-av-text-muted text-sm mt-1">{total.toLocaleString()} registered studios</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm mb-6">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-av-text-dim" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search studio name…"
            className="av-input pl-9 py-2.5 text-sm w-full" />
        </div>

        {/* Table */}
        <div className="av-card overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-av-border">
                {['Studio', 'Owner', 'Content', 'Earnings', 'Followers', 'Commission', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-av-text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-av-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-20 rounded" /></td>
                  ))}</tr>
                ))
              ) : producers.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-av-text-muted text-sm">No producers found.</td></tr>
              ) : producers.map((p: any, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-av-surface/50 transition-colors">

                  {/* Studio */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-av-elevated flex items-center justify-center text-sm font-bold text-av-purple-lt flex-shrink-0">
                        {p.studio_name?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-av-text">{p.studio_name}</span>
                          {p.is_verified && <BadgeCheck size={13} className="text-av-purple-lt" />}
                        </div>
                        <span className="text-xs text-av-text-dim">{timeAgo(p.created_at)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-av-text">{p.user?.full_name}</div>
                    <div className="text-xs text-av-text-dim">{p.user?.email}</div>
                  </td>

                  {/* Content */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-av-text">
                      <Film size={12} className="text-av-purple-lt" />
                      {p.content_count ?? 0}
                    </div>
                  </td>

                  {/* Earnings */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-semibold text-av-success">
                      {formatNgn(Math.round((p.total_earned ?? 0) / 100))}
                    </span>
                  </td>

                  {/* Followers */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-av-text">
                      <Users size={12} className="text-av-purple-lt" />
                      {(p.follower_count ?? 0).toLocaleString()}
                    </div>
                  </td>

                  {/* Commission */}
                  <td className="px-5 py-3.5">
                    <button onClick={() => { setSelected(p); setCommission(String(p.commission_rate ?? 20)); }}
                      className="text-sm font-semibold text-av-purple-lt hover:underline">
                      {p.commission_rate ?? 20}%
                    </button>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    {p.is_suspended
                      ? <span className="av-badge-red text-[10px]">Suspended</span>
                      : p.is_verified
                      ? <span className="av-badge-green text-[10px]">Verified</span>
                      : <span className="av-badge-yellow text-[10px]">Unverified</span>
                    }
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {!p.is_verified && (
                        <button onClick={() => verify(p.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-av text-xs font-medium text-av-success bg-av-success/10 hover:bg-av-success/20 border border-av-success/20 transition-all whitespace-nowrap">
                          <BadgeCheck size={11} /> Verify
                        </button>
                      )}
                      {!p.is_suspended && (
                        <button onClick={() => suspend(p.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-av text-xs font-medium text-av-danger bg-av-danger/10 hover:bg-av-danger/20 border border-av-danger/20 transition-all">
                          <Ban size={11} /> Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 15 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-av-border">
              <span className="text-xs text-av-text-muted">
                {((page - 1) * 15) + 1}–{Math.min(page * 15, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-av text-xs border border-av-border text-av-text-muted disabled:opacity-40 hover:border-av-border-md transition-all">← Prev</button>
                <button disabled={page * 15 >= total} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-av text-xs border border-av-border text-av-text-muted disabled:opacity-40 hover:border-av-border-md transition-all">Next →</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Commission edit modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm av-card p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-av-text mb-1">Edit Commission Rate</h3>
            <p className="text-xs text-av-text-muted mb-5">{selected.studio_name}</p>
            <label className="text-xs text-av-text-muted mb-1.5 block">Commission % (0–50)</label>
            <input value={commission} onChange={e => setCommission(e.target.value)}
              type="number" min={0} max={50} step={1}
              className="av-input font-mono mb-5" />
            <p className="text-xs text-av-text-dim mb-5 leading-relaxed">
              Platform keeps this percentage of every sale. Producer receives the rest.
              Current platform default is 20%.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button onClick={() => updateCommission(selected.id)} className="btn-primary flex-1 text-sm">Save Rate</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
