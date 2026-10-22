import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CalendarRange, Wand2, Loader2, AlertTriangle, School, GripVertical, Trash2 } from 'lucide-react'
import { gerarGradeEscola, DIAS_SEMANA_GRADE, NOME_DIA_SEMANA, PERIODOS_POR_ETAPA } from '../../lib/gerarGrade'

export default function DiretorCronograma() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [atribuicoes, setAtribuicoes] = useState([])
  const [disponibilidades, setDisponibilidades] = useState([])
  const [grade, setGrade] = useState([])
  const [salaAtiva, setSalaAtiva] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [avisos, setAvisos] = useState([])
  const [selecionada, setSelecionada] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const [solicitacoes, setSolicitacoes] = useState([])
  const [cargas, setCargas] = useState({})
  async function salvarCarga(event, atribuicao, minimo) {
    event.preventDefault()
    const quantidade = Number(cargas[atribuicao.id] ?? atribuicao.aulas_semana)
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > periodosPorDia * 5) {
      setErro(`Defina de 1 a ${periodosPorDia * 5} aulas por semana.`)
      return
    }
    setSalvando(true); setErro('')
    try {
      const { data, error } = await supabase.from('sala_materias').update({ aulas_semana: quantidade })
        .eq('id', atribuicao.id).eq('escola_id', perfil.escola_id).select('id').single()
      if (error || !data) throw error || new Error('Alteração não confirmada.')
      setAtribuicoes((anteriores) => anteriores.map((a) => a.id === atribuicao.id ? { ...a, aulas_semana: quantidade } : a))
      setMensagem(`Quantidade de ${atribuicao.materiaNome} definida pela escola: ${quantidade} aulas por semana.${quantidade < minimo ? ' A grade atual foi preservada; cancele os pedidos pendentes e gere novamente para ajustar as aulas já alocadas.' : ''}`)
    } catch { setErro('Não foi possível salvar a quantidade de aulas. Tente novamente.') }
    finally { setSalvando(false) }
  }


  async function moverAula(token, dia, periodo) {
    if (salvando || gerando || !token) return
    const destino = grade.find((g) => g.sala_id === salaAtiva && g.dia_semana === dia && g.periodo === periodo)
    const nova = token.startsWith('atribuicao:')
    const aula = nova ? null : grade.find((g) => g.id === token && g.sala_id === salaAtiva)
    const atribuicao = nova ? atribuicoes.find((a) => a.id === token.slice(11) && a.sala_id === salaAtiva)
      : atribuicoes.find((a) => a.sala_id === aula?.sala_id && a.materia_id === aula?.materia_id)
    if (!atribuicao) return
    if (aula?.dia_semana === dia && aula?.periodo === periodo) return
    setErro(''); setMensagem(''); setSalvando(true)
    try {
      if (nova && destino) throw new Error('Para trocar duas aulas, arraste uma aula que já está na grade sobre a outra.')
      const { data, error } = destino && aula
        ? await supabase.rpc('trocar_aulas_slark', { p_origem: aula.id, p_destino: destino.id })
        : await supabase.rpc('agendar_aula_slark', {
          p_atribuicao: atribuicao.id, p_grade: aula?.id || null, p_dia: dia, p_periodo: periodo,
        })
      if (error) throw error
      setSelecionada(null)
      await carregar()
      setMensagem(data.status === 'pendente'
        ? 'Solicitação enviada às notificações. A alteração só será aplicada após todos os aceites necessários.'
        : destino ? 'Aulas trocadas de posição e salvas.' : `Aula salva em ${NOME_DIA_SEMANA[dia]}, ${periodo}º período.`)
    } catch (e) { setErro(e.message || 'Não foi possível agendar esta aula.') }
    finally { setSalvando(false) }
  }

  async function esvaziarGrade() {
    if (salvando || gerando || !salaAtiva) return
    if (!window.confirm(`Esvaziar a grade de ${sala?.nome || 'esta turma'}? As aulas agendadas serão removidas e os pedidos pendentes serão cancelados. Matérias, professores e quantidades cadastradas serão mantidos.`)) return
    setSalvando(true); setErro(''); setMensagem('')
    try {
      const { error } = await supabase.rpc('esvaziar_grade_slark', { p_sala: salaAtiva })
      if (error) throw error
      setSelecionada(null)
      await carregar()
      setMensagem('Grade desta turma esvaziada. Você já pode montar os horários novamente.')
    } catch (e) { setErro(e.message || 'Não foi possível esvaziar a grade.') }
    finally { setSalvando(false) }
  }

  async function cancelarSolicitacao(id) {
    setSalvando(true); setErro('')
    try {
      const { error } = await supabase.rpc('responder_aula_slark', { p_id: id, p_resposta: 'cancelar' })
      if (error) throw error
      await carregar()
      setMensagem('Solicitação cancelada. O horário está livre novamente.')
    } catch (e) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const [
        { data: salasData, error: eSalas },
        { data: atribData, error: eAtrib },
        { data: dispData, error: eDisp },
        { data: gradeData, error: eGrade },
        { data: pedidosData, error: ePedidos },
      ] = await Promise.all([
        supabase.from('salas').select('id, nome, etapa').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('sala_materias').select('*, materias(nome), usuarios:professor_id(nome)').eq('escola_id', perfil.escola_id),
        supabase.from('disponibilidade_professor').select('*').eq('escola_id', perfil.escola_id),
        supabase.from('grade_horarios').select('*, materias(nome), usuarios:professor_id(nome)').eq('escola_id', perfil.escola_id),
        supabase.from('solicitacoes_grade').select('*, materias(nome), usuarios:professor_id(nome)').eq('escola_id', perfil.escola_id).order('criada_em', { ascending: false }),
      ])
      if (eSalas) throw eSalas
      if (eAtrib) throw eAtrib
      if (eDisp) throw eDisp
      if (eGrade) throw eGrade
      if (ePedidos) throw ePedidos

      setSalas(salasData || [])
      setSalaAtiva((atual) => atual && (salasData || []).some((s) => s.id === atual) ? atual : (salasData || [])[0]?.id || '')
      setAtribuicoes((atribData || []).map((a) => ({
        ...a,
        materiaNome: a.materias?.nome || '—',
        professorNome: a.usuarios?.nome || null,
      })))
      setDisponibilidades(dispData || [])
      setGrade(gradeData || [])
      setSolicitacoes(pedidosData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os dados do cronograma. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar()
    const atualizar = () => { void carregar() }
    window.addEventListener('focus', atualizar)
    return () => window.removeEventListener('focus', atualizar)
  }, [perfil?.escola_id])

  async function gerarGrade() {
    if (solicitacoes.some((s) => ['pendente', 'aprovada'].includes(s.status))) { setErro('Resolva ou cancele as solicitações pendentes antes de gerar uma nova grade.'); return }
    if (!confirm('Isso substitui a grade atual de todas as salas da escola pela nova grade gerada automaticamente. Continuar?')) return
    setGerando(true)
    setErro('')
    setAvisos([])
    try {
      const { linhas, avisos: avisosGeracao } = gerarGradeEscola({
        salas: salas.map((s) => ({ ...s, escola_id: perfil.escola_id })),
        atribuicoes,
        disponibilidades,
      })

      const { error: eDelete } = await supabase.from('grade_horarios').delete().eq('escola_id', perfil.escola_id)
      if (eDelete) throw eDelete

      if (linhas.length > 0) {
        const { error: eInsert } = await supabase.from('grade_horarios').insert(linhas)
        if (eInsert) throw eInsert
      }

      setAvisos(avisosGeracao)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível gerar a grade automaticamente.')
    } finally {
      setGerando(false)
    }
  }

  const sala = salas.find((s) => s.id === salaAtiva)
  const periodosPorDia = PERIODOS_POR_ETAPA[sala?.etapa] || PERIODOS_POR_ETAPA.ensino_medio
  const periodos = useMemo(() => Array.from({ length: periodosPorDia }, (_, i) => i + 1), [periodosPorDia])

  const gradeDaSala = useMemo(() => grade.filter((g) => g.sala_id === salaAtiva), [grade, salaAtiva])
  const porSlot = useMemo(
    () => Object.fromEntries(gradeDaSala.map((g) => [`${g.dia_semana}-${g.periodo}`, g])),
    [gradeDaSala],
  )

  const pendentes = solicitacoes.filter((s) => ['pendente', 'aprovada'].includes(s.status))
  const pedidosDaSala = solicitacoes.filter((s) => s.sala_id === salaAtiva)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <CalendarRange className="text-azul" size={28} />
            <h1 className="text-4xl font-bold text-white tracking-tight">Cronograma</h1>
          </div>
          <p className="mt-2 text-texto/60 max-w-2xl">
            Gere automaticamente a grade semanal de todas as turmas, com base na disponibilidade que cada professor marcou e nas aulas/semana definidas em "Matérias".
          </p>
        </div>
        <button
          onClick={gerarGrade} disabled={gerando || salvando || carregando || salas.length === 0 || solicitacoes.some((s) => ['pendente', 'aprovada'].includes(s.status))}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30 disabled:opacity-50"
        >
          {gerando ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
          {gerando ? 'Gerando…' : 'Gerar grade automaticamente'}
        </button>
      </div>

      {mensagem && <p role="status" className="mt-4 text-sm text-texto/80">{mensagem}</p>}
      {erro && <p role="alert" className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {avisos.length > 0 && (
        <div className="mt-6 rounded-2xl bg-[#F5C451]/10 border border-[#F5C451]/25 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F5C451]">
            <AlertTriangle size={16} /> {avisos.length} aviso{avisos.length > 1 ? 's' : ''} sobre a grade gerada
          </div>
          <ul className="mt-2.5 space-y-1.5 text-xs text-texto/70 list-disc list-inside">
            {avisos.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando…</div>
      ) : salas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <School className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Cadastre salas e matérias antes de gerar o cronograma.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2">
            {salas.map((s) => (
              <button
                key={s.id} disabled={salvando || gerando} onClick={() => { setSalaAtiva(s.id); setSelecionada(null) }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${salaAtiva === s.id ? 'bg-azul text-white' : 'bg-card border text-texto/60 hover:text-white'}`}
              >
                {s.nome}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm text-texto/60" aria-live="polite">
            {salvando ? 'Salvando alteração…' : selecionada ? 'Escolha um horário vazio ou outra aula para trocar de posição.' : 'Arraste para um horário vazio ou sobre outra aula para trocar as duas de posição. No celular ou teclado, selecione a aula e depois o destino.'}
            {selecionada && !salvando && <button onClick={() => setSelecionada(null)} className="ml-2 underline">Cancelar</button>}
          </p>
          <button type="button" onClick={esvaziarGrade} disabled={salvando || gerando || carregando || (!gradeDaSala.length && !pendentes.some((r) => r.sala_id === salaAtiva))}
            className="mt-4 flex items-center gap-2 rounded-full border border-red-400/30 px-4 py-2.5 text-sm text-red-400 disabled:opacity-50"><Trash2 size={16}/>Esvaziar grade desta turma</button>
          <section className="mt-6 rounded-2xl bg-card border p-5" aria-label="Aulas desta turma">
            <h2 className="text-lg font-semibold text-white">Aulas desta turma</h2>
            <p className="mt-2 text-xs text-texto/60">A escola define aqui quantas aulas de cada matéria a turma terá por semana. Arraste uma aula disponível para a grade. Fora da disponibilidade, o professor recebe um pedido de aceite.</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {atribuicoes.filter((a) => a.sala_id === salaAtiva).map((a) => {
                const alocadas = gradeDaSala.filter((g) => g.materia_id === a.materia_id).length
                const aguardando = pendentes.filter((r) => r.atribuicao_id === a.id && !r.grade_id).length
                const faltam = Math.max(0, a.aulas_semana - alocadas - aguardando)
                const token = `atribuicao:${a.id}`
                const desabilitada = !a.professor_id || !faltam || salvando || gerando
                return <article key={a.id} className="rounded-xl border p-4">
                  <form onSubmit={(event) => salvarCarga(event, a, alocadas + aguardando)} className="mb-3">
                    <label htmlFor={`carga-${a.id}`} className="block text-xs text-texto/70 mb-2">Aulas por semana · definido pela escola</label>
                    <div className="flex gap-2">
                      <input id={`carga-${a.id}`} type="number" min={1} max={periodosPorDia * 5} step={1} required
                        value={cargas[a.id] ?? a.aulas_semana} disabled={salvando || gerando}
                        onChange={(event) => setCargas((atual) => ({ ...atual, [a.id]: event.target.value }))}
                        aria-label={`Aulas por semana de ${a.materiaNome}`}
                        className="w-20 rounded-lg border bg-card px-3 py-2 text-sm text-white" />
                      <button type="submit" disabled={salvando || gerando} className="rounded-full bg-azul px-4 py-2 text-xs text-white disabled:opacity-50">Salvar</button>
                    </div>
                  </form>
                  <button type="button" draggable={!desabilitada} disabled={desabilitada}
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', token); e.dataTransfer.effectAllowed = 'move'; setSelecionada(token) }}
                  onClick={() => { setSelecionada(token === selecionada ? null : token); setMensagem('') }}
                  aria-pressed={selecionada === token}
                  className={`w-full rounded-xl border p-3 text-left disabled:opacity-50 enabled:cursor-grab ${selecionada === token ? 'ring-2 ring-azul bg-azul/10' : ''}`}>
                  <span className="flex items-center gap-2 font-semibold text-sm text-white"><GripVertical size={16}/>{a.materiaNome}</span>
                  <span className="block mt-2 text-xs text-texto/70">{a.professorNome || 'Sem professor definido'}</span>
                  <span className="block mt-2 text-xs text-texto/60">{alocadas}/{a.aulas_semana} alocadas · {aguardando} pendentes · {faltam} para arrastar</span>
                </button>
                </article>
              })}
            </div>
            {!atribuicoes.some((a) => a.sala_id === salaAtiva) && <p className="mt-4 text-sm text-texto/60">Cadastre as matérias e os professores desta turma em Matérias.</p>}
          </section>
          {pedidosDaSala.length > 0 && <section className="mt-4 rounded-2xl border bg-card p-5" aria-label="Solicitações de horário">
            <h2 className="font-semibold text-white">Respostas dos professores</h2>
            <div className="mt-3 space-y-3">{pedidosDaSala.slice(0, 20).map((r) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 text-xs text-texto/70">
              <span>{r.materias?.nome} · {r.usuarios?.nome} · {NOME_DIA_SEMANA[r.dia_semana]}, {r.periodo}º · <strong>{['pendente', 'aprovada'].includes(r.status) ? 'Aguardando aceite' : r.status}</strong></span>
              {['pendente', 'aprovada'].includes(r.status) && <button disabled={salvando} onClick={() => cancelarSolicitacao(r.id)} className="underline">Cancelar pedido</button>}
            </div>)}</div>
          </section>}
            <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-texto/50 uppercase tracking-wide">Período</th>
                    {DIAS_SEMANA_GRADE.map((dia) => (
                      <th key={dia} className="px-3 py-3 text-center text-xs font-semibold text-texto/50 uppercase tracking-wide">
                        {NOME_DIA_SEMANA[dia]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodos.map((periodo) => (
                    <tr key={periodo} className="border-b last:border-b-0">
                      <td className="px-3 py-3 text-sm text-texto/60 font-medium">{periodo}º</td>
                      {DIAS_SEMANA_GRADE.map((dia) => {
                        const aula = porSlot[`${dia}-${periodo}`]
                        const pedido = pendentes.find((r) => r.sala_id === salaAtiva && r.dia_semana === dia && r.periodo === periodo)
                        const origemPendente = aula && pendentes.some((r) => r.grade_id === aula.id)
                        return (
                          <td key={dia} className="px-2 py-2 text-center"
                            onDragOver={(e) => { if (!salvando && !gerando) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
                            onDrop={(e) => { e.preventDefault(); moverAula(e.dataTransfer.getData('text/plain'), dia, periodo) }}
                          >
                            {aula ? (
                              <button type="button" draggable={!salvando && !gerando && !origemPendente} disabled={salvando || gerando || origemPendente}
                                onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(aula.id)); e.dataTransfer.effectAllowed = 'move'; setSelecionada(aula.id) }}
                                onClick={() => { if (selecionada && selecionada !== aula.id) { moverAula(selecionada, dia, periodo) } else { setSelecionada(selecionada === aula.id ? null : aula.id); setMensagem('') } }}
                                aria-pressed={selecionada === aula.id}
                                aria-label={`Mover ${aula.materias?.nome || 'aula'}, ${NOME_DIA_SEMANA[dia]}, ${periodo}º período`}
                                className={`w-full rounded-lg bg-azul/10 border border-azul/25 px-2 py-2 cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-azul ${selecionada === aula.id ? 'ring-2 ring-azul' : ''}`}>
                                <GripVertical size={12} className="mx-auto mb-1 text-texto/40" />
                                <div className="text-xs font-semibold text-white truncate">{aula.materias?.nome}</div>
                                <div className="text-[11px] text-texto/50 truncate">{aula.usuarios?.nome || '—'}</div>
                                {origemPendente && <span className="block mt-1 text-[10px] text-texto/60">Mudança pendente</span>}
                              </button>
                            ) : pedido ? (
                              <div className="rounded-lg border border-dashed border-amber-400/40 bg-amber-400/10 p-2 text-xs"><strong>{pedido.materias?.nome}</strong><p>{pedido.usuarios?.nome}</p><p className="mt-1">Aguardando aceite</p></div>
                            ) : (
                              <button type="button" disabled={!selecionada || salvando || gerando}
                                onClick={() => moverAula(selecionada, dia, periodo)}
                                aria-label={`Mover para ${NOME_DIA_SEMANA[dia]}, ${periodo}º período`}
                                className="w-full min-h-14 rounded-lg border border-dashed border-azul/20 py-2 text-texto/50 text-xs enabled:hover:bg-azul/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azul">
                                {selecionada ? 'Soltar aqui' : 'Livre'}
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </>
      )}
    </div>
  )
}
