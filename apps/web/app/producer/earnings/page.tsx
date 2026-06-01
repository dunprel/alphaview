'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ProducerSidebar  from '@/components/producer/ProducerSidebar';
import { producerApi } from '@/lib/api/producer';
import { formatNgn, timeAgo } from '@/lib/utils';

export default function ProducerEarningsPage() {
  const [balance,  setBalance]  = useState<any>(null);
  const [payouts,  setPayouts]  = useState<any[]>([]);
  const [banks,    setBanks]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [bankForm, setBankForm] = useState({ accountNumber: '', bankCode: '', accountName: '' });
  const [requesting, setRequesting] = useState(false);
  const [amount,   setAmount]   = useState('');

  useEffect(() => {
    Promise.all([
      producerApi.getPayouts(),
      fetch('/api/producer/balance').then(r => r.json()).catch(() => null),
      producerApi.getNigerianBanks(),
    ]).then(([p, b, banks]) => {
      setPayouts(p);
      setBalance(b);
      setBanks(banks);
    }).finally(() => setLoading(false));
  }, []);

  const handleRequestPayout = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 5000) { toast.error('Minimum payout is ₦5,000'); return; }
    setRequesting(true);
    try {
      await producerApi.requestPayout(amt);
      toast.success('Payout request submitted! Admin will process within 24 hours.');
      setAmount('');
      const p = await producerApi.getPayouts();
      setPayouts(p);
    } catch (err: any) {
      toast.error(err.message || 'Request failed');
    } finally { setRequesting(false); }
  };

  const handleSaveBank = async () => {
    if (!bankForm.accountNumber || !bankForm.bankCode || !bankForm.accountName) {
      toast.error('Fill all fields'); return;
    }
    try {
      await producerApi.saveBankAccount(bankForm);
      toast.success('Bank account saved!');
      setShowSetup(false);
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
  };

  const STATUS_BADGE: Record<string, string> = {
    pending:    'av-badge-yellow',
    approved:   'av-badge-purple',
    processing: 'av-badge-blue',
    paid:       'av-badge-green',
    rejected:   'av-badge-red',
  };

  return (
    <div className="flex min-h-screen bg-av-bg">
      <ProducerSidebar active="earnings" />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>Earnings</h1>
          <p className="text-av-text-muted text-sm mt-1">Your revenue, balance and payout history</p>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Available Balance', value: balance?.earningsBalanceNgn ?? 0, icon: Wallet,     color: '#d946ef', primary: true },
            { label: 'Total Earned',      value: balance?.totalEarnedNgn ?? 0,     icon: TrendingUp,  color: '#22c55e'              },
            { label: 'Pending Payouts',   value: payouts.filter(p => p.status === 'pending').reduce((s: number, p: any) => s + (p.amount_kobo ?? 0) / 100, 0), icon: Clock, color: '#f59e0b' },
          ].map(({ label, value, icon: Icon, color, primary }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className={`av-card p-6 ${primary ? 'relative overflow-hidden' : ''}`}
              style={primary ? { border: '1px solid rgba(217,70,239,0.35)' } : {}}>
              {primary && (
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10"
                  style={{ background: 'radial-gradient(circle,#d946ef,transparent)' }} />
              )}
              <div className="flex items-center gap-3 mb-3 relative">
                <div className="w-10 h-10 rounded-av flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={18} style={{ color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-av-text relative">{formatNgn(value)}</div>
              <div className="text-xs text-av-text-muted mt-1">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* Payout request + bank setup */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Request payout */}
          <div className="av-card p-6">
            <h3 className="font-semibold text-av-text mb-4 flex items-center gap-2">
              <ArrowUpRight size={16} className="text-av-success" /> Request Payout
            </h3>
            <div className="mb-4">
              <label className="text-xs text-av-text-muted mb-1.5 block">Amount (₦) — minimum ₦5,000</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-av-text-muted font-mono text-sm">₦</span>
                <input value={amount} onChange={e => setAmount(e.target.value)}
                  type="number" min={5000} placeholder="10000"
                  className="av-input pl-8 font-mono" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSetup(true)} className="btn-secondary flex-1 text-sm">
                Setup Bank Account
              </button>
              <button onClick={handleRequestPayout} disabled={requesting}
                className="btn-primary flex-1 text-sm disabled:opacity-60">
                {requesting ? 'Submitting…' : 'Request Payout'}
              </button>
            </div>
            <p className="text-xs text-av-text-dim mt-3 leading-relaxed">
              Payouts are processed within 24 hours after admin approval. Transfers go directly to your Nigerian bank account.
            </p>
          </div>

          {/* Bank account setup */}
          {showSetup ? (
            <div className="av-card p-6">
              <h3 className="font-semibold text-av-text mb-4">Bank Account Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-av-text-muted mb-1.5 block">Bank</label>
                  <select value={bankForm.bankCode} onChange={e => setBankForm(p => ({ ...p, bankCode: e.target.value }))}
                    className="av-input text-sm">
                    <option value="">Select bank…</option>
                    {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-av-text-muted mb-1.5 block">Account Number</label>
                  <input value={bankForm.accountNumber} onChange={e => setBankForm(p => ({ ...p, accountNumber: e.target.value }))}
                    type="text" maxLength={10} placeholder="0123456789" className="av-input text-sm font-mono" />
                </div>
                <div>
                  <label className="text-xs text-av-text-muted mb-1.5 block">Account Name</label>
                  <input value={bankForm.accountName} onChange={e => setBankForm(p => ({ ...p, accountName: e.target.value }))}
                    type="text" placeholder="As it appears on your account" className="av-input text-sm" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowSetup(false)} className="btn-ghost flex-1 text-sm">Cancel</button>
                  <button onClick={handleSaveBank} className="btn-primary flex-1 text-sm">Save Account</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="av-card p-6 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-av-surface flex items-center justify-center mb-3">
                <Wallet size={24} className="text-av-purple-lt" />
              </div>
              <p className="text-av-text-muted text-sm">Set up your Nigerian bank account to receive payouts directly.</p>
              <button onClick={() => setShowSetup(true)} className="btn-secondary text-sm mt-4">Setup Bank Account</button>
            </div>
          )}
        </div>

        {/* Payout history */}
        <div className="av-card overflow-hidden">
          <div className="px-6 py-4 border-b border-av-border">
            <h3 className="font-semibold text-av-text">Payout History</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-av-border">
                {['Amount', 'Status', 'Requested', 'Paid', 'Reference'].map(h => (
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
                <tr><td colSpan={5} className="px-5 py-12 text-center text-av-text-muted text-sm">No payout requests yet.</td></tr>
              ) : payouts.map((p: any, i) => (
                <tr key={p.id} className="hover:bg-av-surface/50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-av-text">{formatNgn(Math.round((p.amount_kobo ?? 0) / 100))}</td>
                  <td className="px-5 py-3.5"><span className={`av-badge text-[10px] ${STATUS_BADGE[p.status] ?? ''}`}>{p.status}</span></td>
                  <td className="px-5 py-3.5 text-xs text-av-text-muted">{timeAgo(p.requested_at)}</td>
                  <td className="px-5 py-3.5 text-xs text-av-text-muted">{p.paid_at ? timeAgo(p.paid_at) : '—'}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-av-text-dim">{p.transfer_ref ? p.transfer_ref.slice(0, 16) + '…' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
