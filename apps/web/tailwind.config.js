/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── AlphaView TV Brand Palette ─────────────────────────────────────
        av: {
          // Backgrounds
          'bg':         '#080510',
          'bg-deep':    '#050308',
          'card':       '#130923',
          'surface':    '#1c1035',
          'elevated':   '#241545',
          // Borders
          'border':     'rgba(139,60,247,0.20)',
          'border-md':  'rgba(139,60,247,0.35)',
          'border-lg':  'rgba(217,70,239,0.40)',
          // Primary purple
          'purple-900': '#2e0a60',
          'purple-800': '#4a0e8f',
          'purple-700': '#6317c2',
          'purple-600': '#7c3aed',
          'purple-500': '#8b5cf6',
          'purple-400': '#a78bfa',
          'purple-300': '#c4b5fd',
          'purple-200': '#ddd6fe',
          'purple-100': '#ede9fe',
          // Accent magenta / pink
          'pink-900':   '#5b0060',
          'pink-800':   '#86008d',
          'pink-700':   '#b005bb',
          'pink-600':   '#c026d3',
          'pink-500':   '#d946ef',
          'pink-400':   '#e879f9',
          'pink-300':   '#f0abfc',
          // Text
          'text':       '#f5f0ff',
          'text-md':    '#cbbfed',
          'text-muted': '#9d7fc5',
          'text-dim':   '#5e4d80',
          // Status
          'success':    '#22c55e',
          'warning':    '#f59e0b',
          'danger':     '#ef4444',
          'info':       '#06b6d4',
        },
      },
      fontFamily: {
        // Display — Bebas Neue for titles
        display: ['var(--font-bebas)', 'Impact', 'sans-serif'],
        // Body — Outfit, clean and modern
        sans:    ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        // Mono — JetBrains Mono for prices / codes
        mono:    ['var(--font-jetbrains)', 'monospace'],
      },
      backgroundImage: {
        // Brand gradients
        'av-gradient':        'linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)',
        'av-gradient-rev':    'linear-gradient(135deg, #d946ef 0%, #7c3aed 100%)',
        'av-gradient-dark':   'linear-gradient(180deg, #1c1035 0%, #080510 100%)',
        'av-glow-purple':     'radial-gradient(ellipse at center, rgba(124,58,237,0.4) 0%, transparent 70%)',
        'av-glow-pink':       'radial-gradient(ellipse at center, rgba(217,70,239,0.3) 0%, transparent 70%)',
        'card-gradient':      'linear-gradient(180deg, transparent 40%, rgba(8,5,16,0.95) 100%)',
        'hero-gradient':      'linear-gradient(90deg, rgba(8,5,16,1) 40%, transparent 100%)',
        'mesh-bg': `
          radial-gradient(at 27% 37%, hsla(260,80%,20%,0.5) 0px, transparent 50%),
          radial-gradient(at 97% 21%, hsla(280,70%,15%,0.4) 0px, transparent 50%),
          radial-gradient(at 52% 99%, hsla(240,90%,10%,0.3) 0px, transparent 50%),
          radial-gradient(at 10% 29%, hsla(300,60%,12%,0.35) 0px, transparent 50%)
        `,
      },
      boxShadow: {
        'av-glow':      '0 0 30px rgba(139,60,247,0.35)',
        'av-glow-sm':   '0 0 12px rgba(139,60,247,0.25)',
        'av-glow-lg':   '0 0 60px rgba(139,60,247,0.4)',
        'av-pink-glow': '0 0 20px rgba(217,70,239,0.4)',
        'card':         '0 4px 24px rgba(0,0,0,0.5)',
        'card-hover':   '0 8px 40px rgba(124,58,237,0.3)',
        'inset-top':    'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'shimmer':      'shimmer 2s infinite',
        'pulse-slow':   'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':        'float 6s ease-in-out infinite',
        'glow-pulse':   'glowPulse 3s ease-in-out infinite',
        'slide-up':     'slideUp 0.5s ease-out',
        'fade-in':      'fadeIn 0.4s ease-out',
        'scale-in':     'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139,60,247,0.3)' },
          '50%':      { boxShadow: '0 0 40px rgba(217,70,239,0.5)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
      },
      borderRadius: {
        'av': '10px',
        'av-lg': '16px',
        'av-xl': '24px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
};
