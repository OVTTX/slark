import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { School, Plus, X, Loader2, Pencil, Users, GraduationCap } from 'lucide-react'
import ConvidarAlunoModal from '../../components/ConvidarAlunoModal'

const FORM_VAZIO = { nome: '', serie: '', professor_id: '' }

export default function DiretorSalas() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [professores, setProfessores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: salasData, error: e1 }, { data: professoresData, error: e2 }, { data: alunosData, error: e3 }] = await Promise.all([
        supabase.from('salas').select('*').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('usuarios').select('id, nome').eq('escola_id', perfil.escola_id).eq('perfil', 'professor'),
        supabase.from('alunos').select('sala_id').eq('escola_id', perfil.escola_id),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      const contagem = {}
      for (const a of alunosData || []) contagem[a.sala_id] = (contagem[a.sala_id] || 0) + 1
      const profPorId = Object.fromEntries((professoresData || []).map((p) => [p.id, p]))

      setSalas((salasData || []).map((s) => ({ ...s, professorNome: profPorId[s.professor_id]?.nome, qtdAlunos: contagem[s.id] || 0 })))
      setProfessores(professoresData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as salas. Confira a conexão com o Supabase.')
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

  function abrirEdicao(s) {
    setEditandoId(s.id)
    setForm({ nome: s.nome || '', serie: s.serie || '', professor_id: s.professor_id || '' })
    setModalAberto(true)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const payload = {
        nome: form.nome,
        serie: form.serie,
        professor_id: form.professor_id || null,
      }
      if (editandoId) {
        const { error } = await supabase.from('salas').update(payload).eq('id', editandoId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('salas').insert({ ...payload, escola_id: perfil.escola_id })
        if (error) throw error
      }
      setModalAberto(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a sala.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Salas</h1>
          <p className="mt-2 text-texto/60">Gerencie as salas da sua escola.</p>
        </div>
        <div className="flex items-center gap-3">
          <ConvidarAlunoModal salas={salas} onConvidado={carregar} />
          <button
            onClick={abrirNova}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
          >
            <Plus size={18} /> Nova sala
          </button>
        </div>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando salas…</div>
      ) : salas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <School className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma sala cadastrada ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {salas.map((s) => (
            <div key={s.id} className="rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-white text-lg">{s.nome}</div>
                  {s.serie && <div className="text-texto/50 text-sm">{s.serie}</div>}
                </div>
                <button onClick={() => abrirEdicao(s)} className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition">
                  <Pencil size={15} />
                </button>
              </div>
              <div className="mt-4 space-y-2 text-sm text-texto/70">
                <div className="flex items-center gap-2"><GraduationCap size={14} className="text-texto/40" /> {s.professorNome || 'Sem professor'}</div>
                <div className="flex items-center gap-2"><Users size={14} className="text-texto/40" /> {s.qtdAlunos} alunos</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editandoId ? 'Editar sala' : 'Nova sala'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome da sala</label>
                <input
                  required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: 2A"
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Série</label>
                <input
                  value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })}
                  placeholder="Ex: 2º Ano"
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Professor responsável</label>
                <select
                  value={form.professor_id} onChange={(e) => setForm({ ...form, professor_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="">Sem professor</option>
                  {professores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Criar sala'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
