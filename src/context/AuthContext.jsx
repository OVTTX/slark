import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, carregarPerfil } from '../lib/supabase'
import { createAuthSession, INITIAL_AUTH_STATE } from '../lib/auth-session'

const AuthContext = createContext(null)

async function carregarAssinatura(escolaId) {
  const { data, error } = await supabase
    .from('assinaturas')
    .select('*')
    .eq('escola_id', escolaId)
    .order('criada_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data || null
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL_AUTH_STATE)
  const session = useRef(null)

  useEffect(() => {
    const coordinator = createAuthSession({ auth: supabase.auth, carregarPerfil, carregarAssinatura, onChange: setState })
    session.current = coordinator
    void coordinator.start()
    return () => {
      coordinator.dispose()
      if (session.current === coordinator) session.current = null
    }
  }, [])

  const entrar = (email, senha) => session.current.entrar(email, senha)
  const sair = () => session.current.sair()
  const recarregarPerfil = () => session.current.recarregarPerfil()
  const tentarNovamente = () => session.current.retry()
  const bloqueadoPorInadimplencia = Boolean(state.perfil?.escola_id) && state.assinatura?.status === 'inadimplente'

  return (
    <AuthContext.Provider value={{ ...state, entrar, sair, recarregarPerfil, tentarNovamente, bloqueadoPorInadimplencia }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
