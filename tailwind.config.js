/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        dryp: {
          bg: '#0f1a0b',
          card: '#1a2814',
          border: '#2d4a22',
          accent: '#a8d870',
          text: '#e8f0d8',
        }
      }
    },
  },
  plugins: [],
}
