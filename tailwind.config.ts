import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        foam: '#EEF7F6',
        ink: '#0E2F3A',
        aqua: { DEFAULT: '#17A2A2', dark: '#0F7C7C' },
        sun: { DEFAULT: '#FFB627', dark: '#E69F10' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
