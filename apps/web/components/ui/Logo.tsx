import React from 'react';
import clsx from 'clsx';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?:    'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  icon: { sm: 28, md: 36, lg: 48, xl: 64 },
  text: { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl', xl: 'text-3xl' },
  sub:  { sm: 'text-[9px]', md: 'text-[11px]', lg: 'text-xs', xl: 'text-sm' },
};

export default function Logo({ variant = 'full', size = 'md', className }: LogoProps) {
  const iconSize = sizes.icon[size];

  return (
    <div className={clsx('flex items-center gap-2.5 select-none', className)}>
      {/* Icon */}
      <div className="relative flex-shrink-0" style={{ width: iconSize, height: iconSize }}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: iconSize, height: iconSize }}
        >
          <defs>
            <linearGradient id="av-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
            <linearGradient id="av-grad-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#d946ef" />
              <stop offset="100%" stopColor="#f0abfc" />
            </linearGradient>
            <filter id="av-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Main A shape */}
          <path
            d="M50 8 L88 88 H62 L50 60 L38 88 H12 L50 8Z"
            fill="url(#av-grad-main)"
            opacity="0.95"
          />
          {/* Inner cutout */}
          <path
            d="M50 30 L68 75 H32 L50 30Z"
            fill="#080510"
          />
          {/* Film strip marks on left leg */}
          <rect x="22" y="38" width="6" height="3" rx="1" fill="rgba(255,255,255,0.25)" />
          <rect x="22" y="44" width="6" height="3" rx="1" fill="rgba(255,255,255,0.25)" />
          <rect x="22" y="50" width="6" height="3" rx="1" fill="rgba(255,255,255,0.25)" />
          <rect x="22" y="56" width="6" height="3" rx="1" fill="rgba(255,255,255,0.25)" />
          <rect x="22" y="62" width="6" height="3" rx="1" fill="rgba(255,255,255,0.20)" />

          {/* Sweep / slash through A */}
          <path
            d="M18 68 L72 42 L82 50 L28 76 Z"
            fill="url(#av-grad-sweep)"
            opacity="0.9"
          />

          {/* Star burst at top */}
          <circle cx="50" cy="8" r="4" fill="#f5f0ff" opacity="0.9" filter="url(#av-glow)" />
          <line x1="50" y1="2"  x2="50" y2="14" stroke="#f5f0ff" strokeWidth="1" opacity="0.6" />
          <line x1="44" y1="8"  x2="56" y2="8"  stroke="#f5f0ff" strokeWidth="1" opacity="0.6" />
          <line x1="46" y1="4"  x2="54" y2="12" stroke="#f5f0ff" strokeWidth="0.7" opacity="0.4" />
          <line x1="54" y1="4"  x2="46" y2="12" stroke="#f5f0ff" strokeWidth="0.7" opacity="0.4" />
        </svg>
      </div>

      {/* Wordmark */}
      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <span
            className={clsx(
              'font-display tracking-wide text-white',
              sizes.text[size],
            )}
            style={{ letterSpacing: '0.06em' }}
          >
            AlphaView
          </span>
          <span
            className={clsx(
              'font-bold tracking-widest',
              sizes.sub[size],
            )}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #d946ef)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.2em',
            }}
          >
            TV
          </span>
        </div>
      )}
    </div>
  );
}
