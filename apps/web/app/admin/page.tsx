'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users, Film, DollarSign, AlertTriangle, TrendingUp,
  CheckCircle, Clock, Eye, ShieldCheck, ArrowUpRight,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import api from '@/lib/api/client';
import { formatNgn, timeAgo } from '@/lib/utils';

export default function AdminDashboard() {
  const [summary,  setSummary]  = useState<any>(null);
  const [revenue,  setRevenue]  = useState<any[]>([]);
  const [recent,   setRecent]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard/summary'),
      api.get('/admin/analytics/revenue?range=30d'),
      api.get('/admin/transactions/recent?limit=8'),
    ]).then(([s, r, t]) => {
      setSummary(s.data);
      setRevenue(r.data);
      setRecent(t.data);
    }).finally(() => setLoading(false));
  }, []);

  const KPI_CARDS = [
    { label: 'Total Users',       value: summary?.totalUsers,      icon: Users,       color: '#7c3aed', change: '+4.2k this week'  },
    { label: 'Revenue (MTD)',      value: summary?.revenueMtdNgn,   icon: DollarSign,  color: '#d946ef', change: '+18% vs last month', currency: true },
    { label: 'Live Content',       value: summary?.totalContent,    icon: Film,        color: '#06b6d4', change: `${summary?.pendingContent ?? 0} pending review` },
    { label: 'Active Purchases',   value: summary?.activePurchases, icon: ShieldCheck, color: '#22c55e', change: 'Last 30 days' },
  ];

  const ACTION_ITEMS = [
    { label: `${summary?.pendingContent ?? 0} content items pending review`, href: '/admin/content?status=review', color: 'av-badge-red',    urgency: 'High'   },
    { label: `${summary?.pendingPayouts ?? 0} payout requests awaiting`,     href: '/admin/payouts?status=pending', color: 'av-badge-yellow', urgency: 'Medium' },
    { label: 'New producer applications',                                      href: '/admin/producers?status=new',  color: 'av-badge-green',  urgency: 'Low'    },
  ];

  return (
    <div className="flex min-h-screen bg-av-bg">
      <AdminSidebar active="dashboard" />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>
              Admin Overview
            </h1>
            <p className="text-av-text-muted text-sm mt-1">
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="av-badge-purple text-xs">
            <span className="w-2 h-2 rounded-full bg-av-success inline-block mr-1.5 animate-pulse" />
            Platform Live
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {KPI_CARDS.map(({ label, value, icon: Icon, color, change, currency }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} className="av-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-av flex items-center justify-center"
                  style={{ background: `${color}18` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <ArrowUpRight size={14} className="text-av-success" />
              </div>
              <div className="text-2xl font-bold text-av-text">
                {loading ? '—' : currency ? formatNgn(value ?? 0) : (value ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-av-text-muted mt-1">{label}</div>
              <div className="text-[10px] text-av-text-dim mt-0.5">{change}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">

          {/* Revenue chart */}
          <div className="lg:col-span-2 av-card p-6">
            <h3 className="font-semibold text-av-text mb-6">Platform Revenue (30 days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d946ef" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#9d7fc5', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#9d7fc5', fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#1c1035', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatNgn(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenueNgn" stroke="#d946ef" strokeWidth={2}
                  fill="url(#adminRevGrad)" dot={false} activeDot={{ r: 4, fill: '#7c3aed' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Action items */}
          <div className="av-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle size={16} className="text-av-warning" />
              <h3 className="font-semibold text-av-text">Requires Action</h3>
            </div>
            <div className="space-y-3">
              {ACTION_ITEMS.map(({ label, href, color, urgency }) => (
                <Link key={href} href={href}
                  className="flex items-start gap-3 p-3 rounded-av bg-av-surface hover:bg-av-elevated transition-colors group">
                  <div className={`av-badge ${color} text-[10px] mt-0.5 flex-shrink-0`}>{urgency}</div>
                  <span className="text-xs text-av-text-muted group-hover:text-av-text transition-colors leading-relaxed">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="av-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-av-border">
            <h3 className="font-semibold text-av-text">Recent Transactions</h3>
            <Link href="/admin/payments" className="text-xs text-av-purple-lt hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-av-border">
                  {['User', 'Film', 'Amount', 'Method', 'Time', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-av-text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-av-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-6 py-4"><div className="skeleton h-4 w-24 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : recent.map((tx: any, i) => (
                  <motion.tr key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-av-surface/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="text-sm font-medium text-av-text">{tx.userName}</div>
                      <div className="text-xs text-av-text-muted">{tx.userEmail}</div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-av-text-muted max-w-[160px] truncate">{tx.contentTitle}</td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-semibold text-av-success">{formatNgn(tx.amountNgn)}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="av-badge-purple text-[10px] capitalize">{tx.paymentMethod}</span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-av-text-muted">{timeAgo(tx.createdAt)}</td>
                    <td className="px-6 py-3.5">
                      <span className="av-badge-green text-[10px]">
                        <CheckCircle size={9} /> Paid
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
