import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { salasDoProfessor } from '../../lib/salasProfessor'
import { GraduationCap, Sparkles, Clock, Package, Plus, X, Loader2, Trash2, Wand2, ChevronLeft, ChevronRight, BookOpen, Pencil } from 'lucide-react'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatarISO(date) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatarAulaIA(aula) {
  const partes = [
    `Objetivo da aula:\n${aula.objetivo || '-'}`,
    `Introdução:\n${aula.introducao || '-'}`,
    `Desenvolvimento:\n${aula.desenvolvimento || '-'}`,
    `Prática guiada:\n${aula.pratica_guiada || '-'}`,
    `Avaliação / fechamento:\n${aula.avaliacao || '-'}`,
  ]
  if (aula.dinamica_gamificada?.titulo) {
    const d = aula.dinamica_gamificada
    partes.push(`Dinâmica gamificada — ${d.titulo} (${d.duracao || '—'}, material: ${d.material || 'nenhum'}):\n${d.descricao || '-'}`)
  }
  if (aula.competencia_foco) {
    partes.push(`Competência trabalhada: ${aula.competencia_foco}`)
  }
  return partes.join('\n\n')
}

const MODELO_SUGERIDO = `Objetivo da aula:
-

Introdução (5-10 min):
-

Desenvolvimento (20-30 min):
-

Prática guiada:
-

Avaliação / fechamento:
- `

const CATEGORIAS = [
  {
    nome: 'Quebra-gelo',
    cor: '#F5C451',
    dinamicas: [
      { titulo: 'Verdade ou mentira', duracao: '10 min', material: 'Nenhum', descricao: 'Cada aluno conta 3 fatos sobre si, sendo um falso. A turma vota em qual é a mentira.' },
      { titulo: 'Bingo humano', duracao: '15 min', material: 'Cartelas impressas', descricao: 'Alunos circulam pela sala buscando colegas que se encaixem em características de uma cartela.' },
    ],
  },
  {
    nome: 'Trabalho em equipe',
    cor: '#0651C3',
    dinamicas: [
      { titulo: 'Torre de espaguete', duracao: '25 min', material: 'Espaguete cru, fita crepe, barbante', descricao: 'Times competem para construir a torre mais alta que sustente um marshmallow no topo.' },
      { titulo: 'Quebra-cabeça cooperativo', duracao: '20 min', material: 'Peças de quebra-cabeça divididas entre grupos', descricao: 'Cada time recebe parte das peças e precisa negociar trocas com outros times para completar sua imagem.' },
    ],
  },
  {
    nome: 'Fixação de conteúdo',
    cor: '#3FD08A',
    dinamicas: [
      { titulo: 'Roleta de perguntas', duracao: '15 min', material: 'Roleta física ou digital com temas', descricao: 'Gire a roleta para sortear o tema; o aluno sorteado responde uma pergunta sobre o conteúdo da aula.' },
      { titulo: 'Batalha de equipes (quiz)', duracao: '20 min', material: 'Kahoot! (integrado à Slark)', descricao: 'Use um quiz do Kahoot! vinculado à trilha da aula para revisar o conteúdo em formato de competição.' },
    ],
  },
  {
    nome: 'Avaliação formativa',
    cor: '#C44DFF',
    dinamicas: [
      { titulo: 'Semáforo da compreensão', duracao: '5 min', material: 'Cartões verde/amarelo/vermelho', descricao: 'Ao final da explicação, peça que levantem o cartão que representa o quanto entenderam o conteúdo.' },
      { titulo: 'Bilhete de saída', duracao: '5 min', material: 'Papel ou formulário digital', descricao: 'Cada aluno escreve uma coisa que aprendeu e uma dúvida que ainda tem, antes de sair da aula.' },
    ],
  },
]

