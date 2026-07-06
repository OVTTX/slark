import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, carregarPerfil } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      if (data.session) {
        carregarPerfil(data.session.user.id).then(setPerfil).catch(() => setPerfil(null)).finally(() => setCarregando(false))
      } else {
        setCarregando(false)
      }
    })

    // ouvir mudanças (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSessao(novaSessao)
      if (novaSessao) {
        carregarPerfil(novaSessao.user.id).then(setPerfil).catch(() => setPerfil(null))
      } else {
        setPerfil(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const entrar = (email, senha) => supabase.auth.signInWithPassword({ email, password: senha })
  const sair = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ sessao, perfil, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
