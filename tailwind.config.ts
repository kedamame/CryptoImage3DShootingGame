import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Unrailed-inspired pop colors
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
        purple: '#A855F7',
        blue: '#3B82F6',
        green: '#22C55E',
        orange: '#F97316',
        pink: '#EC4899',
        dark: '#1A1A2E',
        darker: '#16213E',
      },
      fontFamily: {
        game: ['var(--font-game)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-fast': 'pulse 0.5s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
