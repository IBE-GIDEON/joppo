import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1200px' } },
    extend: {
      colors: {
        ink: {
          950: '#07070B',
          900: '#0A0A11',
          850: '#0E0E17',
          800: '#12121C',
          700: '#1A1A26',
          600: '#242433',
        },
        iris: {
          300: '#B4A8FF',
          400: '#9B87FF',
          500: '#7C5CFF',
          600: '#6039F5',
          700: '#4A25D4',
        },
        border: 'rgb(255 255 255 / 0.08)',
        muted: '#8A8A9E',
        faint: '#5E5E70',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { tightest: '-0.045em' },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
      backgroundImage: {
        'iris-glow':
          'radial-gradient(60% 60% at 50% 0%, rgba(124,92,255,0.30) 0%, rgba(96,57,245,0.12) 45%, rgba(7,7,11,0) 78%)',
        'card-sheen':
          'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.015) 100%)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        drift: { '0%,100%': { transform: 'translate3d(0,0,0)' }, '50%': { transform: 'translate3d(0,-14px,0)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'accordion-down': 'accordion-down 0.22s ease-out',
        'accordion-up': 'accordion-up 0.22s ease-out',
        drift: 'drift 9s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
