import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'

// Hook simples: devolve o plano da assinatura da escola do usuário logado ('base' | 'pro').
// Usa a mesma linha que o admin edita em Assinaturas > Plano.
export function usePlano() {
  const { perfil } = useAuth()
  const [plano, setPlano] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!perfil?.escola_id) { setCarregando(false); return }
    let ativo = true
    async function carregar() {
      setCarregando(true)
      const { data } = await supabase
        .from('assinaturas')
        .select('plano')
        .eq('escola_id', perfil.escola_id)
        .order('criada_em', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (ativo) {
        setPlano(data?.plano || 'base')
        setCarregando(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [perfil?.escola_id])

  return { plano: plano || 'base', ehPro: plano === 'pro', carregando }
}
