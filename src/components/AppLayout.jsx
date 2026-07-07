import BottomNav from './BottomNav'

// Casco do app: conteúdo em largura total + menu flutuante na parte inferior
export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg text-texto font-display overflow-x-hidden">
      <main className="w-full">
        <div className="app-content px-4 sm:px-8 pt-6 sm:pt-8 pb-28 sm:pb-32 max-w-[1500px] mx-auto">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
