'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Lock, RefreshCw, Download, Clock, BookOpen } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { purchasesApi } from '@/lib/api/purchases';
import { formatNgn, getDaysRemaining } from '@/lib/utils';
import type { Purchase } from '@/types';

export default function LibraryPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    purchasesApi.getLibrary()
      .then(setPurchases)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const active  = purchases.filter(p => p.status === 'active');
  const expired = purchases.filter(p => p.status === 'expired');

  return (
    <div className="min-h-screen bg-av-bg">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl text-white" style={{ letterSpacing: '0.04em' }}>
            My Library
          </h1>
          <p className="text-av-text-muted text-sm mt-2">
            {active.length} active · {expired.length} expired
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton rounded-av aspect-[2/3]" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <>
            {/* Active */}
            {active.length > 0 && (
              <section className="mb-14">
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="font-semibold text-xl text-av-text">Active Access</h2>
                  <span className="av-badge-green text-xs">{active.length} titles</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {active.map((p, i) => (
                    <LibraryCard key={p.id} purchase={p} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Expired */}
            {expired.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="font-semibold text-xl text-av-text-muted">Expired</h2>
                  <span className="av-badge text-xs bg-av-surface text-av-text-dim border border-av-border">{expired.length} titles</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 opacity-60">
                  {expired.map((p, i) => (
                    <LibraryCard key={p.id} purchase={p} index={i} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Library card ──────────────────────────────────────────────────────────────
function LibraryCard({ purchase, index }: { purchase: Purchase; index: number }) {
  const daysLeft = getDaysRemaining(purchase.expiresAt);
  const isActive = purchase.status === 'active' && daysLeft > 0;
  const c        = purchase.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group relative"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-av overflow-hidden bg-av-surface mb-2">
        {c.thumbnailUrl && (
          <img src={c.thumbnailUrl} alt={c.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-av-bg via-transparent to-transparent opacity-80" />

        {/* Overlay on hover */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
          {isActive ? (
            <Link href={`/player/${c.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#d946ef)' }}>
              <Play size={14} fill="white" /> Watch
            </Link>
          ) : (
            <Link href={`/movies/${c.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 text-white border border-white/30">
              <RefreshCw size={14} /> Buy Again
            </Link>
          )}
        </div>

        {/* Status badge */}
        {isActive ? (
          <div className={`absolute top-2 left-2 av-badge text-[10px] font-bold ${
            daysLeft <= 3 ? 'av-badge-red' : daysLeft <= 7 ? 'av-badge-yellow' : 'av-badge-green'
          }`}>
            <Clock size={8} /> {daysLeft}d left
          </div>
        ) : (
          <div className="absolute top-2 left-2 av-badge av-badge-red text-[10px]">
            <Lock size={8} /> Expired
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="text-xs font-semibold text-av-text line-clamp-1 group-hover:text-av-purple-lt transition-colors">
        {c.title}
      </h3>
      <p className="text-[10px] text-av-text-muted mt-0.5">
        Purchased {new Date(purchase.purchasedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <BookOpen size={32} className="text-av-purple-lt" />
      </div>
      <h2 className="font-display text-2xl text-white mb-3" style={{ letterSpacing: '0.04em' }}>
        Your library is empty
      </h2>
      <p className="text-av-text-muted text-sm mb-8 max-w-xs leading-relaxed">
        Purchase a film to get 30-day streaming access. Your titles will appear here.
      </p>
      <Link href="/movies" className="btn-primary">Browse Films</Link>
    </div>
  );
}
