/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cores de marca — fixas em qualquer tema
        rosa: '#FBE3EA',
        azul: '#2E5BFF',
        'azul-puro': '#0033FF',
        profundo: '#03005B',
        // Cores de superfície/texto — trocam de valor conforme o tema (ver index.css)
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        'bg-2': 'rgb(var(--c-bg2) / <alpha-value>)',
        card: 'rgb(var(--c-card) / <alpha-value>)',
        texto: 'rgb(var(--c-texto) / <alpha-value>)',
        white: 'rgb(var(--c-onbg) / <alpha-value>)',
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
