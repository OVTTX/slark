import BottomNav from './BottomNav'

// Casco do app: conteúdo em largura total + menu flutuante na parte inferior.
// O glow ambiente no fundo é a base da identidade "vidro" (glassmorphism) usada
// nos cartões das telas internas — sem ele os cartões translúcidos ficam sem graça.
export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg text-texto font-display overflow-x-hidden relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-32 -left-24 w-[36rem] h-[36rem] rounded-full bg-azul-puro/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 w-[30rem] h-[30rem] rounded-full bg-profundo/40 blur-[110px]" />
        <div className="absolute bottom-0 left-1/4 w-[26rem] h-[26rem] rounded-full bg-azul/10 blur-[100px]" />
      </div>
      <main className="w-full relative">
        <div className="app-content px-4 sm:px-8 pt-6 sm:pt-8 pb-28 sm:pb-32 max-w-[1500px] mx-auto">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
