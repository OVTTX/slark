import { SlarkLoading } from './SlarkLoading'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authRouteState } from '../lib/auth-session'
import BloqueioInadimplencia from './BloqueioInadimplencia'

export default function RotaProtegida({ children, perfilNecessario }) {
  const auth = useAuth()
  const status = authRouteState(auth, perfilNecessario)

  if (status === 'loading') {
    return <SlarkLoading fullPage />
  }
  if (status === 'error') {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-bg px-6 text-center font-display text-texto">
      <p role="alert" className="max-w-md text-sm leading-relaxed">{auth.erroAuth}</p>
      <button type="button" onClick={auth.tentarNovamente} className="rounded-full bg-azul px-6 py-3 text-[#FFFFFF]">Tentar carregar novamente</button>
      <button type="button" onClick={auth.sair} className="text-sm underline underline-offset-4">Voltar ao login</button>
    </div>
  }
  if (status === 'login') return <Navigate to="/login" replace />
  if (auth.bloqueadoPorInadimplencia) return <BloqueioInadimplencia />
  return children
}
