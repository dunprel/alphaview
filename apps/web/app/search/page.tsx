'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SlidersHorizontal, Loader2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import MovieCard from '@/components/movies/MovieCard';
import { contentApi } from '@/lib/api/content';
import { debounce } from '@/lib/utils';
import type { Content } from '@/types';

const TRENDING_SEARCHES = [
  'Ramsey Nouah', 'Genevieve Nnaji', 'Nollywood 2024',
  'Lagos drama', 'Kate Henshaw', 'Crime thriller', 'Romance',
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const initialQuery = searchParams.get('q') ?? '';

  const [query,    setQuery]    = useState(initialQuery);
  const [results,  setResults]  = useState<Content[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [total,    setTotal]    = useState(0);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const data = await contentApi.search(q);
      setResults(Array.isArray(data) ? data : data.data ?? []);
      setTotal(Array.isArray(data) ? data.length : data.meta?.total ?? 0);
      setSearched(true);
      // Update URL without navigation
      router.replace(`/search?q=${encodeURIComponent(q.trim())}`, { scroll: false });
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [router]);

  // Debounced search on type
  const debouncedSearch = useCallback(debounce((q: string) => {
    if (q.length >= 2) doSearch(q);
  }, 400), [doSearch]);

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) { setResults([]); setSearched(false); return; }
    debouncedSearch(val);
  };

  const handleClear = () => {
    setQuery(''); setResults([]); setSearched(false);
    router.replace('/search');
  };

  return (
    <div className="min-h-screen bg-av-bg">
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Search input */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-av-text-dim" />
            <input
              value={query}
              onChange={e => handleChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch(query)}
              placeholder="Search films, actors, directors, genres…"
              autoFocus
              className="w-full av-input pl-12 pr-12 py-4 text-base rounded-av-lg"
              style={{ fontSize: '1rem' }}
            />
            {query && (
              <button onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-av-text-dim hover:text-av-text transition-colors">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Trending searches */}
          {!searched && !loading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <p className="text-xs font-medium text-av-text-dim uppercase tracking-widest mb-3">
                Trending Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map(s => (
                  <button key={s} onClick={() => { setQuery(s); doSearch(s); }}
                    className="px-4 py-2 rounded-full bg-av-surface border border-av-border text-sm text-av-text-muted hover:text-av-text hover:border-av-border-md transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={20} className="text-av-purple animate-spin" />
            <span className="text-av-text-muted text-sm">Searching…</span>
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <AnimatePresence mode="wait">
            <motion.div key={query} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Result count */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl text-white" style={{ letterSpacing: '0.03em' }}>
                    Results for &ldquo;{query}&rdquo;
                  </h2>
                  <p className="text-av-text-muted text-sm mt-1">
                    {results.length} film{results.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-5xl mb-4 opacity-40">🔍</div>
                  <h3 className="font-semibold text-av-text text-lg mb-2">No results found</h3>
                  <p className="text-av-text-muted text-sm max-w-sm">
                    Try different keywords, check your spelling, or browse by genre.
                  </p>
                  <button onClick={() => router.push('/movies')}
                    className="btn-secondary text-sm mt-6">Browse All Films</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {results.map((c, i) => (
                    <MovieCard key={c.id} content={c} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-av-bg" />}>
      <SearchContent />
    </Suspense>
  );
}
