import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import HeroBanner from '@/components/movies/HeroBanner';
import MovieRow from '@/components/movies/MovieRow';
import CategoryRail from '@/components/movies/CategoryRail';
import ProducerSpotlight from '@/components/movies/ProducerSpotlight';
import { getHomeData } from '@/lib/api/content';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function HomePage() {
  const {
    featured,
    trending,
    newReleases,
    topNollywood,
    topDocumentaries,
    topProducers,
  } = await getHomeData();

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroBanner featured={featured} />
      </Suspense>

      {/* Content rows */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">

        {/* Category filter rail */}
        <CategoryRail />

        {/* Trending */}
        <MovieRow
          title="Trending Now"
          badge="🔥 Hot"
          contents={trending}
          href="/movies?sort=trending"
        />

        {/* New Releases */}
        <MovieRow
          title="New Releases"
          badge="✨ Fresh"
          contents={newReleases}
          href="/movies?sort=newest"
        />

        {/* Producer spotlight */}
        <ProducerSpotlight producers={topProducers} />

        {/* Top Nollywood */}
        <MovieRow
          title="Top Nollywood"
          badge="🇳🇬 Naija"
          contents={topNollywood}
          href="/movies?genre=Nollywood"
        />

        {/* Documentaries */}
        <MovieRow
          title="Documentaries"
          badge="📽 Docs"
          contents={topDocumentaries}
          href="/movies?genre=Documentary"
          variant="wide"
        />

        {/* App Download CTA */}
        <AppDownloadBanner />
      </div>
    </main>
  );
}

// ── App Download Banner ───────────────────────────────────────────────────────
function AppDownloadBanner() {
  return (
    <section className="mt-16 relative overflow-hidden rounded-av-xl p-8 md:p-12"
      style={{
        background: 'linear-gradient(135deg, #1c1035 0%, #130923 50%, #1c1035 100%)',
        border: '1px solid rgba(139,60,247,0.25)',
      }}
    >
      {/* Glow blobs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #d946ef, transparent 70%)' }} />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 text-center md:text-left">
          <h2 className="font-display text-3xl md:text-4xl text-white mb-3" style={{ letterSpacing: '0.04em' }}>
            Watch Anywhere, Anytime
          </h2>
          <p className="text-av-text-muted text-sm leading-relaxed max-w-md">
            Download the AlphaView TV app for iOS and Android. Stream or download your
            favourite films. Secure 30-day access per purchase.
          </p>
          <div className="flex items-center gap-3 mt-6 justify-center md:justify-start">
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-sm"
            >
              📱 App Store
            </a>
            <a
              href="https://play.google.com"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-sm"
            >
              🤖 Google Play
            </a>
          </div>
        </div>
        <div className="flex gap-4 md:gap-6 text-center">
          {[
            { value: '50K+', label: 'Users' },
            { value: '2,000+', label: 'Films' },
            { value: '4.8★', label: 'Rating' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold av-text-gradient">{value}</div>
              <div className="text-xs text-av-text-muted mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function HeroSkeleton() {
  return (
    <div className="skeleton" style={{ height: 'clamp(420px, 60vw, 680px)' }} />
  );
}
