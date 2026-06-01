'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Play, DollarSign, Upload, Bell,
  Eye, Star, Globe, ArrowUpRight, ArrowDownRight,
  Film, ChevronRight, Wallet, Clock,
} from 'lucide-react';
import ProducerSidebar from '@/components/producer/ProducerSidebar';
import { useProducerAnalytics } from '@/hooks/useProducerAnalytics';
import { formatNgn } from '@/lib/utils';

const RANGE_OPTIONS = ['7d', '30d', '3m', '12m'] as const;
type Range = typeof RANGE_OPTIONS[number];

export default function ProducerDashboard() {
  const [range, setRange] = useState<Range>('30d');
  const { dashboard, revenue, countries, topContent, loading } = useProducerAnalytics(range);

  return (
    <div className="flex min-h-screen bg-av-bg">
      <ProducerSidebar active="dashboard" />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>Dashboard</h1>
            <p className="text-av-text-muted text-sm mt-1">
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Range picker */}
            <div className="flex items-center bg-av-surface border border-av-border rounded-av overflow-hidden">
              {RANGE_OPTIONS.map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${range === r ? 'text-white' : 'text-av-text-muted hover:text-av-text'}`}
                  style={range === r ? { background: 'linear-gradient(135deg,#7c3aed,#d946ef)' } : {}}>
                  {r}
                </button>
              ))}
            </div>
            <Link href="/producer/upload" className="btn-primary text-sm">
              <Upload size={16} /> Upload Content
            </Link>
          </div>
        </div>

        {/* ── Earnings banner ── */}
        {dashboard && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-av-lg p-6 mb-8"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.3) 0%,rgba(217,70,239,0.2) 100%)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20 blur-2xl"
              style={{ background: 'radial-gradient(circle,#d946ef,transparent)' }} />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-av-text-muted text-sm mb-1">Available Balance</p>
                <div className="font-display text-4xl text-white" style={{ letterSpacing: '0.02em' }}>
                  {formatNgn(dashboard.earningsBalance)}
                </div>
                <p className="text-av-text-muted text-xs mt-2">
                  All-time earned: <span className="text-av-purple-lt font-medium">{formatNgn(dashboard.totalEarned)}</span>
                </p>
              </div>
              <Link href="/producer/payouts" className="btn-primary text-sm flex-shrink-0">
                <Wallet size={16} /> Request Payout
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Views',     value: dashboard?.totalViews,     icon: Eye,      color: '#7c3aed', change: '+12%' },
            { label: 'Purchases',       value: dashboard?.totalPurchases, icon: DollarSign,color: '#d946ef', change: '+8%'  },
            { label: 'Active Titles',   value: dashboard?.contentCount,   icon: Film,     color: '#06b6d4', change: null    },
            { label: 'Followers',       value: dashboard?.followerCount,  icon: Users,    color: '#22c55e', change: '+5%'  },
          ].map(({ label, value, icon: Icon, color, change }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="av-card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-av flex items-center justify-center"
                  style={{ background: `${color}20` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                {change && (
                  <span className={`av-badge text-[10px] ${change.startsWith('+') ? 'av-badge-green' : 'av-badge-red'}`}>
                    {change.startsWith('+') ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {change}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-av-text">
                {value !== undefined ? value.toLocaleString() : '—'}
              </div>
              <div className="text-xs text-av-text-muted mt-1">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Charts row ── */}
        <div className="grid lg:grid-cols-5 gap-6 mb-8">
          {/* Revenue area chart */}
          <div className="lg:col-span-3 av-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-av-text">Revenue</h3>
              <div className="av-badge-purple text-[10px]">₦ NGN</div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue || []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#9d7fc5', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#9d7fc5', fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#1c1035', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#f5f0ff' }}
                  formatter={(v: number) => [formatNgn(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenueNgn" stroke="#7c3aed" strokeWidth={2}
                  fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#d946ef' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Country breakdown */}
          <div className="lg:col-span-2 av-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Globe size={16} className="text-av-purple-lt" />
              <h3 className="font-semibold text-av-text">Top Countries</h3>
            </div>
            <div className="space-y-3">
              {(countries || []).slice(0, 6).map((c, i) => {
                const max  = countries?.[0]?.views ?? 1;
                const pct  = Math.round((c.views / max) * 100);
                return (
                  <div key={c.countryCode}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.flag}</span>
                        <span className="text-xs text-av-text-muted">{c.countryName}</span>
                      </div>
                      <span className="text-xs font-semibold text-av-text">{c.views.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-av-elevated rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg,#7c3aed,#d946ef)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Top content table ── */}
        <div className="av-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-av-border">
            <h3 className="font-semibold text-av-text">Top Performing Titles</h3>
            <Link href="/producer/content" className="text-xs text-av-purple-lt hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-av-border">
                  {['Title', 'Views', 'Revenue', 'Rating', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-av-text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-av-border">
                {(topContent || []).map((c, i) => (
                  <motion.tr key={c.contentId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-av-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 rounded-av bg-av-elevated overflow-hidden flex-shrink-0">
                          {c.thumbnail && <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />}
                        </div>
                        <span className="text-sm font-medium text-av-text line-clamp-2 max-w-[180px]">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-av-text-muted">
                        <Play size={12} className="text-av-purple-lt" />
                        {c.views.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-av-success">{formatNgn(c.revenueNgn)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-av-text">{c.avgRating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="av-badge-green text-[10px]">Live</span>
                    </td>
                  </motion.tr>
                ))}
                {!topContent?.length && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-av-text-muted text-sm">No content yet. Upload your first film!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
