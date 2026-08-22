import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Sininho de notificações usado nos cabeçalhos das telas do aluno. Mostra a
// contagem de não lidas e leva pra tela de notificações ao clicar.
export default function SininhoNotificacoes() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [naoLidas, setNaoLidas] = useState(0)

  useEffect(() => {
    let cancelado = false

    async function contar() {
      if (!perfil?.id) return
      const { data: aluno } = await supabase.from('alunos').select('id').eq('usuario_id', perfil.id).maybeSingle()
      if (!aluno?.id || cancelado) return
      const { count } = await supabase
        .from('notificacoes').select('id', { count: 'exact', head: true })
        .eq('aluno_id', aluno.id).eq('lida', false)
      if (!cancelado) setNaoLidas(count || 0)
    }

    contar()
    const intervalo = setInterval(contar, 30000)
    return () => { cancelado = true; clearInterval(intervalo) }
  }, [perfil?.id])

  return (
    <button
      onClick={() => navigate('/aluno/notificacoes')}
      className="relative shrink-0 w-11 h-11 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-center text-texto/60 hover:text-white transition"
    >
      <Bell size={17} />
      {naoLidas > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF6FA5] text-white text-[10px] font-bold flex items-center justify-center">
          {naoLidas > 9 ? '9+' : naoLidas}
        </span>
      )}
    </button>
  )
}
