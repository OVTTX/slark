import Sidebar from './Sidebar'

// Casco do app: sidebar fixa + área de conteúdo
export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg text-texto font-display">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="px-8 py-8 max-w-[1500px]">{children}</div>
      </main>
    </div>
  )
}
