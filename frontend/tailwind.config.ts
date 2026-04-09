import type { Config } from 'tailwindcss';

// NOTE: Tailwind is currently unused — all styling uses globals.css with CSS custom properties.
// This config (and tailwind dependencies in package.json / postcss.config) can be removed in a future cleanup.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
