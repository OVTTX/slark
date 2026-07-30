import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { GraduationCap, Sparkles, Clock, Package, Plus, X, Loader2, Trash2, Wand2 } from 'lucide-react'

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
    cor: '#2E5BFF',
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
      </div>

      {aba === 'planos' ? <PlanosDeAula /> : <Dinamicas />}
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
        supabase.from('salas').select('id, nome').eq('professor_id', perfil.id),
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
      if (error) throw error
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
