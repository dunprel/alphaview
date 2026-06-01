'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Play, ShoppingCart, Star, Clock, Calendar, Users,
  BadgeCheck, Heart, Share2, Download, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ContentDetail } from '@/types';
import MovieCard from '@/components/movies/MovieCard';
import { usePurchase } from '@/hooks/usePurchase';
import { useAuthStore } from '@/store/auth.store';
import { formatNgn, formatDuration } from '@/lib/utils';

interface Props { content: ContentDetail }

export default function MovieDetailClient({ content }: Props) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const { user }              = useAuthStore();
  const { buy, loading, purchase } = usePurchase(content.id);

  const hasAccess    = purchase && purchase.status === 'active';
  const daysLeft     = purchase
    ? Math.max(0, Math.ceil((new Date(purchase.expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  const handleShare = async () => {
    try {
      await navigator.share({ title: content.title, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };

  return (
    <div className="min-h-screen">
      {/* ── Hero backdrop ── */}
      <div className="relative h-[420px] md:h-[520px] overflow-hidden">
        <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-av-bg via-av-bg/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-av-bg/80 via-transparent to-transparent" />
      </div>

      {/* ── Main content ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-80 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── Poster column ── */}
          <div className="flex-shrink-0 flex flex-col items-center lg:items-start">
            <div className="w-52 md:w-64 aspect-[2/3] rounded-av-lg overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] ring-1 ring-av-border">
              <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" />
            </div>

            {/* Action buttons */}
            <div className="mt-4 w-52 md:w-64 space-y-2">
              {hasAccess ? (
                <Link href={`/player/${content.id}`} className="btn-primary w-full justify-center">
                  <Play size={18} fill="white" /> Watch Now
                </Link>
              ) : (
                <button onClick={buy} disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">
                  <ShoppingCart size={18} />
                  {loading ? 'Processing...' : `Buy — ${formatNgn(content.priceNgn)}`}
                </button>
              )}

              {content.trailerUrl && (
                <button onClick={() => setTrailerOpen(true)} className="btn-secondary w-full justify-center text-sm">
                  <Play size={16} /> Watch Trailer
                </button>
              )}

              <div className="flex gap-2">
                <button onClick={handleShare} className="btn-ghost flex-1 justify-center text-sm py-2">
                  <Share2 size={15} /> Share
                </button>
                {hasAccess && (
                  <button className="btn-ghost flex-1 justify-center text-sm py-2">
                    <Download size={15} /> Download
                  </button>
                )}
              </div>
            </div>

            {/* Access status */}
            {hasAccess && daysLeft !== null && (
              <div className="mt-3 w-52 md:w-64 text-center">
                <div className={`av-badge ${daysLeft <= 3 ? 'av-badge-red' : 'av-badge-green'} text-xs`}>
                  ✓ Active — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                </div>
              </div>
            )}
          </div>

          {/* ── Info column ── */}
          <div className="flex-1 min-w-0 pt-4 lg:pt-32">
            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-3">
              {content.genre.map(g => (
                <Link key={g} href={`/movies?genre=${g}`} className="av-badge-purple text-xs hover:opacity-80 transition-opacity">
                  {g}
                </Link>
              ))}
              <span className="av-badge av-badge-yellow text-xs">{content.ageRating}</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-white mb-4 leading-none"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', letterSpacing: '0.03em' }}>
              {content.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-5 mb-6 text-sm text-av-text-muted">
              {content.avgRating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star size={15} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-white">{content.avgRating.toFixed(1)}</span>
                  <span className="text-xs">/ 5</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                {formatDuration(content.durationMins)}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(content.releaseDate).getFullYear()}
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={14} />
                {content.purchaseCount.toLocaleString()} purchases
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-av-text-muted uppercase tracking-widest mb-2">Synopsis</h3>
              <p className="text-av-text-muted text-sm leading-relaxed max-w-2xl">{content.description}</p>
            </div>

            {/* Cast */}
            {content.castList.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-av-text-muted uppercase tracking-widest mb-3">Cast</h3>
                <div className="flex flex-wrap gap-2">
                  {content.castList.map(actor => (
                    <span key={actor} className="px-3 py-1.5 rounded-full bg-av-surface border border-av-border text-xs text-av-text-muted">
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="av-divider mb-8" />

            {/* Producer card */}
            <div>
              <h3 className="text-xs font-semibold text-av-text-muted uppercase tracking-widest mb-3">Producer</h3>
              <Link href={`/producers/${content.producer.id}`}>
                <div className="flex items-center gap-4 p-4 rounded-av bg-av-surface border border-av-border hover:border-av-border-md transition-all group">
                  <div className="w-12 h-12 rounded-full bg-av-elevated flex items-center justify-center text-lg font-bold text-av-purple-lt flex-shrink-0">
                    {content.producer.studioName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-av-text text-sm truncate">{content.producer.studioName}</span>
                      {content.producer.isVerified && <BadgeCheck size={14} className="text-av-purple-lt flex-shrink-0" />}
                    </div>
                    <div className="text-xs text-av-text-muted mt-0.5">
                      {content.producer.followerCount.toLocaleString()} followers
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-av-text-dim group-hover:text-av-purple-lt transition-colors" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Related Content ── */}
        {content.relatedContent?.length > 0 && (
          <section className="mt-16">
            <h2 className="section-heading mb-6">More Like This</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {content.relatedContent.map((c, i) => (
                <MovieCard key={c.id} content={c} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Trailer Modal ── */}
      {trailerOpen && content.trailerUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setTrailerOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="w-full max-w-4xl aspect-video bg-black rounded-av-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <video src={content.trailerUrl} controls autoPlay className="w-full h-full" />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
