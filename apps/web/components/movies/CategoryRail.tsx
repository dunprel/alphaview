'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const CATEGORIES = [
  { label: 'All',          value: ''            },
  { label: '🇳🇬 Nollywood', value: 'Nollywood'   },
  { label: '🎭 Drama',      value: 'Drama'       },
  { label: '😂 Comedy',     value: 'Comedy'      },
  { label: '💥 Action',     value: 'Action'      },
  { label: '💕 Romance',    value: 'Romance'     },
  { label: '😱 Thriller',   value: 'Thriller'    },
  { label: '📽 Documentary',value: 'Documentary' },
  { label: '👨‍👩‍👧 Family',    value: 'Family'      },
  { label: '😈 Horror',     value: 'Horror'      },
  { label: '🔍 Crime',      value: 'Crime'       },
  { label: '✨ Animation',  value: 'Animation'   },
];

export default function CategoryRail() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const active       = searchParams.get('genre') ?? '';
  const railRef      = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(true);

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('genre', value);
    else       params.delete('genre');
    router.push(`/movies?${params.toString()}`);
  };

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const handler = () => setShowFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    el.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => el.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="relative mt-8">
      <div
        ref={railRef}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {CATEGORIES.map(({ label, value }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-white shadow-av-glow-sm'
                  : 'bg-av-surface border border-av-border text-av-text-muted hover:text-av-text hover:border-av-border-md'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg,#7c3aed,#d946ef)' } : {}}
            >
              {label}
            </button>
          );
        })}
      </div>
      {/* Fade edge */}
      {showFade && (
        <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none"
          style={{ background: 'linear-gradient(to left, var(--av-bg), transparent)' }} />
      )}
    </div>
  );
}
