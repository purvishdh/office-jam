import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand Red (from oklab 0.637 0.214213 0.1014) ──────────
        brand: {
          50:  '#FFA399',
          100: '#FF8B83',
          200: '#FF6763',
          300: '#FF4044',
          400: '#FB2C36',  // ← exact extracted color (use as primary)
          500: '#CF0007',
          600: '#AA0000',
          700: '#860000',
          800: '#610000',
          900: '#430000',
        },
        // ── Muted Purple-Gray (from oklch 0.552 0.016 285.938) ────
        muted: {
          50:  '#F4F4FF',
          100: '#E6E7F2',
          200: '#CCCCD8',
          300: '#ADADB8',
          400: '#8E8E99',
          500: '#71717B',  // ← exact extracted color
          600: '#54545E',
          700: '#3A3943',
          800: '#212129',
          900: '#0A0A12',
        },
        // ── Dark Surfaces (purple-tinted dark theme) ──────────────
        surface: {
          50:  '#111115',  // deepest background
          100: '#1A1A1E',  // app background
          200: '#28282D',  // card background
          300: '#37373C',  // elevated card
          400: '#47474C',  // border/divider
          500: '#57575C',  // input background
          600: '#68686D',  // disabled
          700: '#808085',
          800: '#9E9EA3',
          900: '#BDBDC3',
        },
      },

      // ── Semantic CSS Variables ─────────────────────────────────
      backgroundColor: {
        app:     'var(--bg-app)',
        card:    'var(--bg-card)',
        overlay: 'var(--bg-overlay)',
        input:   'var(--bg-input)',
      },
      textColor: {
        primary:   'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted:     'var(--text-muted)',
        accent:    'var(--text-accent)',
      },
      borderColor: {
        default: 'var(--border-default)',
        accent:  'var(--border-accent)',
        subtle:  'var(--border-subtle)',
      },
    },
  },
  plugins: [],
};

export default config;