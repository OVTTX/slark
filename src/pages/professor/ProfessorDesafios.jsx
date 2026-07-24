import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Target, Loader2, Trophy, CalendarCheck, Users, Check } from 'lucide-react'

export default function ProfessorDesafios() {
  const [aba, setAba] = useState('desafios')

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Desafios</h1>
      <p className="mt-2 text-texto/60">Premie desafios superados e registre a presença das turmas.</p>

      <div className="mt-6 inline-flex rounded-xl bg-card border p-1">
        <button onClick={() => setAba('desafios')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'desafios' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Desafios
        </button>
        <button onClick={() => setAba('presenca')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'presenca' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Presença
        </button>
      </div>

      {aba === 'desafios' ? <Desafios /> : <Presenca />}
    </div>
  )
}

function Desafios() {
  const { perfil } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [historico, setHistorico] = useState([])
  const [alunoId, setAlunoId] = useState('')
  const [pontos, setPontos] = useState(10)
  const [motivo, setMotivo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: salasData, error: eSalas } = await supabase.from('salas').select('id').eq('professor_id', perfil.id)
      if (eSalas) throw eSalas
      const salaIds = (salasData || []).map((s) => s.id)
      if (salaIds.length === 0) { setAlunos([]); return }

      const { data: alunosData, error: eAlunos } = await supabase.from('alunos').select('id, nome, pontos').in('sala_id', salaIds).order('nome')
      if (eAlunos) throw eAlunos
      setAlunos(alunosData || [])

      const alunoIds = (alunosData || []).map((a) => a.id)
      if (alunoIds.length > 0) {
        const { data: histData } = await supabase
          .from('pontuacoes').select('*, alunos(nome)').in('aluno_id', alunoIds)
          .order('criada_em', { ascending: false }).limit(15)
        setHistorico(histData || [])
      }
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os dados. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  async function lancar(e) {
    e.preventDefault()
    if (!alunoId || !motivo.trim()) return
    setSalvando(true)
    setErro('')
    try {
      const aluno = alunos.find((a) => a.id === alunoId)
      const { error: eInsert } = await supabase.from('pontuacoes').insert({
        aluno_id: alunoId, professor_id: perfil.id, pontos: Number(pontos), motivo: motivo.trim(),
      })
      if (eInsert) throw eInsert

      const { error: eUpdate } = await supabase.from('alunos').update({ pontos: (aluno?.pontos || 0) + Number(pontos) }).eq('id', alunoId)
      if (eUpdate) throw eUpdate

      setMotivo('')
      setPontos(10)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível lançar os pontos do desafio.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mt-6">
      {erro && <p className="mb-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-4 text-texto/50">Carregando…</div>
      ) : alunos.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Target className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno nas suas turmas ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-card border p-6 h-fit">
            <div className="font-semibold text-white mb-4">Lançar desafio superado</div>
            <form onSubmit={lancar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Aluno</label>
                <select
                  required value={alunoId} onChange={(e) => setAlunoId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="">Selecione…</option>
                  {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Pontos</label>
                <input
                  type="number" min={1} required value={pontos} onChange={(e) => setPontos(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Desafio / motivo</label>
                <textarea
                  required value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Resolveu o desafio de lógica da semana"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none"
                />
              </div>
              <button
                type="submit" disabled={salvando}
                className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Lançando…' : 'Lançar pontos'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="text-sm font-semibold text-texto/50 uppercase tracking-wide mb-3">Histórico recente</div>
            {historico.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-azul/30 bg-card/40 p-8 text-center text-texto/60 text-sm">
                Nenhum desafio lançado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {historico.map((h) => (
                  <div key={h.id} className="rounded-xl bg-card border p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-white">{h.alunos?.nome}</div>
                      <div className="text-xs text-texto/50 truncate">{h.motivo}</div>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-[#F5C451] shrink-0">
                      <Trophy size={14} /> +{h.pontos}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Presenca() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [salaId, setSalaId] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [grupos, setGrupos] = useState([]) // [{ nome: 'Equipe A', alunos: [{id,nome,pontos}] }]
  const [jaMarcados, setJaMarcados] = useState({}) // aluno_id -> true (já registrado nessa data)
  const [selecionados, setSelecionados] = useState({}) // aluno_id -> bool (marcado agora, ainda não salvo)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregarSalas() {
      const { data: salasData, error } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id).order('nome')
      if (!error) {
        setSalas(salasData || [])
        if (salasData?.length && !salaId) setSalaId(salasData[0].id)
      }
    }
    carregarSalas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id])

  async function carregarTurma() {
    if (!salaId) return
    setCarregando(true)
    setErro('')
    setAviso('')
    try {
      const [{ data: alunosData, error: eAlunos }, { data: timesData, error: eTimes }, { data: presencasData, error: ePres }] = await Promise.all([
        supabase.from('alunos').select('id, nome, pontos').eq('sala_id', salaId).order('nome'),
        supabase.from('times').select('id, nome, time_membros(aluno_id)').eq('sala_id', salaId).order('nome'),
        supabase.from('presencas').select('aluno_id').eq('sala_id', salaId).eq('data', data),
      ])
      if (eAlunos) throw eAlunos
      if (eTimes) throw eTimes
      if (ePres) throw ePres

      const timeDoAluno = {}
      for (const t of timesData || []) {
        for (const m of t.time_membros || []) timeDoAluno[m.aluno_id] = t.nome
      }

      const gruposMap = {}
      for (const a of alunosData || []) {
        const nomeGrupo = timeDoAluno[a.id] || 'Sem equipe'
        if (!gruposMap[nomeGrupo]) gruposMap[nomeGrupo] = []
        gruposMap[nomeGrupo].push(a)
      }
      const nomesOrdenados = Object.keys(gruposMap).filter((n) => n !== 'Sem equipe').sort()
      if (gruposMap['Sem equipe']) nomesOrdenados.push('Sem equipe')
      setGrupos(nomesOrdenados.map((nome) => ({ nome, alunos: gruposMap[nome] })))

      setJaMarcados(Object.fromEntries((presencasData || []).map((p) => [p.aluno_id, true])))
      setSelecionados({})
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar a turma.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregarTurma() }, [salaId, data]) // eslint-disable-line react-hooks/exhaustive-deps

  function alternar(alunoId) {
    if (jaMarcados[alunoId]) return
    setSelecionados((prev) => ({ ...prev, [alunoId]: !prev[alunoId] }))
  }

  const idsSelecionados = useMemo(() => Object.keys(selecionados).filter((id) => selecionados[id]), [selecionados])
  const totalAlunos = useMemo(() => grupos.reduce((s, g) => s + g.alunos.length, 0), [grupos])
  const totalJaMarcados = Object.keys(jaMarcados).length

  async function salvarPresenca() {
    if (idsSelecionados.length === 0) return
    setSalvando(true)
    setErro('')
    setAviso('')
    try {
      const { error: eInsert } = await supabase.from('presencas').insert(
        idsSelecionados.map((alunoId) => ({ sala_id: salaId, aluno_id: alunoId, data, professor_id: perfil.id, presente: true })),
      )
      if (eInsert) throw eInsert

      const { error: eInsertPontos } = await supabase.from('pontuacoes').insert(
        idsSelecionados.map((alunoId) => ({ aluno_id: alunoId, professor_id: perfil.id, pontos: 2, motivo: 'Presença' })),
      )
      if (eInsertPontos) throw eInsertPontos

      const alunoPorId = Object.fromEntries(grupos.flatMap((g) => g.alunos).map((a) => [a.id, a]))
      await Promise.all(
        idsSelecionados.map((alunoId) =>
          supabase.from('alunos').update({ pontos: (alunoPorId[alunoId]?.pontos || 0) + 2 }).eq('id', alunoId),
        ),
      )

      setAviso(`Presença registrada para ${idsSelecionados.length} aluno(s) — +2 pontos cada.`)
      await carregarTurma()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a presença. Confira se ela já não foi registrada hoje.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mt-6">
      {salas.length === 0 && !carregando ? (
        <div className="rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <CalendarCheck className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Você ainda não tem turmas atribuídas.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={salaId} onChange={(e) => setSalaId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
            >
              {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <input
              type="date" value={data} onChange={(e) => setData(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
            />
            {!carregando && totalAlunos > 0 && (
              <span className="text-sm text-texto/50">{totalJaMarcados} de {totalAlunos} já registrados nessa data</span>
            )}
          </div>

          {erro && <p className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}
          {aviso && <p className="mt-4 text-sm text-[#3FD08A] bg-[#3FD08A]/10 px-4 py-3 rounded-xl flex items-center gap-2"><Check size={15} /> {aviso}</p>}

          {carregando ? (
            <div className="mt-6 text-texto/50">Carregando turma…</div>
          ) : totalAlunos === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
              <Users className="mx-auto text-azul/60" size={40} />
              <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno nessa turma ainda.</p>
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-2xl bg-card border p-6 space-y-6">
                {grupos.map((g) => (
                  <div key={g.nome}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-texto/60 uppercase tracking-wide mb-3">
                      <Users size={14} /> {g.nome}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {g.alunos.map((a) => {
                        const marcado = !!jaMarcados[a.id]
                        const selecionado = !!selecionados[a.id]
                        return (
                          <label
                            key={a.id}
                            onClick={() => alternar(a.id)}
                            className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm transition cursor-pointer select-none ${
                              marcado ? 'bg-[#3FD08A]/10 border border-[#3FD08A]/25' : selecionado ? 'bg-azul/15 border border-azul/40' : 'bg-white/[0.03] border border-white/5 hover:border-azul/20'
                            }`}
                          >
                            <span className="text-white/90 truncate">{a.nome}</span>
                            {marcado ? (
                              <span className="flex items-center gap-1 text-xs text-[#3FD08A] shrink-0"><Check size={13} /> Presente</span>
                            ) : (
                              <input
                                type="checkbox" checked={selecionado} onChange={() => alternar(a.id)}
                                style={{ accentColor: '#2E5BFF' }}
                                className="w-4 h-4 shrink-0"
                              />
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={salvarPresenca}
                disabled={salvando || idsSelecionados.length === 0}
                className="w-full sm:w-auto mt-5 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-40 disabled:pointer-events-none"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Salvando…' : `Salvar presença (${idsSelecionados.length}) · +2 pontos cada`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
