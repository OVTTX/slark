import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Kanban, List, CalendarDays, Plus, X, Loader2, Trash2, ChevronLeft, ChevronRight, Flag,
} from 'lucide-react'

const MEMBROS = [
  { nome: 'Regis', papel: 'Orientador', cor: '#F5C451' },
  { nome: 'Vitor Oliveira', papel: 'Idealização e liderança técnica', cor: '#2E5BFF' },
  { nome: 'Victor Pinaso', papel: 'Gestão organizacional', cor: '#3FD08A' },
  { nome: 'Lincoln Xavier', papel: 'Pesquisa técnica e narrativa visual', cor: '#C44DFF' },
  { nome: 'Tomás Galvão', papel: 'Revisão científica e dados', cor: '#FF6B6B' },
]

const COLUNAS = [
  { valor: 'a_fazer', rotulo: 'A Fazer', cor: '#8892B0' },
  { valor: 'em_andamento', rotulo: 'Em Andamento', cor: '#2E5BFF' },
  { valor: 'em_revisao', rotulo: 'Em Revisão', cor: '#F5C451' },
  { valor: 'concluido', rotulo: 'Concluído', cor: '#3FD08A' },
]

const PRIORIDADES = [
  { valor: 'baixa', rotulo: 'Baixa', cor: '#8892B0' },
  { valor: 'media', rotulo: 'Média', cor: '#F5C451' },
  { valor: 'alta', rotulo: 'Alta', cor: '#FF6B6B' },
]

const TIPOS_EVENTO = [
  { valor: 'reuniao', rotulo: 'Reunião', cor: '#2E5BFF' },
  { valor: 'prazo', rotulo: 'Prazo', cor: '#FF6B6B' },
  { valor: 'apresentacao', rotulo: 'Apresentação', cor: '#C44DFF' },
  { valor: 'entrega', rotulo: 'Entrega', cor: '#3FD08A' },
  { valor: 'outro', rotulo: 'Outro', cor: '#8892B0' },
]

function corMembro(nome) {
  return MEMBROS.find((m) => m.nome === nome)?.cor || '#8892B0'
}

