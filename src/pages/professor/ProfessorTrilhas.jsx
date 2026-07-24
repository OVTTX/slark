import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  BookOpen, Plus, X, Loader2, FileText, Link2, File, Trash2, CheckCircle2, Eye, EyeOff,
  FolderKanban, Save,
} from 'lucide-react'

const STATUS_TRILHA = [
  { valor: 'rascunho', rotulo: 'Rascunho', cor: '#8892B0' },
  { valor: 'publicado', rotulo: 'Publicado', cor: '#3FD08A' },
  { valor: 'arquivado', rotulo: 'Arquivado', cor: '#FF6B6B' },
]

const TIPOS_BLOCO = [
  { valor: 'texto', rotulo: 'Texto', icon: FileText },
  { valor: 'pdf', rotulo: 'PDF', icon: File },
  { valor: 'link', rotulo: 'Link', icon: Link2 },
  { valor: 'canva', rotulo: 'Arte (Canva)', icon: Link2 },
]

const FORM_VAZIO = { titulo: '', descricao: '', sala_id: '', status: 'rascunho' }

export default function ProfessorTrilhas() {
  const [aba, setAba] = useState('trilhas')

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Trilhas e Projetos</h1>
      <p className="mt-2 text-texto/60">Crie trilhas de conteúdo e projetos com correção em porcentagem.</p>

      <div className="mt-6 inline-flex rounded-xl bg-card border p-1">
        <button onClick={() => setAba('trilhas')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'trilhas' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Trilhas
        </button>
        <button onClick={() => setAba('projetos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'projetos' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Projetos
        </button>
      </div>

      {aba === 'trilhas' ? <TrilhasLista /> : <Projetos />}
    </div>
  )
}

function TrilhasLista() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [trilhas, setTrilhas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalNova, setModalNova] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [trilhaAberta, setTrilhaAberta] = useState(null) // trilha sendo gerenciada (blocos)

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
      if (eSalas) throw eSalas
      setSalas(salasData || [])
      const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))

      const { data: trilhasData, error: eTrilhas } = await supabase
        .from('trilhas').select('*').eq('professor_id', perfil.id).order('criada_em', { ascending: false })
      if (eTrilhas) throw eTrilhas

      const trilhaIds = (trilhasData || []).map((t) => t.id)
      let contagemConclusoes = {}
      if (trilhaIds.length > 0) {
        const { data: conclusoesData } = await supabase.from('trilha_conclusoes').select('trilha_id').in('trilha_id', trilhaIds)
        for (const c of conclusoesData || []) contagemConclusoes[c.trilha_id] = (contagemConclusoes[c.trilha_id] || 0) + 1
      }

      setTrilhas((trilhasData || []).map((t) => ({
        ...t,
        salaNome: salaPorId[t.sala_id]?.nome || 'Todas as turmas',
        qtdConclusoes: contagemConclusoes[t.id] || 0,
      })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as trilhas. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  function abrirNova() {
    setForm({ ...FORM_VAZIO, sala_id: salas[0]?.id || '' })
    setModalNova(true)
  }

  async function criarTrilha(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { error } = await supabase.from('trilhas').insert({
        professor_id: perfil.id,
        escola_id: perfil.escola_id,
        sala_id: form.sala_id || null,
        titulo: form.titulo,
        descricao: form.descricao,
        status: form.status,
      })
      if (error) throw error
      setModalNova(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar a trilha.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarStatus(trilha) {
    const novo = trilha.status === 'publicado' ? 'rascunho' : 'publicado'
    try {
      const { error } = await supabase.from('trilhas').update({ status: novo }).eq('id', trilha.id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível alterar o status da trilha.')
    }
  }

  async function excluirTrilha(id) {
    try {
      const { error } = await supabase.from('trilhas').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir a trilha.')
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-end">
        <button
          onClick={abrirNova}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Nova trilha
        </button>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando trilhas…</div>
      ) : trilhas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <BookOpen className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma trilha criada ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trilhas.map((t) => {
            const s = STATUS_TRILHA.find((x) => x.valor === t.status) || STATUS_TRILHA[0]
            return (
              <div key={t.id} className="rounded-2xl bg-card border p-6 flex flex-col transition hover:-translate-y-1 hover:border-azul/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-white text-lg leading-snug">{t.titulo}</div>
                  <span
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: `${s.cor}22`, color: s.cor }}
                  >
                    {s.rotulo}
                  </span>
                </div>
                <div className="text-texto/50 text-sm mt-1">{t.salaNome}</div>
                {t.descricao && <p className="text-texto/60 text-sm mt-3 line-clamp-2">{t.descricao}</p>}

                <div className="mt-4 flex items-center gap-1.5 text-xs text-texto/50">
                  <CheckCircle2 size={13} /> {t.qtdConclusoes} aluno(s) concluíram
                </div>

                <div className="mt-5 pt-4 border-t flex items-center gap-2">
                  <button
                    onClick={() => setTrilhaAberta(t)}
                    className="flex-1 text-sm font-medium px-3 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition"
                  >
                    Gerenciar conteúdo
                  </button>
                  <button
                    onClick={() => alternarStatus(t)}
                    title={t.status === 'publicado' ? 'Voltar para rascunho' : 'Publicar'}
                    className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition"
                  >
                    {t.status === 'publicado' ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => excluirTrilha(t.id)}
                    className="p-2 rounded-lg text-texto/60 hover:text-red-400 hover:bg-red-400/10 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalNova && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalNova(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nova trilha</h2>
              <button onClick={() => setModalNova(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={criarTrilha} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Título</label>
                <input
                  required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Turma</label>
                <select
                  value={form.sala_id} onChange={(e) => setForm({ ...form, sala_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="">Todas as minhas turmas</option>
                  {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Descrição (opcional)</label>
                <textarea
                  value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none"
                />
              </div>
              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Criando…' : 'Criar trilha'}
              </button>
            </form>
          </div>
        </div>
      )}

      {trilhaAberta && (
        <GerenciarBlocosModal trilha={trilhaAberta} onFechar={() => setTrilhaAberta(null)} />
      )}
    </div>
  )
}

function GerenciarBlocosModal({ trilha, onFechar }) {
  const [blocos, setBlocos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tipo, setTipo] = useState('texto')
  const [conteudo, setConteudo] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const { data, error } = await supabase.from('trilha_blocos').select('*').eq('trilha_id', trilha.id).order('ordem')
      if (error) throw error
      setBlocos(data || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar o conteúdo da trilha.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [trilha.id])

  async function adicionar(e) {
    e.preventDefault()
    if (!conteudo.trim()) return
    setSalvando(true)
    try {
      const { error } = await supabase.from('trilha_blocos').insert({
        trilha_id: trilha.id,
        tipo,
        conteudo: tipo === 'texto' ? { texto: conteudo } : { url: conteudo },
        ordem: blocos.length,
      })
      if (error) throw error
      setConteudo('')
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível adicionar o bloco.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id) {
    try {
      const { error } = await supabase.from('trilha_blocos').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível remover o bloco.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onFechar}>
      <div className="w-full max-w-lg rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">{trilha.titulo}</h2>
          <button onClick={onFechar} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
        </div>
        <p className="text-sm text-texto/50 mb-6">Conteúdo da trilha</p>

        {erro && <p className="mb-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

        {carregando ? (
          <div className="text-texto/50 text-sm">Carregando…</div>
        ) : (
          <div className="space-y-2 mb-6">
            {blocos.length === 0 && <p className="text-sm text-texto/45">Nenhum bloco adicionado ainda.</p>}
            {blocos.map((b, i) => {
              const Info = TIPOS_BLOCO.find((t) => t.valor === b.tipo) || TIPOS_BLOCO[0]
              const Icon = Info.icon
              return (
                <div key={b.id} className="rounded-xl bg-card border p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-azul/15 flex items-center justify-center text-azul shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-texto/45">{Info.rotulo} · bloco {i + 1}</div>
                    <div className="text-sm text-white/90 truncate">{b.conteudo?.texto || b.conteudo?.url}</div>
                  </div>
                  <button onClick={() => remover(b.id)} className="p-1.5 rounded-lg text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <form onSubmit={adicionar} className="space-y-3 pt-4 border-t">
          <div className="flex gap-2">
            {TIPOS_BLOCO.map((t) => (
              <button
                key={t.valor} type="button" onClick={() => setTipo(t.valor)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-2 rounded-lg transition ${tipo === t.valor ? 'bg-azul text-white' : 'bg-card text-texto/60 hover:text-white'}`}
              >
                <t.icon size={13} /> {t.rotulo}
              </button>
            ))}
          </div>
          {tipo === 'texto' ? (
            <textarea
              value={conteudo} onChange={(e) => setConteudo(e.target.value)}
              placeholder="Escreva o conteúdo…"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none"
            />
          ) : (
            <input
              value={conteudo} onChange={(e) => setConteudo(e.target.value)}
              placeholder={tipo === 'pdf' ? 'URL do PDF' : 'URL do link ou da arte do Canva'}
              className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
            />
          )}
          <button
            type="submit" disabled={salvando}
            className="w-full py-2.5 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {salvando && <Loader2 size={16} className="animate-spin" />}
            Adicionar bloco
          </button>
        </form>
      </div>
    </div>
  )
}

function Projetos() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [projetos, setProjetos] = useState([])
  const [projetoAtivo, setProjetoAtivo] = useState(null)
  const [entregas, setEntregas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoEntregas, setCarregandoEntregas] = useState(false)
  const [erro, setErro] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [salaId, setSalaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prazo, setPrazo] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
      if (eSalas) throw eSalas
      setSalas(salasData || [])
      const salaIds = (salasData || []).map((s) => s.id)
      const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
      if (salaIds.length === 0) { setProjetos([]); return }

      const { data: projetosData, error: eAt } = await supabase
        .from('atividades').select('*, entregas(id, status, nota)').in('sala_id', salaIds).order('criada_em', { ascending: false })
      if (eAt) throw eAt
      setProjetos((projetosData || []).map((a) => ({
        ...a,
        salaNome: salaPorId[a.sala_id]?.nome || '—',
        pendentes: (a.entregas || []).filter((e) => e.status === 'entregue').length,
        total: (a.entregas || []).length,
      })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os projetos. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  async function abrirProjeto(a) {
    setProjetoAtivo(a)
    setCarregandoEntregas(true)
    try {
      const { data, error } = await supabase.from('entregas').select('*, alunos(nome)').eq('atividade_id', a.id).order('entregue_em', { ascending: false, nullsFirst: false })
      if (error) throw error
      setEntregas((data || []).map((e) => ({ ...e, notaInput: e.nota ?? '', feedbackInput: e.feedback_ia || '' })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as entregas.')
    } finally {
      setCarregandoEntregas(false)
    }
  }

  function abrirNovo() {
    setTitulo(''); setSalaId(salas[0]?.id || ''); setDescricao(''); setPrazo('')
    setModalNovo(true)
  }

  async function criarProjeto(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { error } = await supabase.from('atividades').insert({
        titulo, sala_id: salaId, professor_id: perfil.id, descricao: descricao || null, prazo: prazo || null,
      })
      if (error) throw error
      setModalNovo(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar o projeto.')
    } finally {
      setSalvando(false)
    }
  }

  function atualizarEntregaLocal(id, campo, valor) {
    setEntregas((prev) => prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e)))
  }

  async function salvarCorrecao(entrega) {
    const percentual = entrega.notaInput === '' ? null : Math.max(0, Math.min(100, Number(entrega.notaInput)))
    try {
      const { error } = await supabase.from('entregas').update({
        nota: percentual,
        feedback_ia: entrega.feedbackInput || null,
        status: 'corrigida',
      }).eq('id', entrega.id)
      if (error) throw error
      await abrirProjeto(projetoAtivo)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a correção.')
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-end">
        {salas.length > 0 && (
          <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30">
            <Plus size={18} /> Novo projeto
          </button>
        )}
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-6 text-texto/50">Carregando projetos…</div>
      ) : projetos.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <FolderKanban className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum projeto criado ainda.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-2 max-h-[560px] overflow-y-auto">
            {projetos.map((a) => (
              <button
                key={a.id} onClick={() => abrirProjeto(a)}
                className={`w-full text-left rounded-xl p-4 transition border ${projetoAtivo?.id === a.id ? 'bg-azul text-white border-azul' : 'bg-card text-white/90 hover:border-azul/40'}`}
              >
                <div className="font-medium">{a.titulo}</div>
                <div className={`text-xs mt-0.5 ${projetoAtivo?.id === a.id ? 'text-white/70' : 'text-texto/50'}`}>{a.salaNome}</div>
                <div className={`text-xs mt-1 ${projetoAtivo?.id === a.id ? 'text-white/70' : 'text-texto/45'}`}>{a.pendentes} para corrigir · {a.total} entregas</div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {!projetoAtivo ? (
              <div className="rounded-2xl bg-card border p-12 text-center text-texto/50 h-full flex items-center justify-center">
                Selecione um projeto para ver os envios.
              </div>
            ) : carregandoEntregas ? (
              <div className="text-texto/50">Carregando entregas…</div>
            ) : entregas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-azul/30 bg-card/40 p-8 text-center text-texto/60 text-sm">
                Nenhum aluno enviou esse projeto ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {entregas.map((e) => (
                  <div key={e.id} className="rounded-2xl bg-card border p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white">{e.alunos?.nome}</div>
                      <span className="text-xs text-texto/45 capitalize">{e.status}</span>
                    </div>
                    {e.texto && <p className="text-sm text-texto/70 mt-2 whitespace-pre-wrap">{e.texto}</p>}
                    {e.arquivo_url && <a href={e.arquivo_url} target="_blank" rel="noopener" className="text-sm text-azul hover:underline mt-2 block break-all">{e.arquivo_url}</a>}
                    <div className="mt-3 flex flex-wrap gap-2 items-start">
                      <div className="relative">
                        <input
                          type="number" step="1" min={0} max={100}
                          value={e.notaInput} onChange={(ev) => atualizarEntregaLocal(e.id, 'notaInput', ev.target.value)}
                          placeholder="0-100"
                          className="w-24 pl-3 pr-6 py-2 rounded-lg bg-white/[0.03] border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-texto/40 text-sm pointer-events-none">%</span>
                      </div>
                      <input
                        value={e.feedbackInput} onChange={(ev) => atualizarEntregaLocal(e.id, 'feedbackInput', ev.target.value)}
                        placeholder="Feedback para o aluno"
                        className="flex-1 min-w-[160px] px-3 py-2 rounded-lg bg-white/[0.03] border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition"
                      />
                      <button
                        onClick={() => salvarCorrecao(e)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-azul hover:bg-azul-puro text-white text-sm font-medium transition"
                      >
                        <Save size={14} /> Salvar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalNovo(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Novo projeto</h2>
              <button onClick={() => setModalNovo(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={criarProjeto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Título</label>
                <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Turma</label>
                <select required value={salaId} onChange={(e) => setSalaId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                  <option value="">Selecione…</option>
                  {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Descrição (opcional)</label>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Prazo (opcional)</label>
                <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <button type="submit" disabled={salvando} className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2">
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Criando…' : 'Criar projeto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
