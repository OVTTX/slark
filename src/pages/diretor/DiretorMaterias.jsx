import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BookMarked, Plus, X, Loader2, Pencil, Trash2, Users, AlertTriangle } from 'lucide-react'

const FORM_VAZIO = { nome: '', professor_ids: [] }

export default function DiretorMaterias() {
  const { perfil } = useAuth()
  const [materias, setMaterias] = useState([])
  const [professores, setProfessores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: materiasData, error: e1 }, { data: professoresData, error: e2 }, { data: vinculosData, error: e3 }] = await Promise.all([
        supabase.from('materias').select('*').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('usuarios').select('id, nome').eq('escola_id', perfil.escola_id).eq('perfil', 'professor').order('nome'),
        supabase.from('materia_professores').select('materia_id, professor_id'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      const profPorId = Object.fromEntries((professoresData || []).map((p) => [p.id, p]))
      setMaterias((materiasData || []).map((m) => ({
        ...m,
        professores: (vinculosData || []).filter((v) => v.materia_id === m.id).map((v) => profPorId[v.professor_id]).filter(Boolean),
      })))
      setProfessores(professoresData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as matérias. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.escola_id])

  function abrirNova() {
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setModalAberto(true)
  }

  function abrirEdicao(m) {
    setEditandoId(m.id)
    setForm({ nome: m.nome, professor_ids: m.professores.map((p) => p.id) })
    setModalAberto(true)
  }

  function alternarProfessor(id) {
    setForm((f) => ({
      ...f,
      professor_ids: f.professor_ids.includes(id) ? f.professor_ids.filter((p) => p !== id) : [...f.professor_ids, id],
    }))
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      let materiaId = editandoId
      if (editandoId) {
        const { error } = await supabase.from('materias').update({ nome: form.nome.trim() }).eq('id', editandoId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('materias').insert({ nome: form.nome.trim(), escola_id: perfil.escola_id }).select('id').single()
        if (error) throw error
        materiaId = data.id
      }

      // Resincroniza os vínculos matéria <-> professor: remove todos e recria conforme selecionado.
      const { error: erroDelete } = await supabase.from('materia_professores').delete().eq('materia_id', materiaId)
      if (erroDelete) throw erroDelete
      if (form.professor_ids.length > 0) {
        const { error: erroInsert } = await supabase.from('materia_professores').insert(
          form.professor_ids.map((professor_id) => ({ materia_id: materiaId, professor_id })),
        )
        if (erroInsert) throw erroInsert
      }

      setModalAberto(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a matéria.')
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return
    setExcluindo(true)
    try {
      const { error } = await supabase.from('materias').delete().eq('id', paraExcluir.id)
      if (error) throw error
      setParaExcluir(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir a matéria.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Matérias e Professores</h1>
          <p className="mt-2 text-texto/60">Cadastre as matérias da sua escola e vincule os professores responsáveis.</p>
        </div>
        {professores.length > 0 && (
          <button
            onClick={abrirNova}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
          >
            <Plus size={18} /> Nova matéria
          </button>
        )}
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {!carregando && professores.length === 0 && (
        <div className="mt-6 rounded-2xl bg-[#F5C451]/10 border border-[#F5C451]/25 p-5 text-sm text-texto/70">
          Cadastre professores em "Professores" antes de criar matérias, pra poder vincular quem leciona cada uma.
        </div>
      )}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando matérias…</div>
      ) : materias.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <BookMarked className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma matéria cadastrada ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {materias.map((m) => (
            <div key={m.id} className="rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40">
              <div className="flex items-start justify-between">
                <div className="font-bold text-white text-lg">{m.nome}</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => abrirEdicao(m)} className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setParaExcluir(m)} className="p-2 rounded-lg text-texto/60 hover:text-red-400 hover:bg-red-400/10 transition">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 text-sm text-texto/70">
                <Users size={14} className="text-texto/40 mt-0.5 shrink-0" />
                {m.professores.length === 0 ? (
                  <span className="text-texto/40">Nenhum professor vinculado</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {m.professores.map((p) => (
                      <span key={p.id} className="text-xs px-2 py-1 rounded-full bg-azul/15 text-azul">{p.nome}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editandoId ? 'Editar matéria' : 'Nova matéria'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome da matéria</label>
                <input
                  required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Matemática"
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Professores responsáveis</label>
                {professores.length === 0 ? (
                  <p className="text-sm text-texto/45">Nenhum professor cadastrado ainda.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-xl border border-azul/10 p-2">
                    {professores.map((p) => (
                      <label key={p.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition">
                        <input
                          type="checkbox" checked={form.professor_ids.includes(p.id)} onChange={() => alternarProfessor(p.id)}
                          className="w-4 h-4 rounded accent-azul"
                        />
                        <span className="text-sm text-white/90">{p.nome}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Criar matéria'}
              </button>
            </form>
          </div>
        </div>
      )}

      {paraExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setParaExcluir(null)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border border-red-400/20 p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-11 h-11 rounded-full bg-red-400/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Excluir "{paraExcluir.nome}"?</h2>
                <p className="mt-1 text-sm text-texto/60 leading-relaxed">
                  As avaliações de aprendizado já lançadas nessa matéria também somem. Essa ação é permanente.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={() => setParaExcluir(null)} className="flex-1 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition">
                Cancelar
              </button>
              <button
                type="button" onClick={confirmarExclusao} disabled={excluindo}
                className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {excluindo && <Loader2 size={16} className="animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
