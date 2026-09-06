import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Users, GraduationCap, Award, BookOpen, ArrowRight, ChevronRight,
  Trophy, Star, AlertTriangle, Send,
} from 'lucide-react'

const META_APRENDIZADO = 80 // meta estipulada pra média geral das turmas
const CORTE_APROVACAO = 60 // aprendizado mais recente >= isso conta como "aprovado"

function StatCard({ icon: Icon, cor, rotulo, valor, sub }) {
  return (
    <div className="rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40">
      <div className="flex items-start justify-between">
        <div className="text-sm text-texto/60">{rotulo}</div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${cor}22` }}>
          <Icon size={16} style={{ color: cor }} />
        </div>
      </div>
      <div className="mt-1 text-3xl font-bold text-white">{valor}</div>
      {sub && <div className="mt-1 text-xs text-texto/45">{sub}</div>}
    </div>
  )
}

function tempoRelativo(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `${horas}h atrás`
  const dias = Math.floor(horas / 24)
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

function rotuloData(iso) {
  const data = new Date(iso)
  const hoje = new Date()
  const amanha = new Date(hoje.getTime() + 86400000)
  const mesmodia = (a, b) => a.toDateString() === b.toDateString()
  if (mesmodia(data, hoje)) return 'Hoje'
  if (mesmodia(data, amanha)) return 'Amanhã'
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function ProfessorInicio() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [stats, setStats] = useState({ totalAlunos: 0, mediaGeral: null, taxaAprovacao: null, ministradas: 0, previstas: 0 })
  const [turmas, setTurmas] = useState([])
  const [proximasAulas, setProximasAulas] = useState([])
  const [atividades, setAtividades] = useState([])

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      try {
        const { data: salasData } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
        const salas = salasData || []
        const salaIds = salas.map((s) => s.id)

        if (salaIds.length === 0) {
          setStats({ totalAlunos: 0, mediaGeral: null, taxaAprovacao: null, ministradas: 0, previstas: 0 })
          setTurmas([])
          setProximasAulas([])
          setAtividades([])
          return
        }

        const [
          { data: alunosData },
          { data: materiasData },
          { data: avaliacoesData },
          { data: trilhasData },
          { data: eventosData },
          { data: presencasData },
        ] = await Promise.all([
          supabase.from('alunos').select('id, nome, sala_id, pontos').in('sala_id', salaIds),
          supabase.from('sala_materias').select('sala_id, materias(nome)').in('sala_id', salaIds),
          supabase.from('avaliacoes_aprendizado').select('aluno_id, sala_id, valor, data').in('sala_id', salaIds),
          supabase.from('trilhas').select('id, sala_id, trilha_blocos(id)').eq('professor_id', perfil.id),
          supabase.from('eventos').select('*').in('sala_id', salaIds).gte('inicio', new Date().toISOString()).order('inicio').limit(4),
          supabase.from('presencas').select('sala_id, data').eq('professor_id', perfil.id),
        ])

        const alunos = alunosData || []
        const alunoIds = alunos.map((a) => a.id)
        const salaPorId = Object.fromEntries(salas.map((s) => [s.id, s]))

        // matéria(s) por sala
        const materiasPorSala = {}
        for (const m of materiasData || []) {
          if (!materiasPorSala[m.sala_id]) materiasPorSala[m.sala_id] = []
          if (m.materias?.nome) materiasPorSala[m.sala_id].push(m.materias.nome)
        }

        // média geral + taxa de aprovação (aprendizado mais recente de cada aluno)
        const maisRecentePorAluno = {}
        for (const a of avaliacoesData || []) {
          const atual = maisRecentePorAluno[a.aluno_id]
          if (!atual || a.data > atual.data) maisRecentePorAluno[a.aluno_id] = a
        }
        const valoresRecentes = Object.values(maisRecentePorAluno).map((a) => a.valor)
        const mediaGeral = valoresRecentes.length ? Math.round(valoresRecentes.reduce((s, v) => s + v, 0) / valoresRecentes.length) : null
        const taxaAprovacao = valoresRecentes.length
          ? Math.round((valoresRecentes.filter((v) => v >= CORTE_APROVACAO).length / valoresRecentes.length) * 100)
          : null

        // aulas ministradas (dias distintos com chamada feita) vs previstas (+ aulas futuras já agendadas)
        const diasMinistrados = new Set((presencasData || []).map((p) => `${p.sala_id}_${p.data}`))
        const ministradas = diasMinistrados.size
        const { count: futurasCount } = await supabase
          .from('eventos').select('id', { count: 'exact', head: true }).in('sala_id', salaIds).gte('inicio', new Date().toISOString())
        const previstas = ministradas + (futurasCount || 0)

        // por turma: alunos, média, meta de conteúdo (progresso médio nas trilhas da sala)
        const blocosPorSala = {}
        for (const t of trilhasData || []) {
          const chaveSalas = t.sala_id ? [t.sala_id] : salaIds // trilha sem sala = vale pra todas as turmas do professor
          for (const sid of chaveSalas) {
            if (!blocosPorSala[sid]) blocosPorSala[sid] = new Set()
            for (const b of t.trilha_blocos || []) blocosPorSala[sid].add(b.id)
          }
        }
        // conta quantas conclusões de bloco (aluno x bloco) realmente valem pra
        // sala dele, pra tirar a média de % de conteúdo visto por aluno
        let progressoPorSala = {}
        if (alunoIds.length) {
          const { data: progressoData } = await supabase.from('trilha_bloco_progresso').select('aluno_id, bloco_id').in('aluno_id', alunoIds)
          for (const p of progressoData || []) {
            const aluno = alunos.find((a) => a.id === p.aluno_id)
            if (!aluno) continue
            const sid = aluno.sala_id
            if (!blocosPorSala[sid]?.has(p.bloco_id)) continue
            progressoPorSala[sid] = (progressoPorSala[sid] || 0) + 1
          }
        }

        const turmasMontadas = salas.map((s) => {
          const alunosDaSala = alunos.filter((a) => a.sala_id === s.id)
          const avaliacoesDaSala = (avaliacoesData || []).filter((a) => a.sala_id === s.id)
          const mediaSala = avaliacoesDaSala.length
            ? Math.round(avaliacoesDaSala.reduce((sum, a) => sum + a.valor, 0) / avaliacoesDaSala.length)
            : null
          const totalBlocos = blocosPorSala[s.id]?.size || 0
          const feitos = progressoPorSala[s.id] || 0
          const metaConteudo = totalBlocos ? Math.round((feitos / (totalBlocos * Math.max(1, alunosDaSala.length))) * 100) : 0
          return {
            id: s.id,
            nome: s.nome,
            materia: materiasPorSala[s.id]?.[0] || 'Sem matéria',
            alunos: alunosDaSala.length,
            media: mediaSala,
            metaConteudo: Math.min(100, metaConteudo),
          }
        })
        setTurmas(turmasMontadas)

        setProximasAulas((eventosData || []).map((e) => ({ ...e, salaNome: salaPorId[e.sala_id]?.nome || '' })))

        setStats({ totalAlunos: alunos.length, mediaGeral, taxaAprovacao, ministradas, previstas })

        // feed de atividades recentes: pontos, trilhas concluídas, entregas enviadas
        const alunoPorId = Object.fromEntries(alunos.map((a) => [a.id, a]))
        let feed = []
        if (alunoIds.length) {
          const [{ data: pontData }, { data: conclusoesData }, { data: entregasData }] = await Promise.all([
            supabase.from('pontuacoes').select('aluno_id, pontos, motivo, criada_em').in('aluno_id', alunoIds).order('criada_em', { ascending: false }).limit(5),
            supabase.from('trilha_conclusoes').select('aluno_id, trilha_id, concluida_em, trilhas(titulo)').in('aluno_id', alunoIds).order('concluida_em', { ascending: false }).limit(5),
            supabase.from('entregas').select('aluno_id, atividade_id, entregue_em, status, atividades(titulo)').in('aluno_id', alunoIds).eq('status', 'entregue').order('entregue_em', { ascending: false }).limit(5),
          ])

          for (const p of pontData || []) {
            feed.push({
              tipo: 'pontos', quando: p.criada_em,
              texto: `${alunoPorId[p.aluno_id]?.nome || 'Aluno'} ${p.pontos >= 0 ? 'ganhou' : 'perdeu'} pontos`,
              sub: p.motivo || 'Pontuação lançada', badge: `${p.pontos >= 0 ? '+' : ''}${p.pontos} pts`,
              salaNome: salaPorId[alunoPorId[p.aluno_id]?.sala_id]?.nome,
            })
          }
          for (const c of conclusoesData || []) {
            feed.push({
              tipo: 'trilha', quando: c.concluida_em,
              texto: `${alunoPorId[c.aluno_id]?.nome || 'Aluno'} completou a trilha`,
              sub: c.trilhas?.titulo || '', badge: null,
              salaNome: salaPorId[alunoPorId[c.aluno_id]?.sala_id]?.nome,
            })
          }
          for (const e of entregasData || []) {
            feed.push({
              tipo: 'entrega', quando: e.entregue_em,
              texto: `${alunoPorId[e.aluno_id]?.nome || 'Aluno'} enviou uma atividade`,
              sub: e.atividades?.titulo || '', badge: null,
              salaNome: salaPorId[alunoPorId[e.aluno_id]?.sala_id]?.nome,
            })
          }
          feed = feed.filter((f) => f.quando).sort((a, b) => new Date(b.quando) - new Date(a.quando)).slice(0, 3)

          const alunosEmRisco = alunosData?.filter((a) => (a.pontos || 0) === 0).length || 0
          if (alunosEmRisco > 0) {
            feed.push({
              tipo: 'alerta', quando: null,
              texto: `${alunosEmRisco} aluno${alunosEmRisco === 1 ? '' : 's'} em risco de progresso lento`,
              sub: 'Ainda sem nenhuma pontuação', badge: 'Alerta',
            })
          }
        }
        setAtividades(feed)
      } catch (e) {
        console.error(e)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Olá, {perfil?.nome?.split(' ')[0] || 'Professor'}!</h1>
      <p className="mt-2 text-texto/60">Bem-vindo à Slark, a nova educação.</p>

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando painel…</div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard icon={Users} cor="#2E5BFF" rotulo="Total de Alunos" valor={stats.totalAlunos} sub="Alunos ativos cadastrados" />
            <StatCard
              icon={GraduationCap} cor="#3FD08A" rotulo="Média Geral"
              valor={stats.mediaGeral != null ? `${stats.mediaGeral}%` : '—'}
              sub={`Meta estipulada de ${META_APRENDIZADO}%`}
            />
            <StatCard
              icon={Award} cor="#C44DFF" rotulo="Taxa de Aprovação"
              valor={stats.taxaAprovacao != null ? `${stats.taxaAprovacao}%` : '—'}
              sub={`Alunos com aprendizado ≥ ${CORTE_APROVACAO}%`}
            />
            <StatCard icon={BookOpen} cor="#F5C451" rotulo="Aulas Ministradas" valor={stats.ministradas} sub={`De um total de ${stats.previstas} previstas`} />
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Turmas Ativas</h2>
                <button onClick={() => navigate('/professor/salas')} className="flex items-center gap-1.5 text-sm font-medium text-azul hover:text-white transition">
                  Ver todas as turmas <ArrowRight size={14} />
                </button>
              </div>

              {turmas.length === 0 ? (
                <p className="mt-4 text-sm text-texto/45">Você ainda não tem turmas cadastradas.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {turmas.slice(0, 3).map((t) => (
                    <div key={t.id} className="rounded-2xl bg-card border p-5">
                      <div className="font-bold text-white text-lg">{t.nome}</div>
                      <div className="text-sm text-texto/50">{t.materia}</div>

                      <div className="mt-4 flex items-center justify-between text-xs text-texto/50">
                        <span>Meta de Conteúdo</span>
                        <span className="text-white font-semibold">{t.metaConteudo}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${t.metaConteudo}%` }} />
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div>
                          <div className="text-texto/45 text-xs">Alunos</div>
                          <div className="text-white font-semibold">{t.alunos}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-texto/45 text-xs">Média</div>
                          <div className="text-white font-semibold">{t.media != null ? `${t.media}%` : '—'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="mt-8 text-xl font-bold text-white">Próximas Aulas Agendadas</h2>
              {proximasAulas.length === 0 ? (
                <p className="mt-4 text-sm text-texto/45">Nenhuma aula agendada.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {proximasAulas.map((ev) => (
                    <div key={ev.id} className="rounded-2xl bg-card border p-4 flex items-center gap-4">
                      <div className="shrink-0 px-3 py-2 rounded-xl bg-white/5 text-sm font-semibold text-white">
                        {new Date(ev.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">{ev.titulo}</div>
                        <div className="text-xs text-texto/50 truncate">{[ev.salaNome, ev.descricao].filter(Boolean).join(' • ')}</div>
                      </div>
                      <span className="shrink-0 text-xs text-texto/50">{rotuloData(ev.inicio)}</span>
                      <ChevronRight size={16} className="shrink-0 text-texto/30" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4">Atividades Recentes dos Alunos</h2>
              <div className="rounded-2xl bg-card border p-5">
                {atividades.length === 0 ? (
                  <p className="text-sm text-texto/45">Nenhuma atividade recente.</p>
                ) : (
                  <div className="space-y-4">
                    {atividades.map((a, i) => {
                      const Icone = a.tipo === 'trilha' ? Star : a.tipo === 'pontos' ? Trophy : a.tipo === 'alerta' ? AlertTriangle : Send
                      const cor = a.tipo === 'alerta' ? '#F5C451' : a.tipo === 'trilha' ? '#C44DFF' : a.tipo === 'pontos' ? '#3FD08A' : '#2E5BFF'
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <span className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${cor}22`, color: cor }}>
                            <Icone size={15} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-white leading-snug">{a.texto}</div>
                            <div className="text-xs text-texto/45 mt-0.5">
                              {[a.salaNome, a.sub, tempoRelativo(a.quando)].filter(Boolean).join(' • ')}
                            </div>
                          </div>
                          {a.badge && (
                            <span
                              className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: a.tipo === 'alerta' ? '#F5C45122' : 'rgba(255,255,255,0.08)', color: a.tipo === 'alerta' ? '#F5C451' : '#fff' }}
                            >
                              {a.badge}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <button
                  onClick={() => navigate('/professor/relatorios')}
                  className="mt-4 flex items-center gap-1.5 text-xs font-medium text-azul hover:text-white transition"
                >
                  Ver histórico completo de atividades <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
