import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Bell, BookOpen, Megaphone, Rocket, Award, FolderKanban, Sparkles, Loader2, CheckCheck,
} from 'lucide-react'

const ICONE_TIPO = {
  aula_nova: BookOpen,
  preparacao: Megaphone,
  pontos: Rocket,
  selo: Award,
  atividade_aula: FolderKanban,
  projeto_publicado: FolderKanban,
  caracteristica: Sparkles,
}

const COR_TIPO = {
  aula_nova: '#2E5BFF',
  preparacao: '#F5C451',
  pontos: '#3FD08A',
  selo: '#F5C451',
  atividade_aula: '#5B4CFF',
  projeto_publicado: '#5B4CFF',
  caracteristica: '#FF6FA5',
}

function tempoRelativo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `${horas}h atrás`
  const dias = Math.floor(horas / 24)
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function AlunoNotificacoes() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [alunoId, setAlunoId] = useState(null)
  const [notificacoes, setNotificacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [marcandoTodas, setMarcandoTodas] = useState(false)

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: alunoData, error: eAluno } = await supabase.from('alunos').select('id').eq('usuario_id', perfil.id).maybeSingle()
      if (eAluno) throw eAluno
      if (!alunoData) { setNotificacoes([]); return }
      setAlunoId(alunoData.id)

      const { data, error } = await supabase
        .from('notificacoes').select('*').eq('aluno_id', alunoData.id).order('criada_em', { ascending: false }).limit(100)
      if (error) throw error
      setNotificacoes(data || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar suas notificações. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  async function abrir(n) {
    if (!n.lida) {
      setNotificacoes((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)))
      supabase.from('notificacoes').update({ lida: true }).eq('id', n.id).then(() => {})
    }
    if (n.link) navigate(n.link)
  }

  async function marcarTodasLidas() {
    if (!alunoId) return
    setMarcandoTodas(true)
    try {
      const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('aluno_id', alunoId).eq('lida', false)
      if (error) throw error
      setNotificacoes((prev) => prev.map((x) => ({ ...x, lida: true })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível marcar tudo como lido.')
    } finally {
      setMarcandoTodas(false)
    }
  }

  const temNaoLidas = notificacoes.some((n) => !n.lida)

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Notificações</h1>
          <p className="mt-2 text-texto/60">Tudo que rolou nas suas trilhas, pontos e selos.</p>
        </div>
        {temNaoLidas && (
          <button
            onClick={marcarTodasLidas} disabled={marcandoTodas}
            className="shrink-0 flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition disabled:opacity-60"
          >
            {marcandoTodas ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Marcar tudo como lido
          </button>
        )}
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando notificações…</div>
      ) : notificacoes.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Bell className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma notificação por enquanto.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-2.5">
          {notificacoes.map((n) => {
            const Icon = ICONE_TIPO[n.tipo] || Bell
            const cor = COR_TIPO[n.tipo] || '#8892B0'
            return (
              <button
                key={n.id}
                onClick={() => abrir(n)}
                className={`w-full text-left rounded-2xl border p-4 flex items-start gap-3.5 transition hover:-translate-y-0.5 ${
                  n.lida ? 'bg-white/[0.02] border-white/10' : 'bg-white/[0.05] border-azul/25'
                }`}
              >
                <span
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: `${cor}22`, color: cor }}
                >
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{n.titulo}</span>
                    {!n.lida && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#FF6FA5]" />}
                  </div>
                  {n.mensagem && <p className="text-sm text-texto/60 mt-1 leading-relaxed">{n.mensagem}</p>}
                  <div className="text-xs text-texto/40 mt-1.5">{tempoRelativo(n.criada_em)}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
