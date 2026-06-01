'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Star, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Content } from '@/types';
import { formatNgn, formatDuration } from '@/lib/utils';
import { usePurchase } from '@/hooks/usePurchase';

interface HeroBannerProps {
  featured: Content[];
}

export default function HeroBanner({ featured }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused,      setPaused]      = useState(false);
  const active = featured[activeIndex];
  const { buy, loading: buying } = usePurchase(active?.id);

  // Auto-advance every 7 seconds
  useEffect(() => {
    if (paused || featured.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(i => (i + 1) % featured.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [paused, featured.length]);

  if (!active) return null;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(420px, 60vw, 680px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background image with transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <img
            src={active.thumbnailUrl}
            alt={active.title}
            className="w-full h-full object-cover"
          />
          {/* Multi-layer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-av-bg via-av-bg/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-av-bg via-transparent to-transparent" />
          {/* Ambient noise texture */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.08\'/%3E%3C/svg%3E")',
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full flex items-end pb-16 px-6 md:px-12 lg:px-16 max-w-[1400px] mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id + '-content'}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-xl"
          >
            {/* Featured label */}
            <div className="av-badge-pink mb-3">
              ✦ Featured
            </div>

            {/* Title */}
            <h1
              className="font-display text-white leading-none mb-3"
              style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', letterSpacing: '0.02em' }}
            >
              {active.title}
            </h1>

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-3 mb-4">
              {active.avgRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold text-white">{active.avgRating.toFixed(1)}</span>
                </div>
              )}
              <span className="text-av-text-muted text-sm">{formatDuration(active.durationMins)}</span>
              <span className="text-av-text-muted text-sm">{active.ageRating}</span>
              {active.genre.slice(0, 2).map(g => (
                <span key={g} className="av-badge-purple text-[11px]">{g}</span>
              ))}
            </div>

            {/* Description */}
            <p className="text-av-text-muted text-sm leading-relaxed line-clamp-3 mb-6 max-w-md">
              {active.description}
            </p>

            {/* Producer credit */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded-full bg-av-elevated flex items-center justify-center text-[10px] font-bold text-av-purple-lt">
                {active.producer.studioName[0]}
              </div>
              <span className="text-xs text-av-text-muted">
                {active.producer.studioName}
                {active.producer.isVerified && (
                  <span className="ml-1.5 text-av-purple-lt">✓</span>
                )}
              </span>
            </div>

            {/* CTA buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <Link href={`/player/${active.id}`} className="btn-primary">
                <Play size={18} fill="white" />
                Watch Now
              </Link>
              <button onClick={buy} disabled={buying} className="btn-secondary">
                {buying ? 'Processing...' : `Buy — ${formatNgn(active.priceNgn)}`}
              </button>
              <Link href={`/movies/${active.id}`} className="btn-ghost">
                <Info size={18} />
                More Info
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      {featured.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-8 bg-av-pink'
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Prev / Next arrows */}
      {featured.length > 1 && (
        <>
          <button
            onClick={() => setActiveIndex(i => (i - 1 + featured.length) % featured.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-av-purple/70 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setActiveIndex(i => (i + 1) % featured.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-av-purple/70 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}
