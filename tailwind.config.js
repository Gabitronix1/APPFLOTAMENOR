/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#0A2826',
        primary: '#18885F',
        lime: '#70B838',
        fault: '#C0402A',
        warn: '#C98300',
      },
    },
  },
  plugins: [],
}
