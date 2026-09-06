import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Quantos alunos a escola já "ocupa" (contas criadas + convites pendentes)
// contra o limite contratado na assinatura (assinaturas.qtd_alunos_contratada).
// Usado pelo diretor e pelo professor pra bloquear novos convites/importações
// quando a escola bate no teto do plano.
export default function useLimiteAlunos() {
  const { perfil, assinatura } = useAuth()
  const [usados, setUsados] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!perfil?.escola_id) return
    setCarregando(true)
    try {
      const [{ count: alunosCount }, { count: convitesCount }] = await Promise.all([
        supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('escola_id', perfil.escola_id),
        supabase.from('convites_aluno').select('id', { count: 'exact', head: true }).eq('escola_id', perfil.escola_id).eq('usado', false),
      ])
      setUsados((alunosCount || 0) + (convitesCount || 0))
    } finally {
      setCarregando(false)
    }
  }, [perfil?.escola_id])

  useEffect(() => { recarregar() }, [recarregar])

  const limite = assinatura?.qtd_alunos_contratada ?? null
  const atingido = limite != null && usados != null && usados >= limite

  return { limite, usados, atingido, carregando, recarregar }
}
