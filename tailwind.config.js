/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colores exactos del logo oficial Doña Isidora.
        dark: '#062D2C',
        primary: '#1D8961',
        lime: '#6FB83A',
        surface: '#F4F7F5',
        fault: '#C0402A',
        warn: '#C98300',
      },
    },
  },
  plugins: [],
}
