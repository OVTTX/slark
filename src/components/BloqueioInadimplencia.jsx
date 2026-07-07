import { AlertTriangle, LogOut, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Tela cheia que substitui o app quando a assinatura da escola está inadimplente.
export default function BloqueioInadimplencia() {
  const { sair, perfil } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-texto font-display p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="text-red-400" size={30} />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-white tracking-tight">Assinatura pendente</h1>
        <p className="mt-3 text-texto/65 leading-relaxed">
          O acesso da <span className="text-white font-medium">{perfil?.escolas?.nome || 'sua escola'}</span> está
          temporariamente bloqueado porque há um pagamento em aberto com a Slark. Regularize a assinatura para
          voltar a usar o aplicativo normalmente.
        </p>

        <a
          href="https://wa.me/5511945699915"
          target="_blank" rel="noopener"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40"
        >
          <MessageCircle size={18} /> Falar com a Slark
        </a>

        <div className="mt-6">
          <button
            onClick={sair}
            className="inline-flex items-center gap-2 text-sm text-texto/50 hover:text-white transition"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </div>
    </div>
  )
}
