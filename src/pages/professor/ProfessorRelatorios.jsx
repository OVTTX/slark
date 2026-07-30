import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BarChart3, Thermometer, Users, UsersRound, School } from 'lucide-react'
import { TermometroBarra, TermometroGrande } from '../../components/Termometro'
import { calcularScoreAluno, agregarScores } from '../../lib/engajamento'

export default function ProfessorRelatorios() {
  const [aba, setAba] = useState('panorama')

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Relatórios</h1>
      <p className="mt-2 text-texto/60">Panorama e engajamento de cada aluno das suas turmas.</p>

      <div className="mt-6 inline-flex rounded-xl bg-card border p-1">
        <button onClick={() => setAba('panorama')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'panorama' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Panorama
        </button>
        <button onClick={() => setAba('engajamento')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'engajamento' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Termômetro de engajamento
        </button>
      </div>

      {aba === 'panorama' ? <Panorama /> : <Engajamento />}
    </div>
  )
}

function Panorama() {
  const { perfil } = useAuth()
  const [linhas, setLinhas] = useState([])
  const [salas, setSalas] = useState([])
  const [filtroSala, setFiltroSala] = useState('todas')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
        if (eSalas) throw eSalas
        setSalas(salasData || [])
        const salaIds = (salasData || []).map((s) => s.id)
        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
        if (salaIds.length === 0) { setLinhas([]); return }

        const { data: alunosData, error: eAlunos } = await supabase.from('alunos').select('*').in('sala_id', salaIds)
        if (eAlunos) throw eAlunos
        const alunoIds = (alunosData || []).map((a) => a.id)

        const [{ data: entregasData }, { data: observacoesData }, { data: selosData }] = await Promise.all([
          alunoIds.length ? supabase.from('entregas').select('aluno_id, nota, status').in('aluno_id', alunoIds) : Promise.resolve({ data: [] }),
          alunoIds.length ? supabase.from('observacoes').select('aluno_id').in('aluno_id', alunoIds) : Promise.resolve({ data: [] }),
          alunoIds.length ? supabase.from('aluno_selos').select('aluno_id').in('aluno_id', alunoIds) : Promise.resolve({ data: [] }),
        ])

        const notasPorAluno = {}
        const entreguesPorAluno = {}
        for (const e of entregasData || []) {
          if (e.status === 'entregue' || e.status === 'corrigida') entreguesPorAluno[e.aluno_id] = (entreguesPorAluno[e.aluno_id] || 0) + 1
          if (e.nota != null) {
            if (!notasPorAluno[e.aluno_id]) notasPorAluno[e.aluno_id] = []
            notasPorAluno[e.aluno_id].push(Number(e.nota))
          }
        }
        const obsPorAluno = {}
        for (const o of observacoesData || []) obsPorAluno[o.aluno_id] = (obsPorAluno[o.aluno_id] || 0) + 1
        const selosPorAluno = {}
        for (const s of selosData || []) selosPorAluno[s.aluno_id] = (selosPorAluno[s.aluno_id] || 0) + 1

        setLinhas((alunosData || []).map((a) => {
          const notas = notasPorAluno[a.id] || []
          const media = notas.length ? `${Math.round(notas.reduce((s, n) => s + n, 0) / notas.length)}%` : '—'
          return {
            id: a.id,
            nome: a.nome,
            salaId: a.sala_id,
            salaNome: salaPorId[a.sala_id]?.nome || '—',
            pontos: a.pontos,
            entregas: entreguesPorAluno[a.id] || 0,
            media,
            observacoes: obsPorAluno[a.id] || 0,
            selos: selosPorAluno[a.id] || 0,
          }
        }))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar os relatórios. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  const linhasFiltradas = useMemo(
    () => linhas.filter((l) => filtroSala === 'todas' || l.salaId === filtroSala),
    [linhas, filtroSala],
  )

  return (
    <div>
      <div className="mt-6">
        <select
          value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
        >
          <option value="todas">Todas as salas</option>
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando relatórios…</div>
      ) : linhasFiltradas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <BarChart3 className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno para gerar relatório ainda.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Aluno</th>
                <th className="px-6 py-4 font-medium">Sala</th>
                <th className="px-6 py-4 font-medium text-right">Pontos</th>
                <th className="px-6 py-4 font-medium text-right">Entregas</th>
                <th className="px-6 py-4 font-medium text-right">Média</th>
                <th className="px-6 py-4 font-medium text-right">Observações</th>
                <th className="px-6 py-4 font-medium text-right">Selos</th>
              </tr>
            </thead>
            <tbody>
              {linhasFiltradas.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 font-semibold text-white">{l.nome}</td>
                  <td className="px-6 py-4 text-texto/70">{l.salaNome}</td>
                  <td className="px-6 py-4 text-right text-white">{l.pontos}</td>
                  <td className="px-6 py-4 text-right text-texto/70">{l.entregas}</td>
                  <td className="px-6 py-4 text-right text-texto/70">{l.media}</td>
                  <td className="px-6 py-4 text-right text-texto/70">{l.observacoes}</td>
                  <td className="px-6 py-4 text-right text-texto/70">{l.selos}</td>
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
  const [nivel, setNivel] = useState('alunos') // alunos | equipes | salas
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [salas, setSalas] = useState([])
  const [scoresAlunos, setScoresAlunos] = useState([]) // [{aluno, score}]
  const [times, setTimes] = useState([])
  const [geral, setGeral] = useState({ geral: 0, semDados: true })

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
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
          supabase.from('trilhas').select('id, sala_id, status, trilha_blocos(id)').eq('status', 'publicado').eq('escola_id', perfil.escola_id).or(`sala_id.in.(${salaIds.join(',')}),sala_id.is.null`),
          supabase.from('trilha_bloco_progresso').select('aluno_id, bloco_id'),
          supabase.from('presencas').select('aluno_id, sala_id, data, presente').in('sala_id', salaIds),
        ])
        if (eAlunos) throw eAlunos
        if (eTimes) throw eTimes
        if (eTrilhas) throw eTrilhas
        if (eProgresso) throw eProgresso
        if (ePresencas) throw ePresencas

        // blocos totais esperados por sala (trilhas gerais + trilhas específicas da sala)
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
  }, [perfil?.id])

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
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno nas suas turmas ainda.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl bg-card border p-6">
            <TermometroGrande valor={geral.geral} semDados={geral.semDados} label="Engajamento médio das suas turmas" />
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
