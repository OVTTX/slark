import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BloqueioInadimplencia from './BloqueioInadimplencia'

// Protege rotas: exige login e, opcionalmente, um perfil específico
export default function RotaProtegida({ children, perfilNecessario }) {
  const { sessao, perfil, carregando, bloqueadoPorInadimplencia } = useAuth()

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-texto/60 font-display">
        Carregando…
      </div>
    )
  }
  if (!sessao) return <Navigate to="/login" replace />
  if (perfilNecessario && perfil?.perfil !== perfilNecessario) {
    return <Navigate to="/login" replace />
  }
  if (bloqueadoPorInadimplencia) {
    return <BloqueioInadimplencia />
  }
  return children
}
