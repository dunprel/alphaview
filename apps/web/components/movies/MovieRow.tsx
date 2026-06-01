'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import MovieCard from './MovieCard';
import type { Content, Purchase } from '@/types';

interface MovieRowProps {
  title:    string;
  badge?:   string;
  contents: Content[];
  purchases?: Record<string, Purchase>;
  href?:    string;
  variant?: 'default' | 'wide';
}

export default function MovieRow({ title, badge, contents, purchases = {}, href, variant = 'default' }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  if (!contents?.length) return null;

  return (
    <section className="mt-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="section-heading">{title}</h2>
          {badge && (
            <span className="av-badge-pink text-[11px]">{badge}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Scroll arrows */}
          <button onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-av-surface border border-av-border flex items-center justify-center text-av-text-muted hover:text-av-text hover:border-av-border-md transition-all">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-av-surface border border-av-border flex items-center justify-center text-av-text-muted hover:text-av-text hover:border-av-border-md transition-all">
            <ChevronRight size={16} />
          </button>
          {href && (
            <Link href={href} className="text-xs text-av-purple-lt hover:underline ml-2 flex items-center gap-1">
              See all <ChevronRight size={12} />
            </Link>
          )}
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-none pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {contents.map((content, i) => (
          <div
            key={content.id}
            className="flex-shrink-0"
            style={{ width: variant === 'wide' ? 280 : 160 }}
          >
            <MovieCard
              content={content}
              purchase={purchases[content.id]}
              index={i}
              variant={variant === 'wide' ? 'wide' : 'default'}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
