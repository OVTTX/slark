/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cores de marca — manual SLARK RENEW — fixas em qualquer tema
        rosa: '#0651C3', // alias legado, agora aponta pro azul vivo da marca
        azul: '#0651C3',
        'azul-puro': '#0B0697',
        profundo: '#000026',
        // Cores de superfície/texto — trocam de valor conforme o tema (ver index.css)
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        'bg-2': 'rgb(var(--c-bg2) / <alpha-value>)',
        card: 'rgb(var(--c-card) / <alpha-value>)',
        texto: 'rgb(var(--c-texto) / <alpha-value>)',
        white: 'rgb(var(--c-onbg) / <alpha-value>)',
      },
      fontFamily: {
        // Manual novo usa uma única família — Plus Jakarta Sans — pra título,
        // subtítulo e texto corrido. Mantemos os 3 nomes de utilitário
        // (display/serif/mono) já usados em todo o app, todos apontando
        // pra mesma fonte, pra não precisar editar cada componente.
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderColor: { DEFAULT: 'rgba(90,120,220,.18)' },
    },
  },
  plugins: [],
}