export default function ProfessorAulaSlark() {
  const [aba, setAba] = useState('planos')

  return (
    <div>
      <div className="flex items-center gap-3">
        <GraduationCap className="text-azul" size={28} />
        <h1 className="text-4xl font-bold text-white tracking-tight">Aula Slark</h1>
      </div>
      <p className="mt-2 text-texto/60">Planeje suas aulas com a IA da Slark ou encontre dinâmicas prontas para deixá-las mais leves.</p>

      <div className="mt-6 inline-flex rounded-xl bg-card border p-1">
        <button onClick={() => setAba('planos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'planos' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>Planos de aula</button>
        <button onClick={() => setAba('dinamicas')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'dinamicas' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>Dinâmicas prontas</button>
        <button onClick={() => setAba('diario')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'diario' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          <BookOpen size={14} /> Diário de Classe
        </button>
      </div>

      {aba === 'planos' ? <PlanosDeAula /> : aba === 'dinamicas' ? <Dinamicas /> : <DiarioDeClasse />}
    </div>
  )
}

function Dinamicas() {
  const [categoriaAtiva, setCategoriaAtiva] = useState(CATEGORIAS[0].nome)
  const categoria = CATEGORIAS.find((c) => c.nome === categoriaAtiva)

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.nome} onClick={() => setCategoriaAtiva(c.nome)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition"
            style={{
              background: categoriaAtiva === c.nome ? c.cor : 'rgba(255,255,255,0.04)',
              color: categoriaAtiva === c.nome ? '#0B0F1A' : 'rgba(255,255,255,0.65)',
            }}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {categoria.dinamicas.map((d) => (
          <div key={d.titulo} className="rounded-2xl bg-card border p-6">
            <div className="font-bold text-white text-lg">{d.titulo}</div>
            <p className="text-sm text-texto/60 mt-2 leading-relaxed">{d.descricao}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-texto/50">
              <div className="flex items-center gap-1.5"><Clock size={13} /> {d.duracao}</div>
              <div className="flex items-center gap-1.5"><Package size={13} /> {d.material}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlanosDeAula() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [planos, setPlanos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [salaId, setSalaId] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [temaIA, setTemaIA] = useState('')
  const [gerandoIA, setGerandoIA] = useState(false)
  const [avisoIA, setAvisoIA] = useState('')

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: salasData, error: eSalas }, { data: planosData, error: ePlanos }] = await Promise.all([
        salasDoProfessor(perfil.id, 'id, nome'),
        supabase.from('planos_aula').select('*').eq('professor_id', perfil.id).order('criado_em', { ascending: false }),
      ])
      if (eSalas) throw eSalas
      if (ePlanos) throw ePlanos
      setSalas(salasData || [])
      const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
      setPlanos((planosData || []).map((p) => ({ ...p, salaNome: salaPorId[p.sala_id]?.nome || 'Geral' })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os planos de aula. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  function abrirNovo() {
    setEditandoId(null)
    setTitulo('')
    setSalaId(salas[0]?.id || '')
    setConteudo('')
    setTemaIA('')
    setAvisoIA('')
    setModalAberto(true)
  }

  async function gerarComIA() {
    if (!temaIA.trim()) {
      setAvisoIA('Escreva o tema da aula para a IA gerar o plano.')
      return
    }
    setGerandoIA(true)
    setAvisoIA('')
    try {
      const salaSelecionada = salas.find((s) => s.id === salaId)
      const { data, error } = await supabase.functions.invoke('gerar-aula-slark', {
        body: { tema: temaIA.trim(), serie: salaSelecionada?.nome || '' },
      })
      if (error) {
        // error.context é a Response bruta da edge function; a mensagem
        // genérica do supabase-js ("Edge Function returned a non-2xx
        // status code") esconde o motivo real, que vem no corpo JSON.
        const corpo = await error.context?.json?.().catch(() => null)
        throw new Error(corpo?.error || error.message)
      }
      if (data?.error) throw new Error(data.error)

      const aula = data.aula
      setTitulo(aula.titulo || temaIA.trim())
      setConteudo(formatarAulaIA(aula))
    } catch (e) {
      console.error(e)
      setAvisoIA(e.message || 'Não foi possível gerar a aula com IA agora. Tente novamente.')
    } finally {
      setGerandoIA(false)
    }
  }

  function abrirEdicao(p) {
    setEditandoId(p.id)
    setTitulo(p.titulo)
    setSalaId(p.sala_id || '')
    setConteudo(p.conteudo?.texto || '')
    setTemaIA('')
    setAvisoIA('')
    setModalAberto(true)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const payload = { titulo, sala_id: salaId || null, conteudo: { texto: conteudo } }
      if (editandoId) {
        const { error } = await supabase.from('planos_aula').update(payload).eq('id', editandoId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('planos_aula').insert({ ...payload, professor_id: perfil.id })
        if (error) throw error
      }
      setModalAberto(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar o plano de aula.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    try {
      const { error } = await supabase.from('planos_aula').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir o plano de aula.')
    }
  }

  return (
    <div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Novo plano
        </button>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando planos…</div>
      ) : planos.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Sparkles className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum plano de aula criado ainda.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {planos.map((p) => (
            <button key={p.id} onClick={() => abrirEdicao(p)} className="text-left rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-white text-lg leading-snug">{p.titulo}</div>
                <button onClick={(e) => { e.stopPropagation(); excluir(p.id) }} className="p-1.5 rounded-lg text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="text-texto/50 text-sm mt-1">{p.salaNome}</div>
              <p className="text-texto/60 text-sm mt-3 line-clamp-3 whitespace-pre-wrap">{p.conteudo?.texto}</p>
            </button>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editandoId ? 'Editar plano' : 'Novo plano de aula'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            {!editandoId && (
              <div className="mb-5 rounded-xl bg-azul/10 border border-azul/20 p-4">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  <Sparkles size={14} className="text-azul" /> Gerar com IA no molde Slark
                </div>
                <p className="text-xs text-texto/60 mt-1">Diga o tema e a IA monta a aula seguindo o Método Slark — gamificada, personalizada e sem decoreba.</p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={temaIA} onChange={(e) => setTemaIA(e.target.value)}
                    placeholder="Ex: Frações, Revolução Francesa, Ciclo da água…"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 text-sm focus:outline-none focus:border-azul transition"
                  />
                  <button
                    type="button" onClick={gerarComIA} disabled={gerandoIA}
                    className="shrink-0 flex items-center gap-1.5 px-4 rounded-xl bg-azul hover:bg-azul-puro text-white text-sm font-semibold transition disabled:opacity-60"
                  >
                    {gerandoIA ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                    {gerandoIA ? 'Gerando…' : 'Gerar'}
                  </button>
                </div>
                {avisoIA && <p className="mt-2.5 text-xs text-[#F5C451]">{avisoIA}</p>}
              </div>
            )}
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Título</label>
                <input
                  required value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Turma</label>
                <select
                  value={salaId} onChange={(e) => setSalaId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="">Geral (todas as turmas)</option>
                  {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-texto/70">Conteúdo do plano</label>
                  {!conteudo && (
                    <button type="button" onClick={() => setConteudo(MODELO_SUGERIDO)} className="flex items-center gap-1.5 text-xs text-azul hover:underline">
                      <Wand2 size={12} /> Usar estrutura sugerida
                    </button>
                  )}
                </div>
                <textarea
                  required value={conteudo} onChange={(e) => setConteudo(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none font-mono text-sm"
                />
              </div>
              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Criar plano'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function DiarioDeClasse() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [salaId, setSalaId] = useState('')
  const [diario, setDiario] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mesAtual, setMesAtual] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [textoDiario, setTextoDiario] = useState('')
  const [salvandoDiario, setSalvandoDiario] = useState(false)

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: salasData, error: eSalas } = await salasDoProfessor(perfil.id, 'id, nome, escola_id')
      if (eSalas) throw eSalas
      setSalas(salasData || [])
      setSalaId((atual) => atual && (salasData || []).some((s) => s.id === atual) ? atual : (salasData || [])[0]?.id || '')
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar suas salas. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  useEffect(() => {
    if (!salaId || !perfil?.id) { setDiario([]); return }
    async function carregarDiario() {
      try {
        const { data, error } = await supabase.from('diario_aula').select('*').eq('sala_id', salaId).eq('professor_id', perfil.id)
        if (error) throw error
        setDiario(data || [])
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar o diário dessa sala.')
      }
    }
    carregarDiario()
  }, [salaId, perfil?.id])

  const diasDoMes = useMemo(() => {
    const ano = mesAtual.getFullYear(); const mes = mesAtual.getMonth()
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    const celulas = []
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null)
    for (let d = 1; d <= totalDias; d++) celulas.push(new Date(ano, mes, d))
    while (celulas.length % 7 !== 0) celulas.push(null)
    return celulas
  }, [mesAtual])

  const diarioPorData = useMemo(() => Object.fromEntries(diario.map((d) => [d.data, d])), [diario])
  const hojeISO = formatarISO(new Date())
  const salaAtual = salas.find((s) => s.id === salaId)

  function abrirDia(iso) {
    setDiaSelecionado(iso)
    setTextoDiario(diarioPorData[iso]?.conteudo || '')
  }

  async function salvarDiario(e) {
    e.preventDefault()
    if (!diaSelecionado || !salaAtual) return
    setSalvandoDiario(true)
    setErro('')
    try {
      const { error } = await supabase.from('diario_aula').upsert({
        sala_id: salaAtual.id,
        professor_id: perfil.id,
        escola_id: salaAtual.escola_id,
        data: diaSelecionado,
        conteudo: textoDiario.trim(),
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'sala_id,professor_id,data' })
      if (error) throw error
      setDiaSelecionado(null)
      const { data, error: eReload } = await supabase.from('diario_aula').select('*').eq('sala_id', salaAtual.id).eq('professor_id', perfil.id)
      if (eReload) throw eReload
      setDiario(data || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar o diário desse dia.')
    } finally {
      setSalvandoDiario(false)
    }
  }

  if (carregando) {
    return <div className="mt-10 text-texto/50">Carregando…</div>
  }

  if (salas.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
        <BookOpen className="mx-auto text-azul/60" size={40} />
        <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Você ainda não está em nenhuma sala.</p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {erro && <p className="mb-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <select
          value={salaId} onChange={(e) => setSalaId(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition"
        >
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <div className="flex items-center gap-3">
          <button onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 rounded-lg bg-card border text-texto/60 hover:text-white transition">
            <ChevronLeft size={16} />
          </button>
          <div className="text-lg font-bold text-white w-44 text-center">{MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}</div>
          <button onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 rounded-lg bg-card border text-texto/60 hover:text-white transition">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-texto/45">Registre o que foi trabalhado em cada aula — é o diário de classe, obrigatório por lei.</p>

      <div className="mt-4 rounded-2xl bg-card border overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-texto/50">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {diasDoMes.map((date, i) => {
            const iso = date ? formatarISO(date) : null
            const entrada = iso ? diarioPorData[iso] : null
            const ehHoje = iso === hojeISO
            return (
              <button
                key={i}
                disabled={!date}
                onClick={() => abrirDia(iso)}
                className={`min-h-[84px] border-b border-r p-2 text-left align-top transition ${!date ? 'bg-white/[0.01]' : 'hover:bg-white/[0.03]'} ${i % 7 === 6 ? 'border-r-0' : ''}`}
              >
                {date && (
                  <>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${ehHoje ? 'bg-azul text-white font-bold' : 'text-texto/60'}`}>
                      {date.getDate()}
                    </span>
                    {entrada && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#3FD08A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3FD08A]" /> preenchido
                      </div>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {diaSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDiaSelecionado(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Pencil size={17} className="text-azul" /> {new Date(diaSelecionado + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => setDiaSelecionado(null)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={salvarDiario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">O que foi trabalhado nessa aula?</label>
                <textarea
                  required rows={6} value={textoDiario} onChange={(e) => setTextoDiario(e.target.value)}
                  placeholder="Ex: Introdução ao conteúdo de industrialização no Brasil, leitura do capítulo 3 e discussão em grupo."
                  className="w-full px-4 py-3 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition resize-none"
                />
              </div>
              <button
                type="submit" disabled={salvandoDiario}
                className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvandoDiario && <Loader2 size={18} className="animate-spin" />}
                {salvandoDiario ? 'Salvando…' : 'Salvar diário do dia'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
