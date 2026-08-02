import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ClipboardList, School, Thermometer, Users, UsersRound, GaugeCircle, Radio } from 'lucide-react'
import { TermometroBarra, TermometroGrande } from '../../components/Termometro'
import { calcularScoreAluno, agregarScores } from '../../lib/engajamento'

export default function DiretorNotas() {
  const [aba, setAba] = useState('boletim')

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Aprendizado</h1>
      <p className="mt-2 text-texto/60">Boletim em porcentagem, atividades corrigidas e engajamento de toda a escola.</p>

      <div className="mt-6 inline-flex rounded-xl bg-card border p-1 flex-wrap">
        <button onClick={() => setAba('boletim')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'boletim' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Boletim
        </button>
        <button onClick={() => setAba('atividades')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'atividades' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Atividades corrigidas
        </button>
        <button onClick={() => setAba('engajamento')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'engajamento' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Termômetro de engajamento
        </button>
      </div>

      {aba === 'boletim' && <Boletim />}
      {aba === 'atividades' && <AtividadesCorrigidas />}
      {aba === 'engajamento' && <Engajamento />}
    </div>
  )
}

function corDoValor(v) {
  if (v >= 70) return '#3FD08A'
  if (v >= 40) return '#F5C451'
  return '#FF6B6B'
}

function Boletim() {
  const { perfil } = useAuth()
  const [nivel, setNivel] = useState('salas') // alunos | salas
  const [materiaId, setMateriaId] = useState('todas')
  const [materias, setMaterias] = useState([])
  const [salas, setSalas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [avaliacoes, setAvaliacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar() {
    if (!perfil?.escola_id) return
    setErro('')
    try {
      const [{ data: materiasData, error: e1 }, { data: salasData, error: e2 }, { data: alunosData, error: e3 }, { data: avData, error: e4 }] = await Promise.all([
        supabase.from('materias').select('id, nome').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('salas').select('id, nome').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('alunos').select('id, nome, sala_id').eq('escola_id', perfil.escola_id),
        supabase.from('avaliacoes_aprendizado').select('aluno_id, materia_id, sala_id, valor').eq('escola_id', perfil.escola_id),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (e4) throw e4
      setMaterias(materiasData || [])
      setSalas(salasData || [])
      setAlunos(alunosData || [])
      setAvaliacoes(avData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar o boletim. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (!perfil?.escola_id) return
    setCarregando(true)
    carregar()

    // Tempo real: qualquer lançamento novo de professor atualiza o boletim do diretor na hora.
    const canal = supabase
      .channel(`boletim-escola-${perfil.escola_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avaliacoes_aprendizado', filter: `escola_id=eq.${perfil.escola_id}` }, () => {
        carregar()
      })
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [perfil?.escola_id])

  const avaliacoesFiltradas = useMemo(
    () => avaliacoes.filter((a) => materiaId === 'todas' || a.materia_id === materiaId),
    [avaliacoes, materiaId],
  )

  const mediaPorAluno = useMemo(() => {
    const mapa = {}
    for (const a of avaliacoesFiltradas) {
      if (!mapa[a.aluno_id]) mapa[a.aluno_id] = []
      mapa[a.aluno_id].push(a.valor)
    }
    return Object.fromEntries(Object.entries(mapa).map(([id, vals]) => [id, Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)]))
  }, [avaliacoesFiltradas])

  const alunosComMedia = useMemo(
    () => alunos.map((a) => ({ ...a, media: mediaPorAluno[a.id], salaNome: salas.find((s) => s.id === a.sala_id)?.nome || '—' }))
      .filter((a) => a.media != null),
    [alunos, mediaPorAluno, salas],
  )

  const mediaPorSala = useMemo(() => {
    return salas.map((s) => {
      const doGrupo = alunosComMedia.filter((a) => a.sala_id === s.id)
      const media = doGrupo.length ? Math.round(doGrupo.reduce((sum, a) => sum + a.media, 0) / doGrupo.length) : null
      return { ...s, media, qtd: doGrupo.length }
    }).filter((s) => s.media != null)
  }, [salas, alunosComMedia])

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl bg-card border p-1">
          <button onClick={() => setNivel('alunos')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${nivel === 'alunos' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
            <Users size={14} /> Alunos
          </button>
          <button onClick={() => setNivel('salas')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${nivel === 'salas' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
            <School size={14} /> Salas
          </button>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={materiaId} onChange={(e) => setMateriaId(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
          >
            <option value="todas">Todas as matérias</option>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <span className="flex items-center gap-1.5 text-xs text-[#3FD08A] bg-[#3FD08A]/10 px-3 py-1.5 rounded-full">
            <Radio size={12} className="animate-pulse" /> Ao vivo
          </span>
        </div>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando boletim…</div>
      ) : alunosComMedia.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <GaugeCircle className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma avaliação de aprendizado lançada ainda.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border p-6 divide-y divide-white/5">
          {nivel === 'alunos' && alunosComMedia
            .slice()
            .sort((a, b) => b.media - a.media)
            .map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-white font-medium">{a.nome}</div>
                  <div className="text-xs text-texto/45">{a.salaNome}</div>
                </div>
                <span className="font-bold text-lg" style={{ color: corDoValor(a.media) }}>{a.media}%</span>
              </div>
            ))}

          {nivel === 'salas' && mediaPorSala
            .slice()
            .sort((a, b) => b.media - a.media)
            .map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-white font-medium">{s.nome}</div>
                  <div className="text-xs text-texto/45">{s.qtd} aluno(s) avaliado(s)</div>
                </div>
                <span className="font-bold text-lg" style={{ color: corDoValor(s.media) }}>{s.media}%</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function AtividadesCorrigidas() {
  const { perfil } = useAuth()
  const [entregas, setEntregas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroSala, setFiltroSala] = useState('todas')
  const [salas, setSalas] = useState([])

  useEffect(() => {
    if (!perfil?.escola_id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('escola_id', perfil.escola_id)
        if (eSalas) throw eSalas
        const salaIds = (salasData || []).map((s) => s.id)
        setSalas(salasData || [])

        if (salaIds.length === 0) { setEntregas([]); return }

        const { data: atividadesData, error: eAt } = await supabase.from('atividades').select('id, titulo, sala_id').in('sala_id', salaIds)
        if (eAt) throw eAt
        const atividadeIds = (atividadesData || []).map((a) => a.id)
        const atividadePorId = Object.fromEntries((atividadesData || []).map((a) => [a.id, a]))
        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))

        if (atividadeIds.length === 0) { setEntregas([]); return }

        const { data: entregasData, error: eEnt } = await supabase
          .from('entregas')
          .select('*, alunos(nome)')
          .in('atividade_id', atividadeIds)
          .not('nota', 'is', null)
          .order('entregue_em', { ascending: false })
        if (eEnt) throw eEnt

        setEntregas((entregasData || []).map((e) => {
          const atividade = atividadePorId[e.atividade_id]
          return {
            ...e,
            atividadeTitulo: atividade?.titulo || '—',
            salaNome: salaPorId[atividade?.sala_id]?.nome || '—',
            salaId: atividade?.sala_id,
            alunoNome: e.alunos?.nome || '—',
          }
        }))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar as atividades corrigidas. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.escola_id])

  const listaFiltrada = useMemo(
    () => entregas.filter((e) => filtroSala === 'todas' || e.salaId === filtroSala),
    [entregas, filtroSala],
  )

  const media = listaFiltrada.length
    ? `${Math.round(listaFiltrada.reduce((s, e) => s + Number(e.nota), 0) / listaFiltrada.length)}%`
    : '—'

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
        >
          <option value="todas">Todas as salas</option>
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        {!carregando && listaFiltrada.length > 0 && (
          <span className="text-sm text-texto/60">Média: <span className="text-white font-semibold">{media}</span></span>
        )}
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando…</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <ClipboardList className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma atividade corrigida ainda.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Aluno</th>
                <th className="px-6 py-4 font-medium">Atividade</th>
                <th className="px-6 py-4 font-medium">Sala</th>
                <th className="px-6 py-4 font-medium text-right">Nota</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 font-semibold text-white">{e.alunoNome}</td>
                  <td className="px-6 py-4 text-texto/70">{e.atividadeTitulo}</td>
                  <td className="px-6 py-4 text-texto/70">
                    <div className="flex items-center gap-1.5"><School size={13} className="text-texto/40" />{e.salaNome}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-white">{Math.round(Number(e.nota))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Engajamento() {
  const { perfil } = useAuth()
  const [nivel, setNivel] = useState('salas') // alunos | equipes | salas
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [salas, setSalas] = useState([])
  const [scoresAlunos, setScoresAlunos] = useState([])
  const [times, setTimes] = useState([])
  const [geral, setGeral] = useState({ geral: 0, semDados: true })

  useEffect(() => {
    if (!perfil?.escola_id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('escola_id', perfil.escola_id)
        if (eSalas) throw eSalas
        setSalas(salasData || [])
        const salaIds = (salasData || []).map((s) => s.id)
        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
        if (salaIds.length === 0) { setScoresAlunos([]); setTimes([]); setGeral({ geral: 0, semDados: true }); return }

        const [
          { data: alunosData, error: eAlunos },
          { data: timesData, error: eTimes },
          { data: trilhasData, error: eTrilhas },
          { data: progressoData, error: eProgresso },
          { data: presencasData, error: ePresencas },
        ] = await Promise.all([
          supabase.from('alunos').select('id, nome, sala_id, pontos').in('sala_id', salaIds),
          supabase.from('times').select('id, nome, sala_id, time_membros(aluno_id)').in('sala_id', salaIds),
          supabase.from('trilhas').select('id, sala_id, status, trilha_blocos(id)').eq('status', 'publicado').eq('escola_id', perfil.escola_id),
          supabase.from('trilha_bloco_progresso').select('aluno_id, bloco_id'),
          supabase.from('presencas').select('aluno_id, sala_id, data, presente').in('sala_id', salaIds),
        ])
        if (eAlunos) throw eAlunos
        if (eTimes) throw eTimes
        if (eTrilhas) throw eTrilhas
        if (eProgresso) throw eProgresso
        if (ePresencas) throw ePresencas

        const blocosGeral = (trilhasData || []).filter((t) => !t.sala_id).reduce((s, t) => s + (t.trilha_blocos?.length || 0), 0)
        const blocosPorSala = {}
        for (const sId of salaIds) {
          const blocosDaSala = (trilhasData || []).filter((t) => t.sala_id === sId).reduce((s, t) => s + (t.trilha_blocos?.length || 0), 0)
          blocosPorSala[sId] = blocosGeral + blocosDaSala
        }

        const alunoIds = new Set((alunosData || []).map((a) => a.id))
        const blocosFeitosPorAluno = {}
        for (const p of progressoData || []) {
          if (!alunoIds.has(p.aluno_id)) continue
          if (!blocosFeitosPorAluno[p.aluno_id]) blocosFeitosPorAluno[p.aluno_id] = new Set()
          blocosFeitosPorAluno[p.aluno_id].add(p.bloco_id)
        }

        const chamadasPorSala = {}
        for (const sId of salaIds) chamadasPorSala[sId] = new Set()
        for (const p of presencasData || []) chamadasPorSala[p.sala_id]?.add(p.data)
        const presentesPorAluno = {}
        for (const p of presencasData || []) {
          if (!p.presente) continue
          presentesPorAluno[p.aluno_id] = (presentesPorAluno[p.aluno_id] || 0) + 1
        }

        const maxPontosPorSala = {}
        for (const sId of salaIds) {
          const alunosDaSala = (alunosData || []).filter((a) => a.sala_id === sId)
          maxPontosPorSala[sId] = Math.max(0, ...alunosDaSala.map((a) => a.pontos || 0))
        }

        const lista = (alunosData || []).map((a) => {
          const score = calcularScoreAluno({
            pontos: a.pontos || 0,
            maxPontos: maxPontosPorSala[a.sala_id] || 0,
            blocosFeitos: blocosFeitosPorAluno[a.id]?.size || 0,
            blocosTotais: blocosPorSala[a.sala_id] || 0,
            presentes: presentesPorAluno[a.id] || 0,
            totalChamadas: chamadasPorSala[a.sala_id]?.size || 0,
          })
          return { aluno: { ...a, salaNome: salaPorId[a.sala_id]?.nome || '—' }, score }
        })
        setScoresAlunos(lista)
        setGeral(agregarScores(lista.map((l) => l.score)))

        const scorePorAluno = Object.fromEntries(lista.map((l) => [l.aluno.id, l.score]))
        setTimes((timesData || []).map((t) => {
          const membrosIds = (t.time_membros || []).map((m) => m.aluno_id)
          const scoreTime = agregarScores(membrosIds.map((id) => scorePorAluno[id]).filter(Boolean))
          return { ...t, salaNome: salaPorId[t.sala_id]?.nome || '—', qtdMembros: membrosIds.length, score: scoreTime }
        }))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar o engajamento. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.escola_id])

  const scoresPorSala = useMemo(() => {
    return salas.map((s) => {
      const alunosDaSala = scoresAlunos.filter((l) => l.aluno.sala_id === s.id)
      return { sala: s, score: agregarScores(alunosDaSala.map((l) => l.score)), qtdAlunos: alunosDaSala.length }
    })
  }, [salas, scoresAlunos])

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl bg-card border p-1">
          <button onClick={() => setNivel('alunos')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${nivel === 'alunos' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
            <Users size={14} /> Alunos
          </button>
          <button onClick={() => setNivel('equipes')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${nivel === 'equipes' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
            <UsersRound size={14} /> Equipes
          </button>
          <button onClick={() => setNivel('salas')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${nivel === 'salas' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
            <School size={14} /> Salas
          </button>
        </div>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Calculando engajamento…</div>
      ) : scoresAlunos.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Thermometer className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno cadastrado na escola ainda.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl bg-card border p-6">
            <TermometroGrande valor={geral.geral} semDados={geral.semDados} label="Engajamento médio da escola" />
            <p className="mt-4 text-xs text-texto/45 leading-relaxed">
              Calculado a partir de pontos (relativos à turma), progresso nas trilhas e presença. Quem ainda não tem
              dado suficiente em algum critério não é penalizado por ele.
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-card border p-6 divide-y divide-white/5">
            {nivel === 'alunos' && scoresAlunos
              .slice()
              .sort((a, b) => b.score.geral - a.score.geral)
              .map((l) => (
                <TermometroBarra key={l.aluno.id} nome={l.aluno.nome} sub={l.aluno.salaNome} valor={l.score.geral} semDados={l.score.semDados} />
              ))}

            {nivel === 'equipes' && (times.length === 0 ? (
              <p className="text-sm text-texto/45 py-8 text-center">Nenhuma equipe criada ainda.</p>
            ) : (
              times
                .slice()
                .sort((a, b) => b.score.geral - a.score.geral)
                .map((t) => (
                  <TermometroBarra key={t.id} nome={t.nome} sub={`${t.salaNome} · ${t.qtdMembros} aluno(s)`} valor={t.score.geral} semDados={t.score.semDados} />
                ))
            ))}

            {nivel === 'salas' && scoresPorSala
              .slice()
              .sort((a, b) => b.score.geral - a.score.geral)
              .map((s) => (
                <TermometroBarra key={s.sala.id} nome={s.sala.nome} sub={`${s.qtdAlunos} aluno(s)`} valor={s.score.geral} semDados={s.score.semDados} />
              ))}
          </div>
        </>
      )}
    </div>
  )
}
