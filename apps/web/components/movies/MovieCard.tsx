'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Clock, Star, Lock } from 'lucide-react';
import clsx from 'clsx';
import type { Content, Purchase } from '@/types';
import { formatNgn, formatDuration, getDaysRemaining } from '@/lib/utils';

interface MovieCardProps {
  content:   Content;
  purchase?: Purchase;
  variant?:  'default' | 'compact' | 'wide';
  index?:    number;
}

export default function MovieCard({
  content,
  purchase,
  variant = 'default',
  index = 0,
}: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hovered,  setHovered]  = useState(false);

  const daysRemaining = purchase ? getDaysRemaining(purchase.expiresAt) : null;
  const hasAccess     = daysRemaining !== null && daysRemaining > 0;
  const isExpired     = purchase && !hasAccess;
  const href          = hasAccess ? `/player/${content.id}` : `/movies/${content.id}`;

  const isCompact = variant === 'compact';
  const isWide    = variant === 'wide';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={clsx(
        'group relative flex-shrink-0 cursor-pointer',
        isWide ? 'w-full' : isCompact ? 'w-28' : 'w-full',
      )}
    >
      <Link href={href} className="block">
        {/* Poster */}
        <div
          className={clsx(
            'relative overflow-hidden rounded-av bg-av-surface',
            isWide ? 'aspect-video' : 'aspect-[2/3]',
          )}
        >
          {/* Thumbnail */}
          {!imgError ? (
            <img
              src={content.thumbnailUrl}
              alt={content.title}
              className={clsx(
                'w-full h-full object-cover transition-transform duration-500',
                hovered && 'scale-110',
              )}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-av-elevated">
              <span className="text-4xl opacity-30">🎬</span>
            </div>
          )}

          {/* Dark overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-av-bg via-transparent to-transparent opacity-80" />

          {/* Expired overlay */}
          {isExpired && (
            <div className="absolute inset-0 bg-av-bg/70 flex flex-col items-center justify-center gap-1">
              <Lock size={20} className="text-av-text-muted" />
              <span className="text-xs text-av-text-muted font-medium">Access Expired</span>
            </div>
          )}

          {/* Play button on hover */}
          {hasAccess && hovered && !isExpired && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.9)', backdropFilter: 'blur(4px)' }}
              >
                <Play size={22} className="text-white ml-1" fill="white" />
              </div>
            </motion.div>
          )}

          {/* Access status badge — top left */}
          {hasAccess && !isExpired && (
            <div className="absolute top-2 left-2">
              <div
                className={clsx(
                  'av-badge-green text-[10px]',
                  daysRemaining! <= 3 && 'av-badge-yellow',
                  daysRemaining! <= 1 && 'av-badge-red',
                )}
              >
                {daysRemaining}d left
              </div>
            </div>
          )}

          {/* Rating badge — top right */}
          {content.avgRating > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-white font-semibold">
                {content.avgRating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Duration — bottom left */}
          {!isCompact && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-av-text-muted">
              <Clock size={10} />
              {formatDuration(content.durationMins)}
            </div>
          )}
        </div>

        {/* Card info */}
        <div className={clsx('mt-2 px-0.5', isCompact && 'mt-1.5')}>
          <h3
            className={clsx(
              'font-semibold text-av-text line-clamp-1 transition-colors group-hover:text-av-purple-lt',
              isCompact ? 'text-xs' : 'text-sm',
            )}
          >
            {content.title}
          </h3>
          <div className="flex items-center justify-between mt-0.5">
            <span className={clsx('text-av-text-muted', isCompact ? 'text-[10px]' : 'text-xs')}>
              {content.genre[0]}
            </span>
            {!hasAccess && (
              <span
                className={clsx(
                  'font-mono font-semibold',
                  isCompact ? 'text-[11px]' : 'text-xs',
                )}
                style={{
                  background: 'linear-gradient(135deg,#a78bfa,#e879f9)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {formatNgn(content.priceNgn)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
