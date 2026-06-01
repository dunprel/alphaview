/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.alphaview.tv'       },
      { protocol: 'https', hostname: '*.s3.amazonaws.com'     },
      { protocol: 'https', hostname: '*.cloudfront.net'        },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',            value: 'DENY'                     },
          { key: 'X-Content-Type-Options',     value: 'nosniff'                  },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-XSS-Protection',           value: '1; mode=block'            },
        ],
      },
      // Allow SharedArrayBuffer for Shaka Player
      {
        source: '/player/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin'             },
          { key: 'Cross-Origin-Embedder-Policy',  value: 'require-corp'            },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      // Proxy API calls in dev to avoid CORS
      {
        source:      '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1'}/:path*`,
      },
    ];
  },

  webpack(config, { isServer }) {
    // Shaka Player requires these to be excluded server-side
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'shaka-player'];
    }
    return config;
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
};

module.exports = nextConfig;
