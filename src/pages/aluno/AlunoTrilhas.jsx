import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CaminhoTrilha from '../../components/CaminhoTrilha'
import { BookOpen, FileText, File, Link2, CheckCircle2, X, Loader2, PartyPopper, ArrowRight } from 'lucide-react'

const ICONE_TIPO = { texto: FileText, pdf: File, link: Link2, canva: Link2 }

export default function AlunoTrilhas() {
  const { perfil } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [alunoId, setAlunoId] = useState(null)
  const [trilhas, setTrilhas] = useState([])
  const [concluidas, setConcluidas] = useState(new Set())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [trilhaAberta, setTrilhaAberta] = useState(null)

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: alunoData, error: eAluno } = await supabase.from('alunos').select('id, sala_id').eq('usuario_id', perfil.id).maybeSingle()
      if (eAluno) throw eAluno
      if (!alunoData) { setTrilhas([]); return }
      setAlunoId(alunoData.id)

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
        const t = trilhasProntas.find((x) => x.id === idParaAbrir)
        if (t) setTrilhaAberta(t)
        navigate(location.pathname, { replace: true, state: {} })
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
                onClick={() => setTrilhaAberta(t)}
                className="text-left rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-white text-lg leading-snug">{t.titulo}</div>
                  {feita && <CheckCircle2 size={20} className="text-[#3FD08A] shrink-0" />}
                </div>
                {t.descricao && <p className="text-texto/60 text-sm mt-2 line-clamp-2">{t.descricao}</p>}
                <div className="mt-4 text-xs text-texto/45">{t.blocos.length} bloco(s) de conteúdo</div>
              </button>
            )
          })}
        </div>
      )}

      {trilhaAberta && (
        <TrilhaCaminhoModal
          trilha={trilhaAberta}
          alunoId={alunoId}
          concluida={concluidas.has(trilhaAberta.id)}
          onFechar={() => setTrilhaAberta(null)}
          onConcluida={() => setConcluidas(new Set([...concluidas, trilhaAberta.id]))}
        />
      )}
    </div>
  )
}

function TrilhaCaminhoModal({ trilha, alunoId, concluida, onFechar, onConcluida }) {
  const [progresso, setProgresso] = useState(new Set())
  const [carregandoProgresso, setCarregandoProgresso] = useState(true)
  const [selecionado, setSelecionado] = useState(null) // { bloco, i }
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [tudoConcluido, setTudoConcluido] = useState(concluida)

  useEffect(() => {
    async function carregar() {
      setCarregandoProgresso(true)
      try {
        const { data, error } = await supabase
          .from('trilha_bloco_progresso').select('bloco_id').eq('trilha_id', trilha.id).eq('aluno_id', alunoId)
        if (error) throw error
        const feitos = new Set((data || []).map((p) => p.bloco_id))
        setProgresso(feitos)
        const idxAtual = trilha.blocos.findIndex((b) => !feitos.has(b.id))
        if (idxAtual !== -1) setSelecionado({ bloco: trilha.blocos[idxAtual], i: idxAtual })
      } catch (e) {
        console.error(e)
      } finally {
        setCarregandoProgresso(false)
      }
    }
    carregar()
  }, [trilha.id, alunoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const idxAtual = trilha.blocos.findIndex((b) => !progresso.has(b.id))

  async function concluirEContinuar() {
    if (!selecionado) return
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
        // último bloco: marca a trilha inteira como concluída
        const { error: eConc } = await supabase.from('trilha_conclusoes').insert({ trilha_id: trilha.id, aluno_id: alunoId })
        if (eConc && eConc.code !== '23505') throw eConc
        setTudoConcluido(true)
        onConcluida()
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

  const Icon = selecionado ? (ICONE_TIPO[selecionado.bloco.tipo] || FileText) : FileText
  const jaFeito = selecionado && progresso.has(selecionado.bloco.id)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60" onClick={onFechar}>
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-bg-2 border p-6 sm:p-7 max-h-[92vh] overflow-y-auto safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-white leading-snug pr-4">{trilha.titulo}</h2>
          <button onClick={onFechar} className="shrink-0 text-texto/50 hover:text-white transition"><X size={20} /></button>
        </div>
        {trilha.descricao && <p className="text-sm text-texto/60 mb-4">{trilha.descricao}</p>}

        {erro && <p className="mb-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

        {carregandoProgresso ? (
          <div className="text-texto/50 text-sm py-8 text-center">Carregando seu progresso…</div>
        ) : trilha.blocos.length === 0 ? (
          <p className="text-sm text-texto/45 text-center py-8">Essa trilha ainda não tem conteúdo.</p>
        ) : tudoConcluido && !selecionado ? (
          <div className="py-10 text-center">
            <PartyPopper className="mx-auto text-[#3FD08A]" size={40} />
            <p className="mt-4 text-white font-semibold">Trilha concluída!</p>
            <p className="mt-1 text-sm text-texto/60">Você passou por todos os blocos dessa trilha.</p>
          </div>
        ) : (
          <>
            <div className="py-4">
              <CaminhoTrilha
                blocos={trilha.blocos}
                concluidos={progresso}
                atual={idxAtual}
                onSelecionar={(bloco, i) => setSelecionado({ bloco, i })}
              />
            </div>

            {selecionado && (
              <div className="mt-2 rounded-2xl bg-card border p-5">
                <div className="flex items-center gap-2 text-xs text-texto/45 mb-2">
                  <Icon size={13} /> Bloco {selecionado.i + 1} de {trilha.blocos.length}
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
            )}
          </>
        )}
      </div>
    </div>
  )
}
