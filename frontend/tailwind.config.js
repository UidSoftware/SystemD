/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        uid: {
          blue:    '#063BF8',
          red:     '#FF0000',
          purple:  '#3d0361',
          dark:    '#0a0014',
          mid:     '#1a0a2e',
          section: '#3d0361',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
