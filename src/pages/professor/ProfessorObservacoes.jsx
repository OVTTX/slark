import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Eye, Loader2, Search, Sparkles, Wand2, Award, Crown, Brain, Lightbulb,
  MessageCircle, HeartHandshake, RefreshCcw, Check,
} from 'lucide-react'

const ICONES = { Crown, Brain, Lightbulb, MessageCircle, HeartHandshake, Eye, Search, Award }
function IconeSelo({ nome, ...props }) {
  const Comp = ICONES[nome] || Award
  return <Comp {...props} />
}

export default function ProfessorObservacoes() {
  const { perfil } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [alunoSelecionado, setAlunoSelecionado] = useState(null)
  const [observacoes, setObservacoes] = useState([])
  const [caracteristicas, setCaracteristicas] = useState([])
  const [selos, setSelos] = useState([])
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoObs, setCarregandoObs] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [analisandoId, setAnalisandoId] = useState(null)
  const [aplicandoId, setAplicandoId] = useState(null)
  const [erro, setErro] = useState('')
  const [avisoIA, setAvisoIA] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
        if (eSalas) throw eSalas
        const salaIds = (salasData || []).map((s) => s.id)
        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))

        const [{ data: caracData, error: eCarac }, { data: selosData, error: eSelos }] = await Promise.all([
          supabase.from('caracteristicas').select('*'),
          supabase.from('selos').select('*').not('caracteristica_id', 'is', null),
        ])
        if (eCarac) throw eCarac
        if (eSelos) throw eSelos
        setCaracteristicas(caracData || [])
        setSelos(selosData || [])

        if (salaIds.length === 0) { setAlunos([]); return }

        const { data: alunosData, error: eAlunos } = await supabase.from('alunos').select('*').in('sala_id', salaIds).order('nome')
        if (eAlunos) throw eAlunos
        setAlunos((alunosData || []).map((a) => ({ ...a, salaNome: salaPorId[a.sala_id]?.nome || '—' })))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar os alunos. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  async function carregarObservacoes(alunoId) {
    setCarregandoObs(true)
    try {
      const { data, error } = await supabase.from('observacoes').select('*').eq('aluno_id', alunoId).order('criada_em', { ascending: false })
      if (error) throw error
      setObservacoes(data || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as observações.')
    } finally {
      setCarregandoObs(false)
    }
  }

  function selecionar(aluno) {
    setAlunoSelecionado(aluno)
    setTexto('')
    setAvisoIA('')
    carregarObservacoes(aluno.id)
  }

  const caracteristicaPorId = useMemo(() => Object.fromEntries(caracteristicas.map((c) => [c.id, c])), [caracteristicas])
  const seloPorCaracteristicaId = useMemo(() => Object.fromEntries(selos.map((s) => [s.caracteristica_id, s])), [selos])

  async function analisar(observacao) {
    if (caracteristicas.length === 0) {
      setAvisoIA('Cadastre características antes de usar a análise por IA.')
      return
    }
    setAnalisandoId(observacao.id)
    setAvisoIA('')
    try {
      const { data, error } = await supabase.functions.invoke('analisar-observacao', {
        body: {
          texto: observacao.texto,
          caracteristicas: caracteristicas.map((c) => ({ id: c.id, nome: c.nome, descricao: c.descricao })),
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const analise = data.analise
      const caracteristicaSugerida = caracteristicas.find(
        (c) => c.nome.trim().toLowerCase() === String(analise.caracteristica_sugerida || '').trim().toLowerCase(),
      )

      const { error: eUpdate } = await supabase.from('observacoes').update({
        mapa_competencias: analise.competencias || null,
        caracteristica_sugerida_id: caracteristicaSugerida?.id || null,
        confianca_ia: analise.confianca ?? null,
        justificativa_ia: analise.justificativa || null,
        analisada_em: new Date().toISOString(),
      }).eq('id', observacao.id)
      if (eUpdate) throw eUpdate

      await carregarObservacoes(observacao.aluno_id)
    } catch (e) {
      console.error(e)
      setAvisoIA(e.message || 'Não foi possível analisar essa observação agora.')
    } finally {
      setAnalisandoId(null)
    }
  }

  async function adicionar(e) {
    e.preventDefault()
    if (!texto.trim() || !alunoSelecionado) return
    setSalvando(true)
    setAvisoIA('')
    try {
      const { data, error } = await supabase.from('observacoes').insert({
        aluno_id: alunoSelecionado.id,
        professor_id: perfil.id,
        texto: texto.trim(),
      }).select().single()
      if (error) throw error
      setTexto('')
      await carregarObservacoes(alunoSelecionado.id)
      // dispara a análise de IA automaticamente assim que a observação é salva
      if (data) analisar(data)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a observação.')
    } finally {
      setSalvando(false)
    }
  }

  async function aplicarCaracteristica(observacao) {
    const caracteristica = caracteristicaPorId[observacao.caracteristica_sugerida_id]
    const selo = seloPorCaracteristicaId[observacao.caracteristica_sugerida_id]
    if (!caracteristica || !alunoSelecionado) return
    setAplicandoId(observacao.id)
    try {
      const { error: eAluno } = await supabase.from('alunos').update({ caracteristica_id: caracteristica.id }).eq('id', alunoSelecionado.id)
      if (eAluno) throw eAluno

      if (selo) {
        const { error: eSelo } = await supabase.from('aluno_selos').upsert(
          { aluno_id: alunoSelecionado.id, selo_id: selo.id },
          { onConflict: 'aluno_id,selo_id', ignoreDuplicates: true },
        )
        if (eSelo) throw eSelo
      }

      setAlunoSelecionado((prev) => ({ ...prev, caracteristica_id: caracteristica.id }))
      setAlunos((prev) => prev.map((a) => (a.id === alunoSelecionado.id ? { ...a, caracteristica_id: caracteristica.id } : a)))
    } catch (e) {
      console.error(e)
      setAvisoIA('Não foi possível aplicar a característica sugerida.')
    } finally {
      setAplicandoId(null)
    }
  }

  const alunosFiltrados = useMemo(
    () => alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())),
    [alunos, busca],
  )

  return (
    <div>
      <div className="flex items-center gap-3">
        <Eye className="text-azul" size={28} />
        <h1 className="text-4xl font-bold text-white tracking-tight">Observações</h1>
      </div>
      <p className="mt-2 text-texto/60">
        Registre anotações sobre cada aluno. A IA da Slark lê o texto, monta o mapa de competências e sugere a característica e o selo do aluno.
      </p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando alunos…</div>
      ) : alunos.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Eye className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno nas suas turmas ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-card border p-4 lg:col-span-1 max-h-[560px] overflow-y-auto">
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto/40" />
              <input
                value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar aluno…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-azul/10 text-white text-sm focus:outline-none focus:border-azul transition"
              />
            </div>
            <div className="space-y-1">
              {alunosFiltrados.map((a) => {
                const carac = caracteristicaPorId[a.caracteristica_id]
                return (
                  <button
                    key={a.id}
                    onClick={() => selecionar(a)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${alunoSelecionado?.id === a.id ? 'bg-azul text-white' : 'text-texto/70 hover:bg-white/5 hover:text-white'}`}
                  >
                    <div className="font-medium">{a.nome}</div>
                    <div className={`flex items-center gap-1.5 text-xs mt-0.5 ${alunoSelecionado?.id === a.id ? 'text-white/70' : 'text-texto/45'}`}>
                      {a.salaNome}
                      {carac && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: alunoSelecionado?.id === a.id ? 'rgba(255,255,255,.2)' : `${carac.cor}22`, color: alunoSelecionado?.id === a.id ? '#fff' : carac.cor }}
                        >
                          {carac.nome}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!alunoSelecionado ? (
              <div className="rounded-2xl bg-card border p-12 text-center text-texto/50 h-full flex items-center justify-center">
                Selecione um aluno para ver ou adicionar observações.
              </div>
            ) : (
              <div className="rounded-2xl bg-card border p-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-bold text-white text-lg">{alunoSelecionado.nome}</div>
                  {caracteristicaPorId[alunoSelecionado.caracteristica_id] && (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: `${caracteristicaPorId[alunoSelecionado.caracteristica_id].cor}22`,
                        color: caracteristicaPorId[alunoSelecionado.caracteristica_id].cor,
                      }}
                    >
                      {seloPorCaracteristicaId[alunoSelecionado.caracteristica_id] && (
                        <IconeSelo nome={seloPorCaracteristicaId[alunoSelecionado.caracteristica_id].icone} size={12} />
                      )}
                      Característica atual: {caracteristicaPorId[alunoSelecionado.caracteristica_id].nome}
                    </span>
                  )}
                </div>

                <form onSubmit={adicionar} className="mt-4 flex gap-2">
                  <textarea
                    value={texto} onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escreva uma nova observação…"
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition resize-none"
                  />
                  <button
                    type="submit" disabled={salvando}
                    className="px-5 rounded-xl bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30 disabled:opacity-60 flex items-center gap-2"
                  >
                    {salvando && <Loader2 size={16} className="animate-spin" />}
                    Salvar
                  </button>
                </form>

                {avisoIA && <p className="mt-3 text-xs text-[#F5C451] bg-[#F5C451]/10 px-3 py-2 rounded-lg">{avisoIA}</p>}

                <div className="mt-6 pt-6 border-t space-y-4">
                  {carregandoObs ? (
                    <div className="text-texto/50 text-sm">Carregando observações…</div>
                  ) : observacoes.length === 0 ? (
                    <p className="text-sm text-texto/45">Nenhuma observação registrada ainda.</p>
                  ) : (
                    observacoes.map((o) => {
                      const maiorPontuacao = Math.max(1, ...(o.mapa_competencias || []).map((c) => c.pontuacao || 0))
                      const sugestao = caracteristicaPorId[o.caracteristica_sugerida_id]
                      const seloSugerido = seloPorCaracteristicaId[o.caracteristica_sugerida_id]
                      const jaTemEssaCaracteristica = alunoSelecionado.caracteristica_id === o.caracteristica_sugerida_id
                      return (
                        <div key={o.id} className="rounded-xl bg-white/[0.03] p-4">
                          <p className="text-sm text-white/90 leading-relaxed">{o.texto}</p>
                          <div className="mt-2 text-xs text-texto/45">{new Date(o.criada_em).toLocaleString('pt-BR')}</div>

                          {analisandoId === o.id ? (
                            <div className="mt-3 flex items-center gap-2 text-xs text-azul">
                              <Loader2 size={13} className="animate-spin" /> IA analisando o texto…
                            </div>
                          ) : o.mapa_competencias ? (
                            <div className="mt-4 pt-4 border-t border-white/5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-texto/60 mb-2.5">
                                <Sparkles size={12} className="text-azul" /> Mapa de competências (IA)
                              </div>
                              <div className="space-y-1.5">
                                {(o.mapa_competencias || []).map((c) => (
                                  <div key={c.nome} className="flex items-center gap-2">
                                    <span className="text-[11px] text-texto/55 w-32 shrink-0 truncate">{c.nome}</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                      <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${Math.max(4, (c.pontuacao / maiorPontuacao) * 100)}%` }} />
                                    </div>
                                    <span className="text-[11px] text-texto/50 w-5 text-right">{c.pontuacao}</span>
                                  </div>
                                ))}
                              </div>

                              {sugestao && (
                                <div className="mt-3 rounded-lg bg-azul/10 border border-azul/20 p-3">
                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 text-sm">
                                      {seloSugerido && <IconeSelo nome={seloSugerido.icone} size={14} style={{ color: sugestao.cor }} />}
                                      <span className="text-white/90">
                                        IA sugere: <span className="font-semibold" style={{ color: sugestao.cor }}>{sugestao.nome}</span>
                                        {typeof o.confianca_ia === 'number' && (
                                          <span className="text-texto/45"> ({Math.round(o.confianca_ia * 100)}% confiança)</span>
                                        )}
                                      </span>
                                    </div>
                                    {jaTemEssaCaracteristica ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-[#3FD08A]"><Check size={13} /> Já aplicada</span>
                                    ) : (
                                      <button
                                        onClick={() => aplicarCaracteristica(o)}
                                        disabled={aplicandoId === o.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-azul hover:bg-azul-puro text-white transition disabled:opacity-60"
                                      >
                                        {aplicandoId === o.id ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                                        Aplicar e conceder selo
                                      </button>
                                    )}
                                  </div>
                                  {o.justificativa_ia && <p className="mt-2 text-xs text-texto/50 leading-relaxed">{o.justificativa_ia}</p>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => analisar(o)}
                              className="mt-3 inline-flex items-center gap-1.5 text-xs text-azul hover:text-white transition"
                            >
                              <RefreshCcw size={12} /> Analisar com IA
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
