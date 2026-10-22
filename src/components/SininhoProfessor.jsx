import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
export default function SininhoProfessor({ professorId }) {
  const [quantidade, setQuantidade] = useState(0)
  useEffect(() => {
    let ativo = true
    async function atualizar() {
      const { count, error } = await supabase.from('solicitacoes_grade')
        .select('id', { count: 'exact', head: true }).eq('professor_id', professorId).eq('status', 'pendente')
      if (ativo && !error) setQuantidade(count || 0)
    }
    void atualizar()
    const timer = setInterval(atualizar, 30000)
    window.addEventListener('focus', atualizar)
    window.addEventListener('slark-notificacoes-atualizadas', atualizar)
    return () => { ativo = false; clearInterval(timer); window.removeEventListener('focus', atualizar); window.removeEventListener('slark-notificacoes-atualizadas', atualizar) }
  }, [professorId])
  return <Link to="/professor/notificacoes" aria-label={`Notificações: ${quantidade} solicitações pendentes`} className="relative p-2 rounded-full hover:bg-azul/10 shrink-0">
    <Bell size={20}/>{quantidade > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-azul px-1.5 text-[10px] text-white">{quantidade}</span>}
  </Link>
}
