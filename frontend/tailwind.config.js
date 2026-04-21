/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        uid: {
          blue: '#1E40AF',
          dark: '#0F172A',
          light: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
}
