import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BookMarked, Plus, X, Loader2, Pencil, Trash2, School, AlertTriangle } from 'lucide-react'

export default function DiretorMaterias() {
  const { perfil } = useAuth()
  const [materias, setMaterias] = useState([])
  const [professores, setProfessores] = useState([])
  const [salas, setSalas] = useState([])
  const [atribuicoes, setAtribuicoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [modalMateria, setModalMateria] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [nomeMateria, setNomeMateria] = useState('')
  const [salvandoMateria, setSalvandoMateria] = useState(false)

  const [modalAtribuir, setModalAtribuir] = useState(null) // matéria sendo atribuída a uma sala
  const [formAtribuir, setFormAtribuir] = useState({ sala_id: '', professor_id: '' })
  const [salvandoAtribuicao, setSalvandoAtribuicao] = useState(false)

  const [paraExcluir, setParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: materiasData, error: e1 }, { data: professoresData, error: e2 }, { data: salasData, error: e3 }, { data: atribData, error: e4 }] = await Promise.all([
        supabase.from('materias').select('*').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('usuarios').select('id, nome').eq('escola_id', perfil.escola_id).eq('perfil', 'professor').order('nome'),
        supabase.from('salas').select('id, nome').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('sala_materias').select('*').eq('escola_id', perfil.escola_id),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (e4) throw e4

      const profPorId = Object.fromEntries((professoresData || []).map((p) => [p.id, p]))
      const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))

      setMaterias(materiasData || [])
      setProfessores(professoresData || [])
      setSalas(salasData || [])
      setAtribuicoes((atribData || []).map((a) => ({
        ...a,
        salaNome: salaPorId[a.sala_id]?.nome || '—',
        professorNome: profPorId[a.professor_id]?.nome || null,
      })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as matérias. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.escola_id])

  function abrirNovaMateria() { setEditandoId(null); setNomeMateria(''); setModalMateria(true) }
  function abrirEdicaoMateria(m) { setEditandoId(m.id); setNomeMateria(m.nome); setModalMateria(true) }

  async function salvarMateria(e) {
    e.preventDefault()
    setSalvandoMateria(true)
    setErro('')
    try {
      if (editandoId) {
        const { error } = await supabase.from('materias').update({ nome: nomeMateria.trim() }).eq('id', editandoId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('materias').insert({ nome: nomeMateria.trim(), escola_id: perfil.escola_id })
        if (error) throw error
      }
      setModalMateria(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a matéria.')
    } finally {
      setSalvandoMateria(false)
    }
  }

  async function excluirMateria() {
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

  function abrirAtribuir(materia) {
    setModalAtribuir(materia)
    setFormAtribuir({ sala_id: salas[0]?.id || '', professor_id: '' })
  }

  async function salvarAtribuicao(e) {
    e.preventDefault()
    setSalvandoAtribuicao(true)
    setErro('')
    try {
      const { error } = await supabase.from('sala_materias').insert({
        escola_id: perfil.escola_id,
        sala_id: formAtribuir.sala_id,
        materia_id: modalAtribuir.id,
        professor_id: formAtribuir.professor_id || null,
      })
      if (error) {
        if (error.code === '23505') throw new Error('Essa matéria já está atribuída a essa sala.')
        throw error
      }
      setModalAtribuir(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Não foi possível atribuir a matéria a essa sala.')
    } finally {
      setSalvandoAtribuicao(false)
    }
  }

  async function removerAtribuicao(id) {
    try {
      const { error } = await supabase.from('sala_materias').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível remover essa atribuição.')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Matérias e Professores</h1>
          <p className="mt-2 text-texto/60">Cadastre as matérias e atribua cada uma a uma sala com o professor responsável. Ex: Matemática no 2A, com o professor João.</p>
        </div>
        <button
          onClick={abrirNovaMateria}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Nova matéria
        </button>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {!carregando && salas.length === 0 && (
        <div className="mt-6 rounded-2xl bg-[#F5C451]/10 border border-[#F5C451]/25 p-5 text-sm text-texto/70">
          Cadastre salas em "Salas" antes de atribuir matérias, pra poder escolher em qual turma cada uma é lecionada.
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
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {materias.map((m) => {
            const salasDaMateria = atribuicoes.filter((a) => a.materia_id === m.id)
            return (
              <div key={m.id} className="rounded-2xl bg-card border p-6">
                <div className="flex items-start justify-between">
                  <div className="font-bold text-white text-lg">{m.nome}</div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => abrirEdicaoMateria(m)} className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setParaExcluir(m)} className="p-2 rounded-lg text-texto/60 hover:text-red-400 hover:bg-red-400/10 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {salasDaMateria.length === 0 ? (
                    <p className="text-sm text-texto/40">Ainda não atribuída a nenhuma sala.</p>
                  ) : (
                    salasDaMateria.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 text-sm bg-white/[0.03] rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <School size={13} className="text-texto/40 shrink-0" />
                          <span className="text-white font-medium">{a.salaNome}</span>
                          <span className="text-texto/40">—</span>
                          <span className="text-texto/70 truncate">{a.professorNome || 'Sem professor definido'}</span>
                        </div>
                        <button onClick={() => removerAtribuicao(a.id)} className="shrink-0 text-texto/40 hover:text-red-400 transition">
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {salas.length > 0 && (
                  <button
                    onClick={() => abrirAtribuir(m)}
                    className="mt-4 flex items-center gap-1.5 text-xs text-azul hover:text-white transition"
                  >
                    <Plus size={13} /> Atribuir a uma sala
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalMateria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalMateria(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editandoId ? 'Editar matéria' : 'Nova matéria'}</h2>
              <button onClick={() => setModalMateria(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={salvarMateria} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome da matéria</label>
                <input
                  required value={nomeMateria} onChange={(e) => setNomeMateria(e.target.value)}
                  placeholder="Ex: Matemática"
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <button
                type="submit" disabled={salvandoMateria}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvandoMateria && <Loader2 size={18} className="animate-spin" />}
                {salvandoMateria ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Criar matéria'}
              </button>
            </form>
          </div>
        </div>
      )}

      {modalAtribuir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAtribuir(null)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Atribuir "{modalAtribuir.nome}"</h2>
              <button onClick={() => setModalAtribuir(null)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={salvarAtribuicao} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Sala</label>
                <select
                  value={formAtribuir.sala_id} onChange={(e) => setFormAtribuir({ ...formAtribuir, sala_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Professor responsável</label>
                <select
                  value={formAtribuir.professor_id} onChange={(e) => setFormAtribuir({ ...formAtribuir, professor_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="">Sem professor definido ainda</option>
                  {professores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <button
                type="submit" disabled={salvandoAtribuicao}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvandoAtribuicao && <Loader2 size={18} className="animate-spin" />}
                {salvandoAtribuicao ? 'Atribuindo…' : 'Atribuir'}
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
                  As atribuições a salas e as avaliações de aprendizado já lançadas nessa matéria também somem. Essa ação é permanente.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={() => setParaExcluir(null)} className="flex-1 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition">
                Cancelar
              </button>
              <button
                type="button" onClick={excluirMateria} disabled={excluindo}
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
