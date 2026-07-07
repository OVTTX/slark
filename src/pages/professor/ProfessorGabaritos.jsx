import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ListChecks, Plus, X, Loader2, Trash2 } from 'lucide-react'

export default function ProfessorGabaritos() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [gabaritos, setGabaritos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [materia, setMateria] = useState('')
  const [salaId, setSalaId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [gabaritoAberto, setGabaritoAberto] = useState(null)

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
      if (salaIds.length === 0) { setGabaritos([]); return }

      const { data: gabaritosData, error: eGab } = await supabase
        .from('gabaritos').select('*, gabarito_questoes(id)').in('sala_id', salaIds).order('criado_em', { ascending: false })
      if (eGab) throw eGab
      setGabaritos((gabaritosData || []).map((g) => ({ ...g, salaNome: salaPorId[g.sala_id]?.nome || '—', qtdQuestoes: (g.gabarito_questoes || []).length })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os gabaritos. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  function abrirNovo() {
    setTitulo('')
    setMateria('')
    setSalaId(salas[0]?.id || '')
    setModalNovo(true)
  }

  async function criar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { error } = await supabase.from('gabaritos').insert({ titulo, materia, sala_id: salaId, professor_id: perfil.id })
      if (error) throw error
      setModalNovo(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar o gabarito.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    try {
      const { error } = await supabase.from('gabaritos').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir o gabarito.')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Gabaritos</h1>
          <p className="mt-2 text-texto/60">Cadastre respostas corretas e o passo a passo de cada questão.</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Novo gabarito
        </button>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando gabaritos…</div>
      ) : gabaritos.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <ListChecks className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum gabarito criado ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {gabaritos.map((g) => (
            <div key={g.id} className="rounded-2xl bg-card border p-6 flex flex-col transition hover:-translate-y-1 hover:border-azul/40">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-white text-lg leading-snug">{g.titulo}</div>
                <button onClick={() => excluir(g.id)} className="p-1.5 rounded-lg text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="text-texto/50 text-sm mt-1">{g.salaNome}{g.materia ? ` · ${g.materia}` : ''}</div>
              <div className="mt-4 text-xs text-texto/50">{g.qtdQuestoes} questão(ões)</div>
              <button
                onClick={() => setGabaritoAberto(g)}
                className="mt-5 pt-4 border-t text-sm font-medium text-white/90 hover:text-white transition"
              >
                Gerenciar questões
              </button>
            </div>
          ))}
        </div>
      )}

      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalNovo(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Novo gabarito</h2>
              <button onClick={() => setModalNovo(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={criar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Título</label>
                <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Matéria</label>
                <input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ex: Matemática" className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Turma</label>
                <select required value={salaId} onChange={(e) => setSalaId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition">
                  <option value="">Selecione…</option>
                  {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <button type="submit" disabled={salvando} className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2">
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Criando…' : 'Criar gabarito'}
              </button>
            </form>
          </div>
        </div>
      )}

      {gabaritoAberto && <GerenciarQuestoesModal gabarito={gabaritoAberto} onFechar={() => { setGabaritoAberto(null); carregar() }} />}
    </div>
  )
}

function GerenciarQuestoesModal({ gabarito, onFechar }) {
  const [questoes, setQuestoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [numero, setNumero] = useState('')
  const [enunciado, setEnunciado] = useState('')
  const [resposta, setResposta] = useState('')
  const [passoAPasso, setPassoAPasso] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const { data, error } = await supabase.from('gabarito_questoes').select('*').eq('gabarito_id', gabarito.id).order('numero')
      if (error) throw error
      setQuestoes(data || [])
      setNumero(String((data?.length || 0) + 1))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as questões.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [gabarito.id])

  async function adicionar(e) {
    e.preventDefault()
    if (!resposta.trim()) return
    setSalvando(true)
    try {
      const { error } = await supabase.from('gabarito_questoes').insert({
        gabarito_id: gabarito.id,
        numero: Number(numero) || questoes.length + 1,
        enunciado: enunciado.trim() || null,
        resposta_correta: resposta.trim(),
        passo_a_passo_ia: passoAPasso.trim() || null,
        ordem: questoes.length,
      })
      if (error) throw error
      setEnunciado(''); setResposta(''); setPassoAPasso('')
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível adicionar a questão.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(id) {
    try {
      const { error } = await supabase.from('gabarito_questoes').delete().eq('id', id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível remover a questão.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onFechar}>
      <div className="w-full max-w-lg rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">{gabarito.titulo}</h2>
          <button onClick={onFechar} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
        </div>
        <p className="text-sm text-texto/50 mb-6">Questões do gabarito</p>

        {erro && <p className="mb-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

        {carregando ? (
          <div className="text-texto/50 text-sm">Carregando…</div>
        ) : (
          <div className="space-y-2 mb-6">
            {questoes.length === 0 && <p className="text-sm text-texto/45">Nenhuma questão adicionada ainda.</p>}
            {questoes.map((q) => (
              <div key={q.id} className="rounded-xl bg-card border p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-texto/45">Questão {q.numero}</div>
                  <button onClick={() => remover(q.id)} className="text-texto/40 hover:text-red-400 transition"><Trash2 size={13} /></button>
                </div>
                {q.enunciado && <p className="text-sm text-white/85 mt-1">{q.enunciado}</p>}
                <div className="text-sm text-[#3FD08A] mt-1 font-medium">Resposta: {q.resposta_correta}</div>
                {q.passo_a_passo_ia && <p className="text-xs text-texto/50 mt-1">{q.passo_a_passo_ia}</p>}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={adicionar} className="space-y-3 pt-4 border-t">
          <div className="flex gap-2">
            <input
              type="number" value={numero} onChange={(e) => setNumero(e.target.value)}
              placeholder="Nº" className="w-20 px-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
            />
            <input
              value={resposta} onChange={(e) => setResposta(e.target.value)} required
              placeholder="Resposta correta" className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
            />
          </div>
          <textarea
            value={enunciado} onChange={(e) => setEnunciado(e.target.value)}
            placeholder="Enunciado (opcional)" rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none"
          />
          <textarea
            value={passoAPasso} onChange={(e) => setPassoAPasso(e.target.value)}
            placeholder="Passo a passo para o aluno entender (opcional)" rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none"
          />
          <button
            type="submit" disabled={salvando}
            className="w-full py-2.5 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {salvando && <Loader2 size={16} className="animate-spin" />}
            Adicionar questão
          </button>
        </form>
      </div>
    </div>
  )
}
