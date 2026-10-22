import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, carregarPerfil } from '../lib/supabase'
import { carregarDemo } from '../lib/demo-profile'
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
  const [demo, setDemo] = useState(null)
  const [alternandoDemo, setAlternandoDemo] = useState(false)
  const demoRevision = useRef(0)
  const adminId = state.perfil?.perfil === 'admin_slark' ? state.perfil.id : null
  const demoAtiva = adminId && demo?.adminId === adminId ? demo.perfil : null
  const perfilEfetivo = demoAtiva || state.perfil

  useEffect(() => {
    demoRevision.current++
    setDemo(null)
    setAlternandoDemo(false)
  }, [adminId])

  async function alternarDemo(tipo) {
    if (!adminId) throw new Error('Este recurso é exclusivo da equipe administrativa.')
    const revision = ++demoRevision.current
    if (tipo === 'admin_slark') { setDemo(null); setAlternandoDemo(false); return }
    if (!['aluno', 'professor', 'diretor'].includes(tipo)) throw new Error('Perfil de demonstração inválido.')
    setAlternandoDemo(true)
    try {
      const data = await carregarDemo(supabase, state.perfil, tipo)
      if (revision !== demoRevision.current) return false
      setDemo({ adminId, perfil: data })
      return true
    } finally {
      if (revision === demoRevision.current) setAlternandoDemo(false)
    }
  }

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
  const sair = () => { demoRevision.current++; setDemo(null); return session.current.sair() }
  const recarregarPerfil = () => demoAtiva ? alternarDemo(demoAtiva.perfil) : session.current.recarregarPerfil()
  const tentarNovamente = () => session.current.retry()
  const bloqueadoPorInadimplencia = Boolean(state.perfil?.escola_id) && state.assinatura?.status === 'inadimplente'

  return (
    <AuthContext.Provider value={{ ...state, perfil: perfilEfetivo, perfilAdmin: adminId ? state.perfil : null, demoAtiva: Boolean(demoAtiva), alternarDemo, alternandoDemo, entrar, sair, recarregarPerfil, tentarNovamente, bloqueadoPorInadimplencia }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
