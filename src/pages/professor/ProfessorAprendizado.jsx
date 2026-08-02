import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { GaugeCircle, Loader2, Check, School, BookMarked } from 'lucide-react'

const HOJE = () => new Date().toISOString().slice(0, 10)

function corDoValor(v) {
  if (v >= 70) return '#3FD08A'
  if (v >= 40) return '#F5C451'
  return '#FF6B6B'
}

export default function ProfessorAprendizado() {
  const { perfil } = useAuth()
  const [atribuicoes, setAtribuicoes] = useState([]) // linhas de sala_materias com sala+matéria já resolvidas
  const [salaId, setSalaId] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [alunos, setAlunos] = useState([])
  const [valores, setValores] = useState({}) // aluno_id -> valor (0-100)
  const [salvos, setSalvos] = useState({}) // aluno_id -> true (já tem lançamento hoje)
  const [carregando, setCarregando] = useState(true)
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)
  const [salvandoId, setSalvandoId] = useState(null)
  const [confirmadoId, setConfirmadoId] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregarBase() {
      setCarregando(true)
      setErro('')
      try {
        const { data, error } = await supabase
          .from('sala_materias')
          .select('sala_id, materia_id, salas(id, nome), materias(id, nome)')
          .eq('professor_id', perfil.id)
        if (error) throw error
        const linhas = (data || []).filter((r) => r.salas && r.materias)
        setAtribuicoes(linhas)
        if (linhas[0]) { setSalaId(linhas[0].sala_id); setMateriaId(linhas[0].materia_id) }
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar suas salas e matérias. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregarBase()
  }, [perfil?.id])

  // Salas em que o professor leciona alguma matéria (deduplicadas).
  const salas = useMemo(() => {
    const mapa = new Map()
    for (const a of atribuicoes) if (!mapa.has(a.sala_id)) mapa.set(a.sala_id, a.salas)
    return [...mapa.values()]
  }, [atribuicoes])

  // Matérias que o professor leciona na sala selecionada.
  const materiasDisponiveis = useMemo(
    () => atribuicoes.filter((a) => a.sala_id === salaId).map((a) => a.materias),
    [atribuicoes, salaId],
  )

  useEffect(() => {
    // Se a sala mudar e a matéria selecionada não for lecionada nela, troca pra primeira disponível.
    if (materiasDisponiveis.length > 0 && !materiasDisponiveis.some((m) => m.id === materiaId)) {
      setMateriaId(materiasDisponiveis[0].id)
    }
  }, [salaId, materiasDisponiveis]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!salaId || !materiaId) { setAlunos([]); return }
    async function carregarAlunos() {
      setCarregandoAlunos(true)
      setErro('')
      try {
        const [{ data: alunosData, error: e1 }, { data: avaliacoesData, error: e2 }] = await Promise.all([
          supabase.from('alunos').select('id, nome').eq('sala_id', salaId).order('nome'),
          supabase.from('avaliacoes_aprendizado').select('aluno_id, valor').eq('sala_id', salaId).eq('materia_id', materiaId).eq('data', HOJE()),
        ])
        if (e1) throw e1
        if (e2) throw e2
        setAlunos(alunosData || [])
        const vals = {}
        const sv = {}
        for (const a of avaliacoesData || []) { vals[a.aluno_id] = a.valor; sv[a.aluno_id] = true }
        for (const a of alunosData || []) if (!(a.id in vals)) vals[a.id] = 50
        setValores(vals)
        setSalvos(sv)
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar os alunos dessa sala.')
      } finally {
        setCarregandoAlunos(false)
      }
    }
    carregarAlunos()
  }, [salaId, materiaId])

  async function salvar(alunoId) {
    setSalvandoId(alunoId)
    setErro('')
    try {
      const { error } = await supabase.from('avaliacoes_aprendizado').upsert({
        aluno_id: alunoId,
        materia_id: materiaId,
        sala_id: salaId,
        escola_id: perfil.escola_id,
        professor_id: perfil.id,
        valor: valores[alunoId],
        data: HOJE(),
      }, { onConflict: 'aluno_id,materia_id,data' })
      if (error) throw error
      setSalvos((s) => ({ ...s, [alunoId]: true }))
      setConfirmadoId(alunoId)
      setTimeout(() => setConfirmadoId((c) => (c === alunoId ? null : c)), 1500)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar essa avaliação.')
    } finally {
      setSalvandoId(null)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Aprendizado</h1>
      <p className="mt-2 text-texto/60">
        Avalie o aprendizado de cada aluno hoje, de 0% a 100%. O boletim do aluno e do diretor atualiza na hora.
      </p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando…</div>
      ) : salas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <School className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            Você ainda não está atribuído a nenhuma matéria em nenhuma sala. Peça pro diretor te atribuir em "Matérias e Professores".
          </p>
        </div>
      ) : materiasDisponiveis.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <BookMarked className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            Essa sala ainda não tem matéria sua atribuída.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <select
              value={salaId} onChange={(e) => setSalaId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
            >
              {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <select
              value={materiaId} onChange={(e) => setMateriaId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
            >
              {materiasDisponiveis.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <span className="text-sm text-texto/50">Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
          </div>

          {carregandoAlunos ? (
            <div className="mt-10 text-texto/50">Carregando alunos…</div>
          ) : alunos.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
              <GaugeCircle className="mx-auto text-azul/60" size={40} />
              <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno nessa sala ainda.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {alunos.map((a) => {
                const v = valores[a.id] ?? 50
                const cor = corDoValor(v)
                return (
                  <div key={a.id} className="rounded-2xl bg-card border p-5 flex items-center gap-5 flex-wrap">
                    <div className="min-w-[140px] font-semibold text-white flex-1">{a.nome}</div>
                    <input
                      type="range" min={0} max={100} value={v}
                      onChange={(e) => setValores((prev) => ({ ...prev, [a.id]: Number(e.target.value) }))}
                      className="flex-[3] min-w-[160px] accent-azul"
                      style={{ accentColor: cor }}
                    />
                    <div className="w-14 text-right font-bold text-lg" style={{ color: cor }}>{v}%</div>
                    <button
                      onClick={() => salvar(a.id)} disabled={salvandoId === a.id}
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-azul hover:bg-azul-puro text-white text-sm font-medium transition disabled:opacity-60"
                    >
                      {salvandoId === a.id ? <Loader2 size={14} className="animate-spin" /> : confirmadoId === a.id ? <Check size={14} /> : null}
                      {salvandoId === a.id ? 'Salvando…' : confirmadoId === a.id ? 'Salvo' : salvos[a.id] ? 'Atualizar' : 'Salvar'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
