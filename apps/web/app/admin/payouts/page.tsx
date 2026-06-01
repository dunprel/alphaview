'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Search, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminSidebar from '@/components/admin/AdminSidebar';
import api from '@/lib/api/client';
import { formatNgn, timeAgo } from '@/lib/utils';

type Filter = 'pending' | 'approved' | 'paid' | 'all';

export default function AdminPayoutsPage() {
  const [payouts,  setPayouts]  = useState<any[]>([]);
  const [filter,   setFilter]   = useState<Filter>('pending');
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [summary,  setSummary]  = useState({ pending: 0, pendingAmount: 0, paidMtd: 0 });

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }] = await Promise.all([
      api.get('/admin/payouts', { params: { status: filter === 'all' ? undefined : filter, search } }),
      api.get('/admin/payouts/summary'),
    ]);
    setPayouts(p.data);
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, search]);

  const approve = async (id: string) => {
    try {
      await api.post(`/admin/payouts/${id}/approve`);
      toast.success('Payout approved — bank transfer initiated');
      load();
    } catch { toast.error('Failed to approve payout'); }
  };

  const reject = async (id: string) => {
    try {
      await api.patch(`/admin/payouts/${id}/reject`);
      toast.success('Payout rejected');
      load();
    } catch { toast.error('Failed to reject payout'); }
  };

  const STATUS_TABS: { value: Filter; label: string }[] = [
    { value: 'pending',  label: 'Pending'  },
    { value: 'approved', label: 'Approved' },
    { value: 'paid',     label: 'Paid'     },
    { value: 'all',      label: 'All'      },
  ];

  return (
    <div className="flex min-h-screen bg-av-bg">
      <AdminSidebar active="payouts" />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>Payout Requests</h1>
          <p className="text-av-text-muted text-sm mt-1">Manage producer withdrawal requests</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pending Requests', value: summary.pending,       icon: Clock,       color: '#f59e0b', fmt: false },
            { label: 'Pending Amount',   value: summary.pendingAmount,  icon: DollarSign,  color: '#d946ef', fmt: true  },
            { label: 'Paid This Month',  value: summary.paidMtd,       icon: CheckCircle, color: '#22c55e', fmt: true  },
          ].map(({ label, value, icon: Icon, color, fmt }) => (
            <div key={label} className="av-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-av flex items-center justify-center"
                  style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-av-text">
                {fmt ? formatNgn(value) : value}
              </div>
              <div className="text-xs text-av-text-muted mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex bg-av-surface border border-av-border rounded-av overflow-hidden">
            {STATUS_TABS.map(({ value, label }) => (
              <button key={value} onClick={() => setFilter(value)}
                className={`px-4 py-2 text-xs font-medium transition-all ${
                  filter === value ? 'text-white' : 'text-av-text-muted hover:text-av-text'
                }`}
                style={filter === value ? { background: 'linear-gradient(135deg,#7c3aed,#d946ef)' } : {}}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-av-text-dim" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search producer..." className="av-input pl-9 py-2 text-sm w-64" />
          </div>
        </div>

        {/* Table */}
        <div className="av-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-av-border">
                {['Producer', 'Studio', 'Amount', 'Bank', 'Requested', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-av-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-av-border">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-24 rounded" /></td>
                    ))}</tr>
                  ))
                : payouts.length === 0
                ? <tr><td colSpan={7} className="px-5 py-16 text-center text-av-text-muted text-sm">No payout requests found.</td></tr>
                : payouts.map((p: any, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="hover:bg-av-surface/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-av-text">{p.producer?.user?.fullName}</td>
                    <td className="px-5 py-3.5 text-sm text-av-text-muted">{p.producer?.studioName}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-av-text">{formatNgn(p.amountNgn)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-av-text-muted">
                      ••••{p.producer?.bankAccountLast4 ?? '****'} · {p.producer?.bankName}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-av-text-muted">{timeAgo(p.requestedAt)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`av-badge text-[10px] ${
                        p.status === 'paid'      ? 'av-badge-green'  :
                        p.status === 'pending'   ? 'av-badge-yellow' :
                        p.status === 'approved'  ? 'av-badge-purple' :
                        p.status === 'failed'    ? 'av-badge-red'    : ''
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => approve(p.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-av text-xs font-medium text-av-success bg-av-success/10 hover:bg-av-success/20 border border-av-success/20 transition-all">
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button onClick={() => reject(p.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-av text-xs font-medium text-av-danger bg-av-danger/10 hover:bg-av-danger/20 border border-av-danger/20 transition-all">
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      )}
                      {p.status === 'paid' && (
                        <span className="text-xs text-av-text-dim">Ref: {p.transferRef?.slice(0,12)}...</span>
                      )}
                    </td>
                  </motion.tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
