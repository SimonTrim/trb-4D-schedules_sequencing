/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        trimble: {
          blue: '#0063a3',
          navy: '#004f83',
          sky: '#217cbb',
          gray: '#f1f1f6',
          ink: '#252a2e',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
