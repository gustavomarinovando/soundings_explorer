export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lrc-gray': '#6D6E71',
        'lrc-yellow': '#FDB813',
        'lrc-blue': '#1E215B',
      }
    },
  },
  plugins: [],
}