import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Sparkles, Plus, X, Loader2, Trash2, Wand2 } from 'lucide-react'

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

export default function ProfessorPlanosIA() {
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
    setModalAberto(true)
  }

  function abrirEdicao(p) {
    setEditandoId(p.id)
    setTitulo(p.titulo)
    setSalaId(p.sala_id || '')
    setConteudo(p.conteudo?.texto || '')
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Planos de Aula</h1>
          <p className="mt-2 text-texto/60">Organize seus planejamentos por turma, com uma estrutura sugerida pronta.</p>
        </div>
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
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
