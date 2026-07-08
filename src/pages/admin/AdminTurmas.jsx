import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  School, Plus, X, Loader2, Pencil, Trash2, Search, ChevronLeft, ChevronRight, AlertTriangle, Users,
} from 'lucide-react'

const POR_PAGINA = 10
const FORM_VAZIO = { nome: '', serie: '', escola_id: '', professor_id: '' }

export default function AdminTurmas() {
  const [turmas, setTurmas] = useState([])
  const [escolas, setEscolas] = useState([])
  const [professores, setProfessores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const [{ data: turmasData, error: e1 }, { data: escolasData, error: e2 }, { data: professoresData, error: e3 }, { data: alunosData, error: e4 }] =
        await Promise.all([
          supabase.from('salas').select('*').order('nome'),
          supabase.from('escolas').select('id, nome').order('nome'),
          supabase.from('usuarios').select('id, nome, escola_id').eq('perfil', 'professor').order('nome'),
          supabase.from('alunos').select('sala_id'),
        ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (e4) throw e4

      const escolaPorId = Object.fromEntries((escolasData || []).map((e) => [e.id, e]))
      const professorPorId = Object.fromEntries((professoresData || []).map((p) => [p.id, p]))
      const contagemAlunos = {}
      for (const a of alunosData || []) {
        if (!a.sala_id) continue
        contagemAlunos[a.sala_id] = (contagemAlunos[a.sala_id] || 0) + 1
      }

      setTurmas((turmasData || []).map((t) => ({
        ...t,
        escolaNome: escolaPorId[t.escola_id]?.nome || '—',
        professorNome: professorPorId[t.professor_id]?.nome || null,
        qtdAlunos: contagemAlunos[t.id] || 0,
      })))
      setEscolas(escolasData || [])
      setProfessores(professoresData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as turmas. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const turmasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return turmas
    return turmas.filter((t) =>
      t.nome.toLowerCase().includes(termo) ||
      (t.serie || '').toLowerCase().includes(termo) ||
      t.escolaNome.toLowerCase().includes(termo),
    )
  }, [turmas, busca])

  const totalPaginas = Math.max(1, Math.ceil(turmasFiltradas.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const turmasDaPagina = turmasFiltradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function abrirNova() {
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setModalAberto(true)
  }

  function abrirEdicao(t) {
    setEditandoId(t.id)
    setForm({ nome: t.nome, serie: t.serie || '', escola_id: t.escola_id || '', professor_id: t.professor_id || '' })
    setModalAberto(true)
  }

  const professoresDaEscola = useMemo(
    () => professores.filter((p) => p.escola_id === form.escola_id),
    [professores, form.escola_id],
  )

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        nome: form.nome.trim(),
        serie: form.serie.trim() || null,
        escola_id: form.escola_id,
        professor_id: form.professor_id || null,
      }
      if (editandoId) {
        const { error } = await supabase.from('salas').update(payload).eq('id', editandoId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('salas').insert(payload)
        if (error) throw error
      }
      setModalAberto(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a turma.')
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return
    setExcluindo(true)
    setErro('')
    try {
      const { error } = await supabase.from('salas').delete().eq('id', paraExcluir.id)
      if (error) throw error
      setParaExcluir(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir a turma.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <School className="text-azul" size={28} />
            <h1 className="text-4xl font-bold text-white tracking-tight">Turmas</h1>
          </div>
          <p className="mt-2 text-texto/60">Todas as turmas da rede, em qualquer escola.</p>
        </div>
        <button
          onClick={abrirNova}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Nova turma
        </button>
      </div>

      <div className="mt-6 relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto/40" />
        <input
          value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1) }}
          placeholder="Buscar por turma, série ou escola…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
        />
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando turmas…</div>
      ) : turmasFiltradas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <School className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            {turmas.length === 0 ? 'Nenhuma turma cadastrada ainda.' : 'Nenhuma turma encontrada com essa busca.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-texto/50 border-b">
                  <th className="px-6 py-4 font-medium">Turma</th>
                  <th className="px-6 py-4 font-medium">Escola</th>
                  <th className="px-6 py-4 font-medium">Professor</th>
                  <th className="px-6 py-4 font-medium">Alunos</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {turmasDaPagina.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{t.nome}</div>
                      {t.serie && <div className="text-xs text-texto/45 mt-0.5">{t.serie}</div>}
                    </td>
                    <td className="px-6 py-4 text-texto/70">{t.escolaNome}</td>
                    <td className="px-6 py-4 text-texto/70">{t.professorNome || <span className="text-texto/40 text-xs">Sem professor</span>}</td>
                    <td className="px-6 py-4 text-texto/70">
                      <div className="flex items-center gap-1.5"><Users size={13} className="text-texto/40" /> {t.qtdAlunos}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => abrirEdicao(t)} title="Editar" className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setParaExcluir(t)} title="Excluir turma" className="p-2 rounded-lg text-texto/60 hover:text-red-400 hover:bg-red-400/10 transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-texto/60">
              <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition">
                <ChevronLeft size={16} />
              </button>
              Página {paginaAtual} de {totalPaginas}
              <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editandoId ? 'Editar turma' : 'Nova turma'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>

            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome da turma</label>
                <input
                  required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Série</label>
                <input
                  value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })}
                  placeholder="Ex: 9º ano"
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Escola</label>
                <select
                  required value={form.escola_id}
                  onChange={(e) => setForm({ ...form, escola_id: e.target.value, professor_id: '' })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="" disabled>Selecione…</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Professor (opcional)</label>
                <select
                  value={form.professor_id} onChange={(e) => setForm({ ...form, professor_id: e.target.value })}
                  disabled={!form.escola_id}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition disabled:opacity-50"
                >
                  <option value="">Sem professor</option>
                  {professoresDaEscola.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                {form.escola_id && professoresDaEscola.length === 0 && (
                  <p className="mt-1.5 text-xs text-texto/45">Essa escola ainda não tem professores cadastrados.</p>
                )}
              </div>

              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Criar turma'}
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
                <p className="mt-1 text-sm text-texto/60 leading-relaxed">Essa ação é permanente.</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-red-400/5 border border-red-400/15 p-4 text-sm text-texto/70 leading-relaxed">
              São excluídas junto: atividades e entregas, gabaritos e times dessa turma.
              <p className="mt-2 text-texto/50">
                {paraExcluir.qtdAlunos > 0 && `${paraExcluir.qtdAlunos} aluno(s) ficam sem turma (não são excluídos). `}
                Trilhas e planos de aula ligados a ela ficam sem turma vinculada.
              </p>
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
