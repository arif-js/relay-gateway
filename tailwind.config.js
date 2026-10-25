import { raditailPreset } from 'raditail/theme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './client/index.html',
    './client/src/**/*.{ts,tsx,js,jsx}',
    './node_modules/raditail/dist/**/*.{js,mjs,cjs}',
  ],
  presets: [raditailPreset],
  theme: {
    extend: {
      colors: {
        clay: '#b4532a',
        'clay-soft': '#f3e3d9',
        paper: '#fbf9f6',
        'paper-2': '#f4f0ea',
        ink: '#1a1714',
      },
    },
  },
  plugins: [],
};

