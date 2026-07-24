import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, School, GraduationCap, Building2, BarChart3 } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ComposedChart, Line, Cell,
} from 'recharts'

const MESES_JANELA = 6 // quantos meses mostrar na evolução de pontos/selos

// Card de KPI (mesmo padrão visual do resto do admin)
function Kpi({ icon: Icon, rotulo, valor, cor }) {
  return (
    <div className="rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-texto/60">{rotulo}</div>
          <div className="mt-1 text-3xl font-bold text-white">{valor}</div>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${cor}22` }}>
          <Icon size={20} style={{ color: cor }} />
        </div>
      </div>
    </div>
  )
}

// Tooltip com o visual do app em vez do branco padrão do recharts
function TooltipEscuro({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-bg-2 border border-azul/20 px-3.5 py-2.5 text-xs shadow-xl">
      {label && <div className="text-texto/50 mb-1">{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 text-white/90">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function CardGrafico({ titulo, subtitulo, children }) {
  return (
    <div className="rounded-2xl bg-card border p-6">
      <div className="font-semibold text-white">{titulo}</div>
      {subtitulo && <p className="text-xs text-texto/50 mt-0.5">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

export default function AdminMetricas() {
  const [kpis, setKpis] = useState({ alunos: 0, turmas: 0, professores: 0, escolasAtivas: 0 })
  const [distribuicaoCaracteristicas, setDistribuicaoCaracteristicas] = useState([])
  const [evolucao, setEvolucao] = useState([])
  const [engajamento, setEngajamento] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        // ---------- KPIs ----------
        const [{ count: totalAlunos }, { count: totalTurmas }, { count: totalProfessores }, { count: escolasAtivas }] = await Promise.all([
          supabase.from('alunos').select('id', { count: 'exact', head: true }),
          supabase.from('salas').select('id', { count: 'exact', head: true }),
          supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('perfil', 'professor'),
          supabase.from('escolas').select('id', { count: 'exact', head: true }).eq('ativa', true),
        ])
        setKpis({
          alunos: totalAlunos || 0,
          turmas: totalTurmas || 0,
          professores: totalProfessores || 0,
          escolasAtivas: escolasAtivas || 0,
        })

        // ---------- Distribuição de características ----------
        const [{ data: caracteristicasData, error: eCarac }, { data: alunosCaracData, error: eAlunosCarac }] = await Promise.all([
          supabase.from('caracteristicas').select('id, nome, cor'),
          supabase.from('alunos').select('caracteristica_id'),
        ])
        if (eCarac) throw eCarac
        if (eAlunosCarac) throw eAlunosCarac

        const contagemPorCaracteristica = {}
        for (const a of alunosCaracData || []) {
          if (!a.caracteristica_id) continue
          contagemPorCaracteristica[a.caracteristica_id] = (contagemPorCaracteristica[a.caracteristica_id] || 0) + 1
        }
        setDistribuicaoCaracteristicas(
          (caracteristicasData || [])
            .map((c) => ({ nome: c.nome, cor: c.cor, quantidade: contagemPorCaracteristica[c.id] || 0 }))
            .sort((a, b) => b.quantidade - a.quantidade),
        )

        // ---------- Evolução de pontos e selos (últimos N meses) ----------
        const inicioJanela = new Date()
        inicioJanela.setDate(1)
        inicioJanela.setMonth(inicioJanela.getMonth() - (MESES_JANELA - 1))
        inicioJanela.setHours(0, 0, 0, 0)

        const [{ data: pontuacoesData, error: ePont }, { data: selosData, error: eSelosConc }] = await Promise.all([
          supabase.from('pontuacoes').select('pontos, criada_em').gte('criada_em', inicioJanela.toISOString()),
          supabase.from('aluno_selos').select('concedido_em').gte('concedido_em', inicioJanela.toISOString()),
        ])
        if (ePont) throw ePont
        if (eSelosConc) throw eSelosConc

        const buckets = []
        for (let i = 0; i < MESES_JANELA; i++) {
          const d = new Date(inicioJanela)
          d.setMonth(d.getMonth() + i)
          buckets.push({ chave: `${d.getFullYear()}-${d.getMonth()}`, mes: d.toLocaleDateString('pt-BR', { month: 'short' }), pontos: 0, selos: 0 })
        }
        const bucketPorChave = Object.fromEntries(buckets.map((b) => [b.chave, b]))
        for (const p of pontuacoesData || []) {
          const d = new Date(p.criada_em)
          const chave = `${d.getFullYear()}-${d.getMonth()}`
          if (bucketPorChave[chave]) bucketPorChave[chave].pontos += p.pontos || 0
        }
        for (const s of selosData || []) {
          const d = new Date(s.concedido_em)
          const chave = `${d.getFullYear()}-${d.getMonth()}`
          if (bucketPorChave[chave]) bucketPorChave[chave].selos += 1
        }
        setEvolucao(buckets)

        // ---------- Engajamento por turma (taxa de entrega + pontos médios) ----------
        const [{ data: salasData, error: eSalas }, { data: alunosData, error: eAlunosSala }, { data: atividadesData, error: eAtiv }] = await Promise.all([
          supabase.from('salas').select('id, nome'),
          supabase.from('alunos').select('id, sala_id, pontos'),
          supabase.from('atividades').select('id, sala_id'),
        ])
        if (eSalas) throw eSalas
        if (eAlunosSala) throw eAlunosSala
        if (eAtiv) throw eAtiv

        const atividadeIds = (atividadesData || []).map((a) => a.id)
        let entregasData = []
        if (atividadeIds.length > 0) {
          const { data, error: eEnt } = await supabase.from('entregas').select('atividade_id, status').in('atividade_id', atividadeIds)
          if (eEnt) throw eEnt
          entregasData = data || []
        }

        const salaDaAtividade = Object.fromEntries((atividadesData || []).map((a) => [a.id, a.sala_id]))
        const atividadesPorSala = {}
        for (const a of atividadesData || []) atividadesPorSala[a.sala_id] = (atividadesPorSala[a.sala_id] || 0) + 1
        const entreguesPorSala = {}
        for (const e of entregasData) {
          if (e.status !== 'entregue' && e.status !== 'corrigida') continue
          const salaId = salaDaAtividade[e.atividade_id]
          entreguesPorSala[salaId] = (entreguesPorSala[salaId] || 0) + 1
        }

        const listaEngajamento = (salasData || []).map((sala) => {
          const alunosDaTurma = (alunosData || []).filter((a) => a.sala_id === sala.id)
          const qtdAlunos = alunosDaTurma.length
          const qtdAtividades = atividadesPorSala[sala.id] || 0
          const esperadas = qtdAlunos * qtdAtividades
          const entregues = entreguesPorSala[sala.id] || 0
          const taxaEntrega = esperadas > 0 ? Math.round((entregues / esperadas) * 100) : 0
          const pontosMedios = qtdAlunos > 0 ? Math.round(alunosDaTurma.reduce((s, a) => s + (a.pontos || 0), 0) / qtdAlunos) : 0
          return { nome: sala.nome, taxaEntrega, pontosMedios }
        })
        setEngajamento(listaEngajamento)
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar as métricas. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const maiorContagemCaracteristica = useMemo(
    () => Math.max(1, ...distribuicaoCaracteristicas.map((c) => c.quantidade)),
    [distribuicaoCaracteristicas],
  )

  return (
    <div>
      <div className="flex items-center gap-3">
        <BarChart3 className="text-azul" size={28} />
        <h1 className="text-4xl font-bold text-white tracking-tight">Métricas da Rede</h1>
      </div>
      <p className="mt-2 text-texto/60">Visão pedagógica de todas as escolas: alunos, turmas, características e engajamento.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando métricas…</div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Kpi icon={Users} rotulo="Alunos" valor={kpis.alunos} cor="#3FD08A" />
            <Kpi icon={School} rotulo="Turmas" valor={kpis.turmas} cor="#2E5BFF" />
            <Kpi icon={GraduationCap} rotulo="Professores" valor={kpis.professores} cor="#F5C451" />
            <Kpi icon={Building2} rotulo="Escolas ativas" valor={kpis.escolasAtivas} cor="#C44DFF" />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <CardGrafico titulo="Distribuição de características" subtitulo="Quantos alunos têm cada característica mapeada pela IA">
              {distribuicaoCaracteristicas.length === 0 ? (
                <div className="text-sm text-texto/45 py-10 text-center">Nenhuma característica cadastrada ainda.</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, distribuicaoCaracteristicas.length * 44)}>
                  <BarChart data={distribuicaoCaracteristicas} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="rgb(var(--c-onbg) / .08)" />
                    <XAxis type="number" allowDecimals={false} stroke="rgb(var(--c-texto) / .5)" fontSize={12} domain={[0, maiorContagemCaracteristica]} />
                    <YAxis type="category" dataKey="nome" stroke="rgb(var(--c-texto) / .7)" fontSize={12} width={100} />
                    <Tooltip content={<TooltipEscuro />} cursor={{ fill: 'rgb(var(--c-onbg) / .04)' }} />
                    <Bar dataKey="quantidade" name="Alunos" radius={[0, 6, 6, 0]}>
                      {distribuicaoCaracteristicas.map((c) => <Cell key={c.nome} fill={c.cor || '#2E5BFF'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardGrafico>

            <CardGrafico titulo="Evolução de pontos e selos" subtitulo={`Últimos ${MESES_JANELA} meses, rede toda`}>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={evolucao} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid stroke="rgb(var(--c-onbg) / .08)" />
                  <XAxis dataKey="mes" stroke="rgb(var(--c-texto) / .7)" fontSize={12} />
                  <YAxis yAxisId="pontos" stroke="rgba(46,91,255,.7)" fontSize={12} width={40} />
                  <YAxis yAxisId="selos" orientation="right" allowDecimals={false} stroke="rgba(245,196,81,.8)" fontSize={12} width={30} />
                  <Tooltip content={<TooltipEscuro />} cursor={{ fill: 'rgb(var(--c-onbg) / .04)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--c-texto))' }} />
                  <Bar yAxisId="selos" dataKey="selos" name="Selos concedidos" fill="#F5C451" radius={[4, 4, 0, 0]} barSize={18} />
                  <Line yAxisId="pontos" type="monotone" dataKey="pontos" name="Pontos gerados" stroke="#2E5BFF" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardGrafico>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <CardGrafico titulo="Taxa de entrega por turma" subtitulo="% de atividades entregues sobre o total esperado">
              {engajamento.length === 0 ? (
                <div className="text-sm text-texto/45 py-10 text-center">Nenhuma turma cadastrada ainda.</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, engajamento.length * 44)}>
                  <BarChart data={engajamento} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="rgb(var(--c-onbg) / .08)" />
                    <XAxis type="number" domain={[0, 100]} unit="%" stroke="rgb(var(--c-texto) / .5)" fontSize={12} />
                    <YAxis type="category" dataKey="nome" stroke="rgb(var(--c-texto) / .7)" fontSize={12} width={100} />
                    <Tooltip content={<TooltipEscuro />} cursor={{ fill: 'rgb(var(--c-onbg) / .04)' }} />
                    <Bar dataKey="taxaEntrega" name="Taxa de entrega (%)" fill="#3FD08A" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardGrafico>

            <CardGrafico titulo="Pontos médios por turma" subtitulo="Média de alunos.pontos dentro de cada turma">
              {engajamento.length === 0 ? (
                <div className="text-sm text-texto/45 py-10 text-center">Nenhuma turma cadastrada ainda.</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, engajamento.length * 44)}>
                  <BarChart data={engajamento} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="rgb(var(--c-onbg) / .08)" />
                    <XAxis type="number" allowDecimals={false} stroke="rgb(var(--c-texto) / .5)" fontSize={12} />
                    <YAxis type="category" dataKey="nome" stroke="rgb(var(--c-texto) / .7)" fontSize={12} width={100} />
                    <Tooltip content={<TooltipEscuro />} cursor={{ fill: 'rgb(var(--c-onbg) / .04)' }} />
                    <Bar dataKey="pontosMedios" name="Pontos médios" fill="#2E5BFF" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardGrafico>
          </div>
        </>
      )}
    </div>
  )
}
