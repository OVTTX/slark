import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BookOpen, CheckCircle2 } from 'lucide-react'
import { ehIntroducao } from '../../lib/blocosAula'

export default function AlunoTrilhas() {
  const { perfil } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [trilhas, setTrilhas] = useState([])
  const [concluidas, setConcluidas] = useState(new Set())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: alunoData, error: eAluno } = await supabase.from('alunos').select('id, sala_id').eq('usuario_id', perfil.id).maybeSingle()
      if (eAluno) throw eAluno
      if (!alunoData) { setTrilhas([]); return }

      const { data: trilhasData, error: eTrilhas } = await supabase
        .from('trilhas')
        .select('*, trilha_blocos(*)')
        .eq('escola_id', perfil.escola_id)
        .eq('status', 'publicado')
        .or(`sala_id.eq.${alunoData.sala_id},sala_id.is.null`)
        .order('criada_em', { ascending: false })
      if (eTrilhas) throw eTrilhas

      const { data: conclusoesData, error: eConc } = await supabase
        .from('trilha_conclusoes').select('trilha_id').eq('aluno_id', alunoData.id)
      if (eConc) throw eConc

      const trilhasProntas = (trilhasData || []).map((t) => ({ ...t, blocos: (t.trilha_blocos || []).sort((a, b) => a.ordem - b.ordem) }))
      setTrilhas(trilhasProntas)
      setConcluidas(new Set((conclusoesData || []).map((c) => c.trilha_id)))

      // Retomar de onde parou: se veio da Home com uma trilha específica, abre direto
      const idParaAbrir = location.state?.abrirTrilhaId
      if (idParaAbrir) {
        navigate(`/aluno/trilhas/${idParaAbrir}`, { replace: true })
      }
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as trilhas. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Trilhas</h1>
      <p className="mt-2 text-texto/60">Conteúdos preparados pelo seu professor.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando trilhas…</div>
      ) : trilhas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <BookOpen className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma trilha disponível ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trilhas.map((t) => {
            const feita = concluidas.has(t.id)
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/aluno/trilhas/${t.id}`)}
                className="text-left rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-white text-lg leading-snug">{t.titulo}</div>
                  {feita && <CheckCircle2 size={20} className="text-[#3FD08A] shrink-0" />}
                </div>
                {t.descricao && <p className="text-texto/60 text-sm mt-2 line-clamp-2">{t.descricao}</p>}
                <div className="mt-4 text-xs text-texto/45">
                  {t.blocos.length} aula{t.blocos.length === 1 ? '' : 's'}{t.blocos.some(ehIntroducao) ? ' (com introdução)' : ''}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
