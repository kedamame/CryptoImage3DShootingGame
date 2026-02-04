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
        primary: '#FF6B6B',    // Coral red
        secondary: '#4ECDC4',  // Teal
        accent: '#FFE66D',     // Yellow
        purple: '#A855F7',     // Purple
        blue: '#3B82F6',       // Blue
        green: '#22C55E',      // Green
        orange: '#F97316',     // Orange
        pink: '#EC4899',       // Pink
        dark: '#1A1A2E',       // Dark background
        darker: '#0F0F1A',     // Darker background
      },
      fontFamily: {
        game: ['system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
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
