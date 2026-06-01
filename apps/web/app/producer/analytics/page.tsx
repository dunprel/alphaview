'use client';
import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Globe, Smartphone, Monitor, Film } from 'lucide-react';
import ProducerSidebar     from '@/components/producer/ProducerSidebar';
import { useProducerAnalytics } from '@/hooks/useProducerAnalytics';
import { formatNgn }       from '@/lib/utils';

const RANGE_OPTIONS = ['7d', '30d', '3m', '12m'] as const;
type Range = typeof RANGE_OPTIONS[number];

const COLORS = ['#7c3aed', '#d946ef', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

const DEVICE_DATA = [
  { name: 'Android',  value: 58, color: '#22c55e' },
  { name: 'iOS',      value: 24, color: '#06b6d4' },
  { name: 'Web',      value: 14, color: '#7c3aed' },
  { name: 'Tablet',   value: 4,  color: '#d946ef' },
];

export default function ProducerAnalyticsPage() {
  const [range, setRange] = useState<Range>('30d');
  const { revenue, countries, topContent, loading } = useProducerAnalytics(range);

  return (
    <div className="flex min-h-screen bg-av-bg">
      <ProducerSidebar active="analytics" />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>Analytics</h1>
            <p className="text-av-text-muted text-sm mt-1">Detailed performance data for your content</p>
          </div>
          <div className="flex bg-av-surface border border-av-border rounded-av overflow-hidden">
            {RANGE_OPTIONS.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-4 py-2 text-xs font-medium transition-all ${range === r ? 'text-white' : 'text-av-text-muted hover:text-av-text'}`}
                style={range === r ? { background: 'linear-gradient(135deg,#7c3aed,#d946ef)' } : {}}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Revenue chart */}
        <div className="av-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-av-purple-lt" />
            <h3 className="font-semibold text-av-text">Revenue Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenue ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
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
              <Area type="monotone" dataKey="revenueNgn" stroke="#7c3aed" strokeWidth={2.5}
                fill="url(#areaGrad)" dot={false} activeDot={{ r: 5, fill: '#d946ef', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Country + Device row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Country breakdown */}
          <div className="av-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe size={16} className="text-av-purple-lt" />
              <h3 className="font-semibold text-av-text">Views by Country</h3>
            </div>
            <div className="space-y-3">
              {(countries ?? []).slice(0, 8).map((c, i) => {
                const max = countries?.[0]?.views ?? 1;
                const pct = Math.round((c.views / max) * 100);
                return (
                  <motion.div key={c.countryCode} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.flag}</span>
                        <span className="text-xs text-av-text-muted">{c.countryName}</span>
                      </div>
                      <span className="text-xs font-semibold text-av-text">{c.views.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-av-elevated rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.06 }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg,#7c3aed,#d946ef)' }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Device breakdown */}
          <div className="av-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Smartphone size={16} className="text-av-purple-lt" />
              <h3 className="font-semibold text-av-text">Views by Device</h3>
            </div>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={DEVICE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                    dataKey="value" paddingAngle={3}>
                    {DEVICE_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Share']}
                    contentStyle={{ background: '#1c1035', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {DEVICE_DATA.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-xs text-av-text-muted">{d.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-av-text">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top content bar chart */}
        <div className="av-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Film size={16} className="text-av-purple-lt" />
            <h3 className="font-semibold text-av-text">Revenue by Title</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(topContent ?? []).slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#9d7fc5', fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="title" tick={{ fill: '#9d7fc5', fontSize: 10 }} tickLine={false} axisLine={false} width={120}
                tickFormatter={v => v.length > 16 ? v.slice(0, 16) + '…' : v} />
              <Tooltip formatter={(v: number) => [formatNgn(v), 'Revenue']}
                contentStyle={{ background: '#1c1035', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="revenueNgn" radius={[0, 4, 4, 0]}>
                {(topContent ?? []).slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={`url(#barGrad${i % 2})`} />
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGrad0" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#7c3aed" /><stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
                <linearGradient id="barGrad1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#6d28d9" /><stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
