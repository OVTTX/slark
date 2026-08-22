import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, ArrowRight, ArrowUpLeft, Bell, CheckCircle2,
  Loader2, PartyPopper, Hand, Lock, Send,
} from 'lucide-react'
import { ehIntroducao, numeroAula, proximoNumeroAula } from '../../lib/blocosAula'

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
  const [entregaProjeto, setEntregaProjeto] = useState(null)
  const [alunoId, setAlunoId] = useState(null)
  const [progresso, setProgresso] = useState(new Set())
  const [tudoConcluido, setTudoConcluido] = useState(false)
  const [selecionado, setSelecionado] = useState(null) // { bloco, i }
  const [mostrarPrep, setMostrarPrep] = useState(false)
  const [mostrarTodas, setMostrarTodas] = useState(false)
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
        const projetoAtual = projetoData?.[0] || null
        setProjeto(projetoAtual)

        if (alunoData?.id) {
          const [{ data: progressoData }, { data: conclusaoData }, { data: entregaData }] = await Promise.all([
            supabase.from('trilha_bloco_progresso').select('bloco_id').eq('trilha_id', id).eq('aluno_id', alunoData.id),
            supabase.from('trilha_conclusoes').select('id').eq('trilha_id', id).eq('aluno_id', alunoData.id).maybeSingle(),
            projetoAtual
              ? supabase.from('entregas').select('id, status').eq('atividade_id', projetoAtual.id).eq('aluno_id', alunoData.id).maybeSingle()
              : Promise.resolve({ data: null }),
          ])
          const feitos = new Set((progressoData || []).map((p) => p.bloco_id))
          setProgresso(feitos)
          setTudoConcluido(!!conclusaoData)
          setEntregaProjeto(entregaData || null)

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

  // Só considera a entrega válida se realmente foi enviada (não basta ter uma
  // linha "pendente" criada só por abrir o formulário).
  const entregaValida = entregaProjeto && ['entregue', 'corrigida'].includes(entregaProjeto.status)
  const projetoPendente = !!projeto && (!projeto.revelado || !entregaValida)

  async function marcarTrilhaConcluida() {
    if (!alunoId || !trilha || projetoPendente) return
    setSalvando(true)
    setErro('')
    try {
      const { error } = await supabase.from('trilha_conclusoes').insert({ trilha_id: trilha.id, aluno_id: alunoId })
      if (error && error.code !== '23505') throw error
      setTudoConcluido(true)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível concluir a trilha agora.')
    } finally {
      setSalvando(false)
    }
  }

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
        // Todas as aulas feitas. Só marca a trilha como concluída de verdade
        // se não houver projeto pendente (revelado + entregue).
        if (!projetoPendente) {
          const { error: eConc } = await supabase.from('trilha_conclusoes').insert({ trilha_id: trilha.id, aluno_id: alunoId })
          if (eConc && eConc.code !== '23505') throw eConc
          setTudoConcluido(true)
        }
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
  const jaFeito = selecionado && progresso.has(selecionado.bloco.id)

  const blocosCompletos = trilha.blocos.length > 0 && idxAtual === -1

  const LIMITE_GRADE = 5
  const aulasVisiveis = mostrarTodas ? aulasParaGrade : aulasParaGrade.slice(0, LIMITE_GRADE)
  const temMais = !mostrarTodas && aulasParaGrade.length > LIMITE_GRADE

  return (
    <div>
      <button onClick={() => navigate('/aluno/trilhas')} className="flex items-center gap-1.5 text-sm text-texto/60 hover:text-white transition mb-4">
        <ArrowLeft size={15} /> Trilhas
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight">{trilha.titulo}</h1>
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

      {erro && <p className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {!selecionado && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <p className="text-white/80 text-base leading-relaxed max-w-md text-justify">
              {trilha.descricao || `E aí, turma! Chegou a hora de mergulhar em ${trilha.titulo}. Percorra as aulas abaixo no seu ritmo — qualquer dúvida, chama seu professor.`}
            </p>

            {projeto && (
              <>
                <h2 className="mt-10 text-4xl sm:text-5xl font-bold text-white leading-[1.05]">Data do<br />projeto:</h2>
                <div className="mt-5 w-64 h-28 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center px-5">
                  <span className={`text-2xl font-bold text-white ${!projeto.revelado ? 'blur-md select-none' : ''}`}>
                    {formatarData(projeto.prazo)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div>
            {trilha.preparacao_texto && (
              <div className="mb-5">
                <button
                  onClick={() => setMostrarPrep((v) => !v)}
                  className="w-full h-40 sm:h-44 rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6 flex flex-col justify-between hover:bg-white/[0.06] transition text-left"
                >
                  <div className="flex justify-end">
                    <ArrowRight size={56} strokeWidth={2.5} className="text-white" />
                  </div>
                  <div className="text-right text-sm text-texto/60">Acesse: Preparação pra aula {proximoNumero}</div>
                </button>
                {mostrarPrep && (
                  <div className="mt-2 rounded-2xl bg-white/[0.02] border border-white/10 p-4 text-sm text-texto/70 leading-relaxed whitespace-pre-wrap">
                    {trilha.preparacao_texto}
                  </div>
                )}
              </div>
            )}

            {trilha.blocos.length === 0 ? (
              <p className="text-sm text-texto/45">Essa trilha ainda não tem aulas publicadas.</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {aulasVisiveis.map((b) => {
                  const i = trilha.blocos.indexOf(b)
                  const feito = progresso.has(b.id)
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelecionado({ bloco: b, i })}
                      className="relative rounded-2xl border p-4 h-44 flex flex-col justify-between text-left transition bg-white/[0.04] border-white/10 hover:bg-white/[0.06]"
                    >
                      {feito && <CheckCircle2 size={13} className="absolute top-2.5 right-2.5 text-[#3FD08A]" />}
                      <ArrowUpLeft size={18} className="text-white/40" />
                      {ehIntroducao(b) ? (
                        <Hand size={40} className="text-[#F5C451]" />
                      ) : (
                        <span className="text-6xl sm:text-7xl font-bold text-white leading-none">{numeroAula(trilha.blocos, i)}</span>
                      )}
                    </button>
                  )
                })}
                {temMais && (
                  <button
                    onClick={() => setMostrarTodas(true)}
                    className="relative rounded-2xl border p-4 h-44 flex flex-col justify-end bg-white/[0.04] border-white/10 hover:bg-white/[0.06] transition text-left"
                  >
                    <span className="text-6xl sm:text-7xl font-bold text-white leading-none">…</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selecionado && (
        <div className="mt-8 flex items-start gap-6 flex-wrap">
          <button
            onClick={() => setSelecionado(null)}
            title="Voltar pra todas as aulas"
            className="shrink-0 relative rounded-2xl border p-4 w-52 h-44 flex flex-col justify-between text-left transition bg-white/[0.04] border-white/10 hover:bg-white/[0.06]"
          >
            {jaFeito && <CheckCircle2 size={13} className="absolute top-2.5 right-2.5 text-[#3FD08A]" />}
            <ArrowUpLeft size={18} className="text-white/40" />
            {ehIntroducao(selecionado.bloco) ? (
              <Hand size={40} className="text-[#F5C451]" />
            ) : (
              <span className="text-6xl sm:text-7xl font-bold text-white leading-none">{numeroAula(trilha.blocos, selecionado.i)}</span>
            )}
          </button>

          <div className="flex-1 min-w-[260px]">
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-[1.05]">
              {ehIntroducao(selecionado.bloco) ? 'Introdução:' : 'Título da aula:'}
            </h2>
            {selecionado.bloco.tipo === 'texto' ? (
              <p className="mt-4 text-lg text-white/85 leading-relaxed whitespace-pre-wrap">{selecionado.bloco.conteudo?.texto}</p>
            ) : (
              <a href={selecionado.bloco.conteudo?.url} target="_blank" rel="noopener" className="mt-4 inline-block text-lg text-azul hover:underline break-all">
                {selecionado.bloco.conteudo?.url}
              </a>
            )}

            {!jaFeito && (
              <button
                onClick={concluirEContinuar}
                disabled={salvando}
                className="mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60"
              >
                {salvando ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={16} />}
                {salvando
                  ? 'Salvando…'
                  : idxAtual !== trilha.blocos.length - 1
                    ? 'Concluir e continuar'
                    : projetoPendente ? 'Concluir última aula' : 'Concluir trilha'}
              </button>
            )}
          </div>
        </div>
      )}

      {tudoConcluido && !selecionado ? (
        <div className="mt-8 rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 py-10 text-center">
          <PartyPopper className="mx-auto text-[#3FD08A]" size={40} />
          <p className="mt-4 text-white font-semibold">Trilha concluída!</p>
          <p className="mt-1 text-sm text-texto/60">Você passou por todas as aulas dessa trilha.</p>
        </div>
      ) : blocosCompletos && !selecionado && projetoPendente ? (
        <div className="mt-8 rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-8 text-center">
          <Lock className="mx-auto text-[#F5C451]" size={36} />
          <p className="mt-4 text-white font-semibold">Você terminou todas as aulas!</p>
          <p className="mt-1 text-sm text-texto/60 max-w-md mx-auto leading-relaxed">
            {!projeto.revelado
              ? 'Falta seu professor revelar o projeto dessa trilha pra você poder concluir.'
              : 'Falta entregar o projeto dessa trilha pra você poder concluir.'}
          </p>
          {projeto.revelado && (
            <button
              onClick={() => navigate('/aluno/atividades')}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition"
            >
              <Send size={15} /> Ir pra Atividades
            </button>
          )}
        </div>
      ) : blocosCompletos && !selecionado ? (
        <div className="mt-8 rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-8 text-center">
          <PartyPopper className="mx-auto text-[#3FD08A]" size={36} />
          <p className="mt-4 text-white font-semibold">Você terminou todas as aulas e já entregou o projeto!</p>
          <button
            onClick={marcarTrilhaConcluida} disabled={salvando}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition disabled:opacity-60"
          >
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Concluir trilha
          </button>
        </div>
      ) : null}
    </div>
  )
}
