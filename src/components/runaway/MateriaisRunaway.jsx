import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePlano } from '../../lib/usePlano'
import { BookMarked, Lock, Plus, X, Loader2, Trash2, ExternalLink, Sparkles } from 'lucide-react'

const FORM_VAZIO = { titulo: '', descricao: '', url: '', materia_id: '' }

// Lista o material das apostilas Runaway. Só aparece de verdade pra escolas no plano Pro
// (RLS já bloqueia no banco — aqui é só a experiência de upsell pra quem tá no Base).
export default function MateriaisRunaway({ gerencia = false }) {
  const { perfil } = useAuth()
  const { plano, ehPro, carregando: carregandoPlano } = usePlano()
  const [materiais, setMateriais] = useState([])
  const [materias, setMaterias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    if (!perfil?.escola_id || !ehPro) { setCarregando(false); return }
    setCarregando(true)
    setErro('')
    try {
      const [{ data: matData, error: e1 }, { data: materiasData, error: e2 }] = await Promise.all([
        supabase.from('materiais_runaway').select('*').eq('escola_id', perfil.escola_id).order('criado_em', { ascending: false }),
        supabase.from('materias').select('id, nome').eq('escola_id', perfil.escola_id).order('nome'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      const materiaPorId = Object.fromEntries((materiasData || []).map((m) => [m.id, m.nome]))
      setMateriais((matData || []).map((m) => ({ ...m, materiaNome: materiaPorId[m.materia_id] || null })))
      setMaterias(materiasData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os materiais Runaway. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { if (!carregandoPlano) carregar() }, [perfil?.escola_id, ehPro, carregandoPlano])

  function abrirNovo() { setForm(FORM_VAZIO); setModalAberto(true) }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const { error } = await supabase.from('materiais_runaway').insert({
        escola_id: perfil.escola_id,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        url: form.url.trim() || null,
        materia_id: form.materia_id || null,
        criado_por: perfil.id,
      })
      if (error) throw error
      setModalAberto(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar o material.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    try {
      const { error } = await supabase.from('materiais_runaway').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir o material.')
    }
  }

  if (carregandoPlano) return <div className="mt-10 text-texto/50">Carregando…</div>

  if (!ehPro) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
        <Lock className="mx-auto text-azul/60" size={40} />
        <h2 className="mt-4 text-xl font-bold text-white">Disponível no Slark Pro</h2>
        <p className="mt-2 text-texto/60 max-w-md mx-auto leading-relaxed">
          O material das apostilas Runaway é liberado no plano Slark Pro. Sua escola está no plano {plano === 'base' ? 'Base' : plano} hoje.
        </p>
        {gerencia && <p className="mt-3 text-xs text-texto/40">Fale com a equipe Slark pra fazer upgrade.</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-[#3FD08A] text-sm font-semibold bg-[#3FD08A]/10 px-3 py-1.5 rounded-full">
          <Sparkles size={14} /> Slark Pro ativo
        </div>
        {gerencia && (
          <button onClick={abrirNovo} className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30">
            <Plus size={18} /> Novo material
          </button>
        )}
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando materiais…</div>
      ) : materiais.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <BookMarked className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            {gerencia ? 'Nenhum material Runaway cadastrado ainda.' : 'Nenhum material Runaway disponível ainda.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {materiais.map((m) => (
            <div key={m.id} className="rounded-2xl bg-card border p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-white">{m.titulo}</div>
                {gerencia && (
                  <button onClick={() => excluir(m.id)} className="shrink-0 p-1.5 rounded-lg text-texto/50 hover:text-red-400 hover:bg-red-400/10 transition">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {m.materiaNome && <span className="mt-2 inline-block text-xs px-2 py-1 rounded-full bg-azul/15 text-azul">{m.materiaNome}</span>}
              {m.descricao && <p className="mt-3 text-sm text-texto/70 leading-relaxed">{m.descricao}</p>}
              {m.url && (
                <a href={m.url} target="_blank" rel="noopener" className="mt-3 flex items-center gap-1.5 text-sm text-azul hover:underline">
                  <ExternalLink size={13} /> Abrir material
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Novo material Runaway</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Título</label>
                <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Matéria (opcional)</label>
                <select value={form.materia_id} onChange={(e) => setForm({ ...form, materia_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                  <option value="">Sem matéria definida</option>
                  {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Descrição (opcional)</label>
                <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Link do material (opcional)</label>
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <button type="submit" disabled={salvando} className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2">
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Salvando…' : 'Adicionar material'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
