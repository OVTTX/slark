import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, ArrowRight, Bell, Lock, CheckCircle2, FileText, File, Link2,
  Loader2, PartyPopper, Hand, CalendarClock,
} from 'lucide-react'
import { ehIntroducao, rotuloAula, numeroAula, proximoNumeroAula } from '../../lib/blocosAula'

const ICONE_TIPO = { texto: FileText, pdf: File, link: Link2, canva: Link2 }

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function AlunoTrilhaDetalhe() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [trilha, setTrilha] = useState(null)
  const [projeto, setProjeto] = useState(null)
  const [alunoId, setAlunoId] = useState(null)
  const [progresso, setProgresso] = useState(new Set())
  const [tudoConcluido, setTudoConcluido] = useState(false)
  const [selecionado, setSelecionado] = useState(null) // { bloco, i }
  const [mostrarPrep, setMostrarPrep] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      if (!perfil?.id) return
      setCarregando(true)
      setErro('')
      try {
        const { data: alunoData, error: eAluno } = await supabase.from('alunos').select('id').eq('usuario_id', perfil.id).maybeSingle()
        if (eAluno) throw eAluno
        setAlunoId(alunoData?.id || null)

        const { data: trilhaData, error: eTrilha } = await supabase
          .from('trilhas').select('*, materias(nome), trilha_blocos(*)').eq('id', id).maybeSingle()
        if (eTrilha) throw eTrilha
        if (!trilhaData) { setErro('Trilha não encontrada.'); return }

        const blocos = (trilhaData.trilha_blocos || []).sort((a, b) => a.ordem - b.ordem)
        setTrilha({ ...trilhaData, blocos })

        const { data: projetoData } = await supabase
          .from('atividades').select('*').eq('trilha_id', id).order('criada_em', { ascending: false }).limit(1)
        setProjeto(projetoData?.[0] || null)

        if (alunoData?.id) {
          const [{ data: progressoData }, { data: conclusaoData }] = await Promise.all([
            supabase.from('trilha_bloco_progresso').select('bloco_id').eq('trilha_id', id).eq('aluno_id', alunoData.id),
            supabase.from('trilha_conclusoes').select('id').eq('trilha_id', id).eq('aluno_id', alunoData.id).maybeSingle(),
          ])
          const feitos = new Set((progressoData || []).map((p) => p.bloco_id))
          setProgresso(feitos)
          setTudoConcluido(!!conclusaoData)

          const idxAtual = blocos.findIndex((b) => !feitos.has(b.id))
          if (idxAtual !== -1) setSelecionado({ bloco: blocos[idxAtual], i: idxAtual })
        }
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar essa trilha. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [id, perfil?.id])

  async function concluirEContinuar() {
    if (!selecionado || !alunoId || !trilha) return
    setSalvando(true)
    setErro('')
    try {
      const { error } = await supabase.from('trilha_bloco_progresso').insert({
        aluno_id: alunoId, bloco_id: selecionado.bloco.id, trilha_id: trilha.id,
      })
      if (error && error.code !== '23505') throw error

      const novoProgresso = new Set([...progresso, selecionado.bloco.id])
      setProgresso(novoProgresso)

      const proximoIdx = trilha.blocos.findIndex((b) => !novoProgresso.has(b.id))
      if (proximoIdx === -1) {
        const { error: eConc } = await supabase.from('trilha_conclusoes').insert({ trilha_id: trilha.id, aluno_id: alunoId })
        if (eConc && eConc.code !== '23505') throw eConc
        setTudoConcluido(true)
        setSelecionado(null)
      } else {
        setSelecionado({ bloco: trilha.blocos[proximoIdx], i: proximoIdx })
      }
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar seu progresso.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <div className="text-texto/50">Carregando trilha…</div>

  if (erro && !trilha) {
    return (
      <div>
        <button onClick={() => navigate('/aluno/trilhas')} className="flex items-center gap-1.5 text-sm text-texto/60 hover:text-white transition mb-4">
          <ArrowLeft size={15} /> Trilhas
        </button>
        <p className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>
      </div>
    )
  }

  const idxAtual = trilha.blocos.findIndex((b) => !progresso.has(b.id))
  // aulas pra exibir na grade, da mais recente pra mais antiga (revisão)
  const aulasParaGrade = [...trilha.blocos].reverse()
  const proximoNumero = proximoNumeroAula(trilha.blocos)
  const Icon = selecionado ? (ehIntroducao(selecionado.bloco) ? Hand : (ICONE_TIPO[selecionado.bloco.tipo] || FileText)) : FileText
  const jaFeito = selecionado && progresso.has(selecionado.bloco.id)

  return (
    <div>
      <button onClick={() => navigate('/aluno/trilhas')} className="flex items-center gap-1.5 text-sm text-texto/60 hover:text-white transition mb-4">
        <ArrowLeft size={15} /> Trilhas
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{trilha.titulo}</h1>
          {trilha.materias?.nome && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-azul/15 text-azul border border-azul/20 uppercase tracking-wide">
              {trilha.materias.nome}
            </span>
          )}
        </div>
        <button className="shrink-0 w-11 h-11 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-center text-texto/60 hover:text-white transition">
          <Bell size={17} />
        </button>
      </div>
      {trilha.descricao && <p className="mt-3 text-sm text-texto/60 max-w-2xl leading-relaxed">{trilha.descricao}</p>}

      {erro && <p className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projeto && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Data do projeto</h2>
            <div className="relative rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6 overflow-hidden min-h-[132px]">
              {!projeto.revelado && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-xl bg-black/40">
                  <Lock size={18} className="text-texto/50" />
                  <span className="text-xs text-texto/50 text-center px-4">Seu professor ainda não revelou os detalhes desse projeto.</span>
                </div>
              )}
              <div className={!projeto.revelado ? 'opacity-0 select-none' : ''}>
                <div className="flex items-center gap-1.5 text-xs text-texto/50">
                  <CalendarClock size={13} /> {projeto.titulo}
                </div>
                <div className="mt-2 text-2xl font-bold text-white">{formatarData(projeto.prazo)}</div>
                {projeto.descricao && <p className="mt-2 text-sm text-texto/60 leading-relaxed">{projeto.descricao}</p>}
              </div>
            </div>
          </div>
        )}

        <div className={projeto ? '' : 'lg:col-span-2'}>
          {trilha.preparacao_texto && (
            <div className="mb-5">
              <button
                onClick={() => setMostrarPrep((v) => !v)}
                className="w-full text-left rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 flex items-center justify-between gap-3 hover:bg-white/[0.06] transition"
              >
                <div>
                  <div className="text-[11px] font-semibold tracking-wide uppercase text-texto/45">Preparação · não obrigatório</div>
                  <div className="text-white font-semibold mt-0.5">Se prepare pra Aula {proximoNumero}</div>
                </div>
                <ArrowRight size={16} className={`shrink-0 text-texto/50 transition-transform ${mostrarPrep ? 'rotate-90' : ''}`} />
              </button>
              {mostrarPrep && (
                <div className="mt-2 rounded-2xl bg-white/[0.02] border border-white/10 p-4 text-sm text-texto/70 leading-relaxed whitespace-pre-wrap">
                  {trilha.preparacao_texto}
                </div>
              )}
            </div>
          )}

          <h2 className="text-lg font-bold text-white mb-3">Aulas</h2>
          {trilha.blocos.length === 0 ? (
            <p className="text-sm text-texto/45">Essa trilha ainda não tem aulas publicadas.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {aulasParaGrade.map((b) => {
                const i = trilha.blocos.indexOf(b)
                const feito = progresso.has(b.id)
                const ativa = selecionado?.bloco.id === b.id
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelecionado({ bloco: b, i })}
                    className={`relative rounded-2xl border p-4 text-left transition ${
                      ativa ? 'bg-azul/15 border-azul/40' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.06]'
                    }`}
                  >
                    {feito && <CheckCircle2 size={13} className="absolute top-2.5 right-2.5 text-[#3FD08A]" />}
                    {ehIntroducao(b) ? (
                      <Hand size={20} className="text-[#F5C451]" />
                    ) : (
                      <div className="text-2xl font-bold text-white">{numeroAula(trilha.blocos, i)}</div>
                    )}
                    <div className="mt-1 text-[11px] text-texto/45 truncate">{rotuloAula(trilha.blocos, i)}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {tudoConcluido && !selecionado ? (
        <div className="mt-8 rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 py-10 text-center">
          <PartyPopper className="mx-auto text-[#3FD08A]" size={40} />
          <p className="mt-4 text-white font-semibold">Trilha concluída!</p>
          <p className="mt-1 text-sm text-texto/60">Você passou por todas as aulas dessa trilha.</p>
        </div>
      ) : selecionado ? (
        <div className="mt-6 rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6">
          <div className="flex items-center gap-2 text-xs text-texto/45 mb-3">
            <Icon size={13} /> {rotuloAula(trilha.blocos, selecionado.i)}
            {jaFeito && <span className="ml-auto flex items-center gap-1 text-[#3FD08A]"><CheckCircle2 size={13} /> Concluído</span>}
          </div>
          {selecionado.bloco.tipo === 'texto' ? (
            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{selecionado.bloco.conteudo?.texto}</p>
          ) : (
            <a href={selecionado.bloco.conteudo?.url} target="_blank" rel="noopener" className="text-sm text-azul hover:underline break-all">
              {selecionado.bloco.conteudo?.url}
            </a>
          )}

          {!jaFeito && (
            <button
              onClick={concluirEContinuar}
              disabled={salvando}
              className="w-full mt-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {salvando ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={16} />}
              {salvando ? 'Salvando…' : idxAtual === trilha.blocos.length - 1 ? 'Concluir trilha' : 'Concluir e continuar'}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
