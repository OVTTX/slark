import BottomNav from './BottomNav'

// Casco do app: conteúdo em largura total + menu flutuante na parte inferior
export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg text-texto font-display">
      <main className="w-full">
        <div className="px-8 pt-8 pb-28 max-w-[1500px] mx-auto">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
