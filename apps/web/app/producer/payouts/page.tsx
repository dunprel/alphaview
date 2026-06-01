'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ProducerSidebar from '@/components/producer/ProducerSidebar';
import { producerApi } from '@/lib/api/producer';
import { formatNgn, timeAgo } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { badge: string; icon: any; label: string }> = {
  pending:    { badge: 'av-badge-yellow', icon: Clock,        label: 'Pending'    },
  approved:   { badge: 'av-badge-purple', icon: CheckCircle,  label: 'Approved'   },
  processing: { badge: 'av-badge-blue',   icon: AlertCircle,  label: 'Processing' },
  paid:       { badge: 'av-badge-green',  icon: CheckCircle,  label: 'Paid'       },
  rejected:   { badge: 'av-badge-red',    icon: XCircle,      label: 'Rejected'   },
};

export default function ProducerPayoutsPage() {
  const [payouts,  setPayouts]  = useState<any[]>([]);
  const [balance,  setBalance]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [amount,   setAmount]   = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    Promise.all([producerApi.getPayouts(), producerApi.getBalance()])
      .then(([p, b]) => { setPayouts(p); setBalance(b); })
      .finally(() => setLoading(false));
  }, []);

  const request = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 5000) { toast.error('Minimum payout is ₦5,000'); return; }
    if (balance && amt > balance.earningsBalanceNgn) { toast.error('Amount exceeds available balance'); return; }
    setRequesting(true);
    try {
      await producerApi.requestPayout(amt);
      toast.success('Payout request submitted! You will be notified once processed.');
      setAmount('');
      const [p, b] = await Promise.all([producerApi.getPayouts(), producerApi.getBalance()]);
      setPayouts(p); setBalance(b);
    } catch (err: any) { toast.error(err.message || 'Request failed'); }
    finally { setRequesting(false); }
  };

  return (
    <div className="flex min-h-screen bg-av-bg">
      <ProducerSidebar active="payouts" />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">

        <div className="mb-8">
          <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>Payouts</h1>
          <p className="text-av-text-muted text-sm mt-1">Request withdrawals to your Nigerian bank account</p>
        </div>

        {/* Balance banner */}
        <div className="relative overflow-hidden rounded-av-lg p-6 mb-8"
          style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.25) 0%,rgba(217,70,239,0.15) 100%)', border: '1px solid rgba(124,58,237,0.3)' }}>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle,#d946ef,transparent)' }} />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-av-text-muted text-sm mb-1">Available for Withdrawal</p>
              <div className="font-display text-4xl text-white" style={{ letterSpacing: '0.02em' }}>
                {balance ? formatNgn(balance.earningsBalanceNgn) : '—'}
              </div>
              <p className="text-xs text-av-text-muted mt-2">
                All-time earned: <span className="text-av-purple-lt font-medium">
                  {balance ? formatNgn(balance.totalEarnedNgn) : '—'}
                </span>
              </p>
            </div>

            {/* Quick request */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-av-text-muted font-mono text-sm">₦</span>
                <input value={amount} onChange={e => setAmount(e.target.value)}
                  type="number" min={5000} placeholder="Enter amount"
                  className="av-input pl-8 font-mono text-sm w-full" />
              </div>
              <button onClick={request} disabled={requesting}
                className="btn-primary text-sm whitespace-nowrap disabled:opacity-60">
                {requesting ? 'Submitting…' : 'Request Payout'}
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-3 p-4 rounded-av bg-av-surface border border-av-border mb-8">
          <AlertCircle size={15} className="text-av-warning flex-shrink-0 mt-0.5" />
          <div className="text-xs text-av-text-muted leading-relaxed">
            Payout requests are reviewed by our admin team within 24 hours.
            Minimum withdrawal is ₦5,000. Transfers are sent directly to your registered bank account via Paystack.
            Make sure your bank account is set up in the <a href="/producer/earnings" className="text-av-purple-lt hover:underline">Earnings</a> section.
          </div>
        </div>

        {/* History table */}
        <div className="av-card overflow-hidden">
          <div className="px-6 py-4 border-b border-av-border">
            <h3 className="font-semibold text-av-text">Payout History</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-av-border">
                {['Amount', 'Status', 'Requested', 'Paid At', 'Reference'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-av-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-av-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-20 rounded" /></td>
                  ))}</tr>
                ))
              ) : payouts.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Wallet size={32} className="text-av-text-dim" />
                    <p className="text-av-text-muted text-sm">No payout requests yet.</p>
                    <p className="text-xs text-av-text-dim">Request your first withdrawal above.</p>
                  </div>
                </td></tr>
              ) : payouts.map((p: any, i) => {
                const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }} className="hover:bg-av-surface/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-bold text-av-text">{formatNgn(Math.round((p.amount_kobo ?? 0) / 100))}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`av-badge text-[10px] ${cfg.badge}`}>
                        <Icon size={9} /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-av-text-muted">{timeAgo(p.requested_at)}</td>
                    <td className="px-5 py-4 text-xs text-av-text-muted">{p.paid_at ? timeAgo(p.paid_at) : '—'}</td>
                    <td className="px-5 py-4 text-xs font-mono text-av-text-dim">
                      {p.transfer_ref ? `${p.transfer_ref.slice(0, 18)}…` : '—'}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
