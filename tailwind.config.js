/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        rosa: '#FBE3EA',
        azul: '#2E5BFF',
        'azul-puro': '#0033FF',
        profundo: '#03005B',
        bg: '#05031F',
        'bg-2': '#0A0735',
        card: '#0E0B40',
        texto: '#E8E6FF',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
        mono: ['"Unbounded"', 'sans-serif'],
      },
      borderColor: { DEFAULT: 'rgba(120,130,255,.16)' },
    },
  },
  plugins: [],
}
