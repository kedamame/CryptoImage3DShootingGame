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
        'pop-yellow': '#FFD93D',
        'pop-orange': '#FF8C42',
        'pop-red': '#FF6B6B',
        'pop-pink': '#FF9FF3',
        'pop-purple': '#A66CFF',
        'pop-blue': '#6ECBFF',
        'pop-cyan': '#54E6CB',
        'pop-green': '#6BCB77',
        'pop-lime': '#C9E265',
        'pop-brown': '#8B7355',
        'pop-gray': '#5C5C5C',
        'pop-dark': '#2D2D2D',
      },
      fontFamily: {
        game: ['Press Start 2P', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
