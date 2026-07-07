import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ClipboardList, Plus, X, Loader2, Save } from 'lucide-react'

export default function ProfessorNotas() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [atividades, setAtividades] = useState([])
  const [atividadeAtiva, setAtividadeAtiva] = useState(null)
  const [entregas, setEntregas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoEntregas, setCarregandoEntregas] = useState(false)
  const [erro, setErro] = useState('')
  const [modalNova, setModalNova] = useState(false)
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
      if (salaIds.length === 0) { setAtividades([]); return }

      const { data: atividadesData, error: eAt } = await supabase
        .from('atividades').select('*, entregas(id, status, nota)').in('sala_id', salaIds).order('criada_em', { ascending: false })
      if (eAt) throw eAt
      setAtividades((atividadesData || []).map((a) => ({
        ...a,
        salaNome: salaPorId[a.sala_id]?.nome || '—',
        pendentes: (a.entregas || []).filter((e) => e.status === 'entregue').length,
        total: (a.entregas || []).length,
      })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as atividades. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  async function abrirAtividade(a) {
    setAtividadeAtiva(a)
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

  function abrirNova() {
    setTitulo(''); setSalaId(salas[0]?.id || ''); setDescricao(''); setPrazo('')
    setModalNova(true)
  }

  async function criarAtividade(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { error } = await supabase.from('atividades').insert({
        titulo, sala_id: salaId, professor_id: perfil.id, descricao: descricao || null, prazo: prazo || null,
      })
      if (error) throw error
      setModalNova(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar a atividade.')
    } finally {
      setSalvando(false)
    }
  }

  function atualizarEntregaLocal(id, campo, valor) {
    setEntregas((prev) => prev.map((e) => (e.id === id ? { ...e, [campo]: valor } : e)))
  }

  async function salvarNota(entrega) {
    try {
      const { error } = await supabase.from('entregas').update({
        nota: entrega.notaInput === '' ? null : Number(entrega.notaInput),
        feedback_ia: entrega.feedbackInput || null,
        status: 'corrigida',
      }).eq('id', entrega.id)
      if (error) throw error
      await abrirAtividade(atividadeAtiva)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a nota.')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Notas</h1>
          <p className="mt-2 text-texto/60">Crie atividades e corrija as entregas dos alunos.</p>
        </div>
        {salas.length > 0 && (
          <button onClick={abrirNova} className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30">
            <Plus size={18} /> Nova atividade
          </button>
        )}
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando atividades…</div>
      ) : atividades.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <ClipboardList className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma atividade criada ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-2 max-h-[560px] overflow-y-auto">
            {atividades.map((a) => (
              <button
                key={a.id} onClick={() => abrirAtividade(a)}
                className={`w-full text-left rounded-xl p-4 transition border ${atividadeAtiva?.id === a.id ? 'bg-azul text-white border-azul' : 'bg-card text-white/90 hover:border-azul/40'}`}
              >
                <div className="font-medium">{a.titulo}</div>
                <div className={`text-xs mt-0.5 ${atividadeAtiva?.id === a.id ? 'text-white/70' : 'text-texto/50'}`}>{a.salaNome}</div>
                <div className={`text-xs mt-1 ${atividadeAtiva?.id === a.id ? 'text-white/70' : 'text-texto/45'}`}>{a.pendentes} para corrigir · {a.total} entregas</div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {!atividadeAtiva ? (
              <div className="rounded-2xl bg-card border p-12 text-center text-texto/50 h-full flex items-center justify-center">
                Selecione uma atividade para ver as entregas.
              </div>
            ) : carregandoEntregas ? (
              <div className="text-texto/50">Carregando entregas…</div>
            ) : entregas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-azul/30 bg-card/40 p-8 text-center text-texto/60 text-sm">
                Nenhum aluno entregou essa atividade ainda.
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
                      <input
                        type="number" step="0.1" min={0} max={10}
                        value={e.notaInput} onChange={(ev) => atualizarEntregaLocal(e.id, 'notaInput', ev.target.value)}
                        placeholder="Nota"
                        className="w-24 px-3 py-2 rounded-lg bg-white/[0.03] border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition"
                      />
                      <input
                        value={e.feedbackInput} onChange={(ev) => atualizarEntregaLocal(e.id, 'feedbackInput', ev.target.value)}
                        placeholder="Feedback para o aluno"
                        className="flex-1 min-w-[160px] px-3 py-2 rounded-lg bg-white/[0.03] border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition"
                      />
                      <button
                        onClick={() => salvarNota(e)}
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

      {modalNova && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalNova(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nova atividade</h2>
              <button onClick={() => setModalNova(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={criarAtividade} className="space-y-4">
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
                {salvando ? 'Criando…' : 'Criar atividade'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
