import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Outfit, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

// ── Font Configuration ────────────────────────────────────────────────────────
const bebas = Bebas_Neue({
  weight:   ['400'],
  subsets:  ['latin'],
  variable: '--font-bebas',
  display:  'swap',
});

const outfit = Outfit({
  subsets:  ['latin'],
  variable: '--font-outfit',
  display:  'swap',
});

const jetbrains = JetBrains_Mono({
  subsets:  ['latin'],
  variable: '--font-jetbrains',
  display:  'swap',
});

// ── Metadata ──────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default:  'AlphaView TV — Watch Nigerian Films',
    template: '%s | AlphaView TV',
  },
  description:
    'Stream and purchase the best Nigerian, Nollywood, and African films. ' +
    'HD quality, secure 30-day access, watch on any device.',
  keywords: ['Nollywood', 'Nigerian movies', 'streaming', 'AlphaView TV', 'African films'],
  authors:  [{ name: 'AlphaView TV' }],
  creator:  'AlphaView TV',
  openGraph: {
    type:        'website',
    locale:      'en_NG',
    url:         'https://alphaview.tv',
    siteName:    'AlphaView TV',
    title:       'AlphaView TV — Watch Nigerian Films',
    description: 'Stream the best Nigerian and African films. Buy once, watch for 30 days.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card:    'summary_large_image',
    title:   'AlphaView TV',
    creator: '@AlphaViewTV',
  },
  robots: {
    index:  true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#080510',
  colorScheme: 'dark',
};

// ── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${outfit.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preload critical assets */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Favicon */}
        <link rel="icon"             href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest"         href="/manifest.json" />
      </head>
      <body className="bg-av-bg text-av-text font-sans antialiased">
        {/* Ambient background mesh */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `
              radial-gradient(at 20% 20%, rgba(124,58,237,0.12) 0px, transparent 60%),
              radial-gradient(at 80% 10%, rgba(217,70,239,0.08) 0px, transparent 50%),
              radial-gradient(at 50% 80%, rgba(124,58,237,0.06) 0px, transparent 50%)
            `,
          }}
          aria-hidden="true"
        />
        <div className="relative z-10">
          {children}
        </div>
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background:   '#1c1035',
              color:        '#f5f0ff',
              border:       '1px solid rgba(139,60,247,0.35)',
              borderRadius: '10px',
              fontFamily:   'var(--font-outfit)',
              fontSize:     '14px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#1c1035' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1c1035' },
            },
          }}
        />
      </body>
    </html>
  );
}