export default function AdminFeceap() {
  const [aba, setAba] = useState('quadro')

  return (
    <div>
      <div className="flex items-center gap-3">
        <Kanban className="text-azul" size={28} />
        <h1 className="text-4xl font-bold text-white tracking-tight">Projeto FeCEAP</h1>
      </div>
      <p className="mt-2 text-texto/60">Gestão interna da equipe Slark para a 34ª FeCEAP.</p>

      <div className="mt-6 inline-flex rounded-xl bg-card border p-1">
        <button onClick={() => setAba('quadro')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'quadro' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          <Kanban size={14} /> Quadro
        </button>
        <button onClick={() => setAba('lista')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'lista' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          <List size={14} /> Lista
        </button>
        <button onClick={() => setAba('calendario')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'calendario' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          <CalendarDays size={14} /> Calendário
        </button>
      </div>

      {aba === 'quadro' && <QuadroTarefas />}
      {aba === 'lista' && <ListaTarefas />}
      {aba === 'calendario' && <CalendarioFeceap />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dados compartilhados de tarefas
// ---------------------------------------------------------------------------
function useTarefas() {
  const { perfil } = useAuth()
  const [tarefas, setTarefas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const { data, error } = await supabase.from('feceap_tarefas').select('*').order('ordem')
      if (error) throw error
      setTarefas(data || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as tarefas. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  return { tarefas, setTarefas, carregando, erro, setErro, carregar, perfil }
}

// ---------------------------------------------------------------------------
// Quadro Kanban (drag and drop nativo)
// ---------------------------------------------------------------------------
function QuadroTarefas() {
  const { tarefas, setTarefas, carregando, erro, setErro, carregar, perfil } = useTarefas()
  const [modalAberto, setModalAberto] = useState(false)
  const [colunaAlvo, setColunaAlvo] = useState('a_fazer')
  const [arrastando, setArrastando] = useState(null)
  const [colunaSobrevoada, setColunaSobrevoada] = useState(null)

  function abrirNova(coluna) {
    setColunaAlvo(coluna)
    setModalAberto(true)
  }

  async function excluir(id) {
    try {
      const { error } = await supabase.from('feceap_tarefas').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir a tarefa.')
    }
  }

  async function moverPara(tarefa, novoStatus) {
    if (tarefa.status === novoStatus) return
    // atualização otimista
    setTarefas((prev) => prev.map((t) => (t.id === tarefa.id ? { ...t, status: novoStatus } : t)))
    try {
      const novaOrdem = tarefas.filter((t) => t.status === novoStatus).length
      const { error } = await supabase.from('feceap_tarefas').update({ status: novoStatus, ordem: novaOrdem }).eq('id', tarefa.id)
      if (error) throw error
    } catch (e) {
      console.error(e)
      setErro('Não foi possível mover a tarefa.')
      await carregar()
    }
  }

  return (
    <div>
      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando quadro…</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUNAS.map((col, colIndex) => {
            const itens = tarefas.filter((t) => t.status === col.valor)
            const sobrevoada = colunaSobrevoada === col.valor
            return (
              <div
                key={col.valor}
                onDragOver={(e) => { e.preventDefault(); setColunaSobrevoada(col.valor) }}
                onDragLeave={() => setColunaSobrevoada((c) => (c === col.valor ? null : c))}
                onDrop={(e) => {
                  e.preventDefault()
                  setColunaSobrevoada(null)
                  if (arrastando) moverPara(arrastando, col.valor)
                }}
                className={`rounded-2xl border p-3 min-h-[200px] transition ${sobrevoada ? 'bg-azul/10 border-azul/50' : 'bg-card/60'}`}
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.cor }} />
                    <span className="text-sm font-semibold text-white">{col.rotulo}</span>
                    <span className="text-xs text-texto/45">{itens.length}</span>
                  </div>
                  <button onClick={() => abrirNova(col.valor)} className="p-1 rounded-lg text-texto/50 hover:text-white hover:bg-white/5 transition">
                    <Plus size={15} />
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {itens.map((t) => {
                    const prio = PRIORIDADES.find((p) => p.valor === t.prioridade) || PRIORIDADES[1]
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setArrastando(t)}
                        onDragEnd={() => setArrastando(null)}
                        className="rounded-xl bg-card border p-3.5 cursor-grab active:cursor-grabbing transition hover:border-azul/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium text-white/90 leading-snug">{t.titulo}</div>
                          <button onClick={() => excluir(t.id)} className="p-1 rounded-lg text-texto/30 hover:text-red-400 hover:bg-red-400/10 transition shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {t.descricao && <p className="text-xs text-texto/50 mt-1.5 line-clamp-2">{t.descricao}</p>}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Flag size={11} style={{ color: prio.cor }} />
                            <span className="text-[11px]" style={{ color: prio.cor }}>{prio.rotulo}</span>
                          </div>
                          {t.responsavel && (
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ background: corMembro(t.responsavel) }}
                              title={t.responsavel}
                            >
                              {t.responsavel[0]}
                            </span>
                          )}
                        </div>
                        {t.prazo && <div className="mt-2 text-[11px] text-texto/40">Prazo: {new Date(t.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}</div>}

                        {/* Setas para mover entre colunas — essenciais no celular, onde arrastar não funciona */}
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                          <button
                            onClick={() => colIndex > 0 && moverPara(t, COLUNAS[colIndex - 1].valor)}
                            disabled={colIndex === 0}
                            className="p-1 rounded-lg text-texto/40 hover:text-white hover:bg-white/10 transition disabled:opacity-20 disabled:pointer-events-none"
                            title={colIndex > 0 ? `Mover para ${COLUNAS[colIndex - 1].rotulo}` : undefined}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            onClick={() => colIndex < COLUNAS.length - 1 && moverPara(t, COLUNAS[colIndex + 1].valor)}
                            disabled={colIndex === COLUNAS.length - 1}
                            className="p-1 rounded-lg text-texto/40 hover:text-white hover:bg-white/10 transition disabled:opacity-20 disabled:pointer-events-none"
                            title={colIndex < COLUNAS.length - 1 ? `Mover para ${COLUNAS[colIndex + 1].rotulo}` : undefined}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {itens.length === 0 && (
                    <div className="text-center text-xs text-texto/35 py-6">Arraste tarefas aqui</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <ModalNovaTarefa
          colunaInicial={colunaAlvo}
          criadoPor={perfil?.id}
          onFechar={() => setModalAberto(false)}
          onCriada={() => { setModalAberto(false); carregar() }}
        />
      )}
    </div>
  )
}

function ModalNovaTarefa({ colunaInicial, criadoPor, onFechar, onCriada }) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [prioridade, setPrioridade] = useState('media')
  const [prazo, setPrazo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function criar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const { error } = await supabase.from('feceap_tarefas').insert({
        titulo, descricao: descricao || null, status: colunaInicial,
        responsavel: responsavel || null, prioridade, prazo: prazo || null,
        criado_por: criadoPor || null,
      })
      if (error) throw error
      onCriada()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar a tarefa.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Nova tarefa</h2>
          <button onClick={onFechar} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
        </div>
        <form onSubmit={criar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-texto/70 mb-1.5">Título</label>
            <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-texto/70 mb-1.5">Descrição (opcional)</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Responsável</label>
              <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                <option value="">Ninguém</option>
                {MEMBROS.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-texto/70 mb-1.5">Prioridade</label>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                {PRIORIDADES.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-texto/70 mb-1.5">Prazo (opcional)</label>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
          </div>
          {erro && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl">{erro}</p>}
          <button type="submit" disabled={salvando} className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2">
            {salvando && <Loader2 size={18} className="animate-spin" />}
            {salvando ? 'Criando…' : 'Criar tarefa'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------
function ListaTarefas() {
  const { tarefas, carregando, erro, setErro, carregar } = useTarefas()
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  async function mudarStatus(id, status) {
    try {
      const { error } = await supabase.from('feceap_tarefas').update({ status }).eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível atualizar o status.')
    }
  }

  async function excluir(id) {
    try {
      const { error } = await supabase.from('feceap_tarefas').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir a tarefa.')
    }
  }

  const filtradas = useMemo(() => tarefas.filter((t) =>
    (filtroResponsavel === 'todos' || t.responsavel === filtroResponsavel) &&
    (filtroStatus === 'todos' || t.status === filtroStatus)
  ), [tarefas, filtroResponsavel, filtroStatus])

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-3">
        <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)} className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition">
          <option value="todos">Todos os responsáveis</option>
          {MEMBROS.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition">
          <option value="todos">Todos os status</option>
          {COLUNAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
        </select>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando tarefas…</div>
      ) : filtradas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <List className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma tarefa por aqui.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Tarefa</th>
                <th className="px-6 py-4 font-medium">Responsável</th>
                <th className="px-6 py-4 font-medium">Prioridade</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Prazo</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((t) => {
                const prio = PRIORIDADES.find((p) => p.valor === t.prioridade) || PRIORIDADES[1]
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 font-semibold text-white">{t.titulo}</td>
                    <td className="px-6 py-4 text-texto/70">
                      {t.responsavel ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: corMembro(t.responsavel) }}>{t.responsavel[0]}</span>
                          {t.responsavel}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: prio.cor }}><Flag size={11} /> {prio.rotulo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={t.status} onChange={(e) => mudarStatus(t.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-azul/15 text-white text-xs focus:outline-none focus:border-azul transition"
                      >
                        {COLUNAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-texto/60">{t.prazo ? new Date(t.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => excluir(t.id)} className="p-1.5 rounded-lg text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calendário
// ---------------------------------------------------------------------------
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatarISO(date) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function CalendarioFeceap() {
  const { perfil } = useAuth()
  const [mesAtual, setMesAtual] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [eventos, setEventos] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [modalNovo, setModalNovo] = useState(false)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const [{ data: eventosData, error: eEv }, { data: tarefasData, error: eTa }] = await Promise.all([
        supabase.from('feceap_eventos').select('*').order('data'),
        supabase.from('feceap_tarefas').select('id, titulo, prazo, prioridade').not('prazo', 'is', null),
      ])
      if (eEv) throw eEv
      if (eTa) throw eTa
      setEventos(eventosData || [])
      setTarefas(tarefasData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar o calendário. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const dias = useMemo(() => {
    const ano = mesAtual.getFullYear(); const mes = mesAtual.getMonth()
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    const celulas = []
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null)
    for (let d = 1; d <= totalDias; d++) celulas.push(new Date(ano, mes, d))
    while (celulas.length % 7 !== 0) celulas.push(null)
    return celulas
  }, [mesAtual])

  function itensDoDia(date) {
    if (!date) return []
    const iso = formatarISO(date)
    const evs = eventos.filter((e) => e.data === iso).map((e) => ({ tipo: 'evento', ...e }))
    const tas = tarefas.filter((t) => t.prazo === iso).map((t) => ({ tipo: 'tarefa', ...t }))
    return [...evs, ...tas]
  }

  const hoje = formatarISO(new Date())

  return (
    <div>
      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 rounded-lg bg-card border text-texto/60 hover:text-white transition">
            <ChevronLeft size={16} />
          </button>
          <div className="text-lg font-bold text-white w-44 text-center">{MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}</div>
          <button onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 rounded-lg bg-card border text-texto/60 hover:text-white transition">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setMesAtual(() => { const d = new Date(); d.setDate(1); return d })} className="px-3 py-2 rounded-lg bg-card border text-texto/60 hover:text-white text-sm transition">
            Hoje
          </button>
        </div>
        <button
          onClick={() => { setDiaSelecionado(hoje); setModalNovo(true) }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={16} /> Novo evento
        </button>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando calendário…</div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-texto/50">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((date, i) => {
              const iso = date ? formatarISO(date) : null
              const itens = itensDoDia(date)
              const ehHoje = iso === hoje
              return (
                <button
                  key={i}
                  disabled={!date}
                  onClick={() => { setDiaSelecionado(iso); setModalNovo(true) }}
                  className={`min-h-[92px] border-b border-r p-2 text-left align-top transition ${!date ? 'bg-white/[0.01]' : 'hover:bg-white/[0.03]'} ${i % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  {date && (
                    <>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${ehHoje ? 'bg-azul text-white font-bold' : 'text-texto/60'}`}>
                        {date.getDate()}
                      </span>
                      <div className="mt-1 space-y-1">
                        {itens.slice(0, 3).map((it, idx) => {
                          const cor = it.tipo === 'evento' ? (TIPOS_EVENTO.find((t) => t.valor === it.tipo)?.cor || '#8892B0') : (PRIORIDADES.find((p) => p.valor === it.prioridade)?.cor || '#8892B0')
                          return (
                            <div key={idx} className="text-[10px] truncate px-1.5 py-0.5 rounded" style={{ background: `${cor}22`, color: cor }}>
                              {it.tipo === 'evento' ? it.titulo : `Tarefa: ${it.titulo}`}
                            </div>
                          )
                        })}
                        {itens.length > 3 && <div className="text-[10px] text-texto/40 px-1.5">+{itens.length - 3}</div>}
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {modalNovo && (
        <ModalDia
          diaISO={diaSelecionado}
          itens={itensDoDia(new Date(diaSelecionado + 'T00:00:00'))}
          criadoPor={perfil?.id}
          onFechar={() => setModalNovo(false)}
          onAtualizado={carregar}
        />
      )}
    </div>
  )
}

function ModalDia({ diaISO, itens, criadoPor, onFechar, onAtualizado }) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState('reuniao')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function criar(e) {
    e.preventDefault()
    if (!titulo.trim()) return
    setSalvando(true)
    setErro('')
    try {
      const { error } = await supabase.from('feceap_eventos').insert({ titulo, descricao: descricao || null, tipo, data: diaISO, criado_por: criadoPor || null })
      if (error) throw error
      setTitulo(''); setDescricao('')
      await onAtualizado()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar o evento.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirEvento(id) {
    try {
      const { error } = await supabase.from('feceap_eventos').delete().eq('id', id)
      if (error) throw error
      await onAtualizado()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir o evento.')
    }
  }

  const eventosDoDia = itens.filter((i) => i.tipo === 'evento')
  const tarefasDoDia = itens.filter((i) => i.tipo === 'tarefa')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">{new Date(diaISO + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h2>
          <button onClick={onFechar} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
        </div>

        {(eventosDoDia.length > 0 || tarefasDoDia.length > 0) && (
          <div className="mt-4 space-y-2">
            {eventosDoDia.map((ev) => {
              const info = TIPOS_EVENTO.find((t) => t.valor === ev.tipo) || TIPOS_EVENTO[4]
              return (
                <div key={ev.id} className="rounded-xl bg-card border p-3.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${info.cor}22`, color: info.cor }}>{info.rotulo}</span>
                    <div className="text-sm text-white/90 mt-1.5">{ev.titulo}</div>
                    {ev.descricao && <div className="text-xs text-texto/50 mt-1">{ev.descricao}</div>}
                  </div>
                  <button onClick={() => excluirEvento(ev.id)} className="p-1 rounded-lg text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition shrink-0"><Trash2 size={13} /></button>
                </div>
              )
            })}
            {tarefasDoDia.map((t, i) => (
              <div key={`t-${i}`} className="rounded-xl bg-white/[0.03] border border-dashed p-3.5">
                <span className="text-[11px] font-semibold text-texto/50">Prazo de tarefa</span>
                <div className="text-sm text-white/90 mt-1">{t.titulo}</div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={criar} className="mt-6 pt-6 border-t space-y-3">
          <div className="text-sm font-semibold text-texto/50">Novo evento nesse dia</div>
          <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
            {TIPOS_EVENTO.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" rows={2} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none" />
          {erro && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl">{erro}</p>}
          <button type="submit" disabled={salvando} className="w-full py-2.5 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
            {salvando && <Loader2 size={16} className="animate-spin" />}
            Adicionar evento
          </button>
        </form>
      </div>
    </div>
  )
}
