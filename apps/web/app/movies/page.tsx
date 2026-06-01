'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Search, X, Loader2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import MovieCard from '@/components/movies/MovieCard';
import { contentApi } from '@/lib/api/content';
import { debounce } from '@/lib/utils';
import type { Content } from '@/types';

const GENRES   = ['All','Nollywood','Drama','Comedy','Action','Romance','Thriller','Documentary','Family','Horror','Crime'];
const SORT_OPTS = [
  { label: 'Trending',     value: 'trending'   },
  { label: 'Newest',       value: 'newest'      },
  { label: 'Top Rated',    value: 'rating'      },
  { label: 'Price: Low',   value: 'price_asc'   },
  { label: 'Price: High',  value: 'price_desc'  },
];
const TYPES = ['All', 'movie', 'series', 'documentary', 'short'];

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [content,     setContent]     = useState<Content[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [genre, setGenre] = useState(searchParams.get('genre') ?? '');
  const [sort,  setSort]  = useState(searchParams.get('sort')  ?? 'trending');
  const [type,  setType]  = useState(searchParams.get('type')  ?? '');
  const [query, setQuery] = useState(searchParams.get('q')     ?? '');

  const load = useCallback(async (pg = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const result = await contentApi.browse({
        page: pg, limit: 24,
        genre:  genre  || undefined,
        sort:   sort   as any,
        type:   type   || undefined,
        search: query  || undefined,
      });
      setContent(prev => append ? [...prev, ...result.data] : result.data);
      setTotal(result.meta.total);
      setPage(pg);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [genre, sort, type, query]);

  useEffect(() => { load(1); }, [genre, sort, type, query]);

  const debouncedSearch = useCallback(debounce((q: string) => setQuery(q), 400), []);

  const hasMore = content.length < total;

  return (
    <div className="min-h-screen bg-av-bg">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Top bar ── */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl text-white" style={{ letterSpacing: '0.04em' }}>
              {query ? `Results for "${query}"` : genre || 'Browse Films'}
            </h1>
            {!loading && (
              <p className="text-av-text-muted text-sm mt-1">{total.toLocaleString()} titles</p>
            )}
          </div>

          {/* Search + filter controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-av-text-dim" />
              <input
                defaultValue={query}
                onChange={e => debouncedSearch(e.target.value)}
                placeholder="Search films, actors..."
                className="av-input pl-9 py-2.5 text-sm w-full"
              />
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-av text-sm font-medium border transition-all ${
                showFilters ? 'bg-av-purple border-av-purple text-white' : 'bg-av-surface border-av-border text-av-text-muted hover:text-av-text'
              }`}>
              <SlidersHorizontal size={15} /> Filters
            </button>
          </div>
        </div>

        {/* ── Filters panel ── */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="av-card p-5 mb-8 grid sm:grid-cols-3 gap-6">
            {/* Genre */}
            <div>
              <label className="text-xs font-medium text-av-text-muted mb-2 block">Genre</label>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map(g => (
                  <button key={g} onClick={() => setGenre(g === 'All' ? '' : g)}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      (g === 'All' ? !genre : genre === g)
                        ? 'text-white bg-av-purple'
                        : 'bg-av-surface border border-av-border text-av-text-muted hover:border-av-border-md'
                    }`}>{g}</button>
                ))}
              </div>
            </div>
            {/* Type */}
            <div>
              <label className="text-xs font-medium text-av-text-muted mb-2 block">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map(t => (
                  <button key={t} onClick={() => setType(t === 'All' ? '' : t)}
                    className={`px-3 py-1 rounded-full text-xs capitalize transition-all ${
                      (t === 'All' ? !type : type === t)
                        ? 'text-white bg-av-pink'
                        : 'bg-av-surface border border-av-border text-av-text-muted hover:border-av-border-md'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            {/* Sort */}
            <div>
              <label className="text-xs font-medium text-av-text-muted mb-2 block">Sort By</label>
              <select value={sort} onChange={e => setSort(e.target.value)} className="av-input text-sm">
                {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </motion.div>
        )}

        {/* ── Active filter pills ── */}
        {(genre || type || query) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {genre && <FilterPill label={genre}   onRemove={() => setGenre('')} />}
            {type  && <FilterPill label={type}    onRemove={() => setType('')}  />}
            {query && <FilterPill label={`"${query}"`} onRemove={() => setQuery('')} />}
            <button onClick={() => { setGenre(''); setType(''); setQuery(''); }}
              className="text-xs text-av-text-muted hover:text-av-danger transition-colors">
              Clear all
            </button>
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="skeleton rounded-av aspect-[2/3]" />
            ))}
          </div>
        ) : content.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl mb-4">🎬</div>
            <h3 className="font-semibold text-av-text text-lg mb-2">No films found</h3>
            <p className="text-av-text-muted text-sm">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {content.map((c, i) => (
                <MovieCard key={c.id} content={c} index={i} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button onClick={() => load(page + 1, true)} disabled={loadingMore}
                  className="btn-secondary px-8 disabled:opacity-60">
                  {loadingMore ? <><Loader2 size={16} className="animate-spin" /> Loading...</> : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-av-surface border border-av-purple/40 text-xs text-av-purple-lt">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors"><X size={11} /></button>
    </div>
  );
}
