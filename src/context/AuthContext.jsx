import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, carregarPerfil } from '../lib/supabase'

const AuthContext = createContext(null)

async function carregarAssinatura(escolaId) {
  if (!escolaId) return null
  const { data } = await supabase
    .from('assinaturas')
    .select('*')
    .eq('escola_id', escolaId)
    .order('criada_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data || null
}

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [assinatura, setAssinatura] = useState(null)
  const [carregando, setCarregando] = useState(true)

  async function aplicarPerfil(userId) {
    try {
      const p = await carregarPerfil(userId)
      setPerfil(p)
      if (p?.escola_id) {
        const a = await carregarAssinatura(p.escola_id)
        setAssinatura(a)
      } else {
        setAssinatura(null)
      }
    } catch {
      setPerfil(null)
      setAssinatura(null)
    }
  }

  useEffect(() => {
    // sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      if (data.session) {
        aplicarPerfil(data.session.user.id).finally(() => setCarregando(false))
      } else {
        setCarregando(false)
      }
    })

    // ouvir mudanças (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSessao(novaSessao)
      if (novaSessao) {
        aplicarPerfil(novaSessao.user.id)
      } else {
        setPerfil(null)
        setAssinatura(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const entrar = (email, senha) => supabase.auth.signInWithPassword({ email, password: senha })
  const sair = () => supabase.auth.signOut()

  // true quando a escola do usuário está com a assinatura inadimplente
  // (não se aplica à Equipe Slark, que não pertence a uma escola cliente)
  const bloqueadoPorInadimplencia = Boolean(perfil?.escola_id) && assinatura?.status === 'inadimplente'

  return (
    <AuthContext.Provider value={{ sessao, perfil, assinatura, carregando, entrar, sair, bloqueadoPorInadimplencia }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
