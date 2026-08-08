import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/StatCard'
import {
  Award, Rocket, GraduationCap, Flame, Clock3, Bell,
  Crown, Brain, Lightbulb, MessageCircle, HeartHandshake, Eye, Search,
  Play, ArrowRight, CheckCircle2,
} from 'lucide-react'

// selos antigos guardam um emoji em "icone"; os ligados a características
// guardam o nome de um ícone lucide (ex: "Lightbulb").
const ICONES_LUCIDE = { Crown, Brain, Lightbulb, MessageCircle, HeartHandshake, Eye, Search }

function IconeSelo({ icone, size = 32, className = '' }) {
  const Comp = icone && ICONES_LUCIDE[icone]
  if (Comp) return <Comp size={size} className={className} />
  if (!icone) return <Award size={size} className={className} />
  return <span className="leading-none" style={{ fontSize: size }}>{icone}</span>
}

function tempoRelativo(iso) {
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

export default function AlunoInicio() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [aluno, setAluno] = useState(null)
  const [sala, setSala] = useState(null)
  const [selos, setSelos] = useState([])
  const [trilhaRetomar, setTrilhaRetomar] = useState(null) // { trilha, percentual }
  const [materiaPorId, setMateriaPorId] = useState({})
  const [aprendizado, setAprendizado] = useState([]) // avaliacoes_aprendizado do aluno
  const [pontuacoesRecentes, setPontuacoesRecentes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: alunoData, error: eAluno } = await supabase
          .from('alunos').select('*, caracteristicas(nome, cor, descricao)').eq('usuario_id', perfil.id).maybeSingle()
        if (eAluno) throw eAluno
        setAluno(alunoData)

        if (alunoData?.sala_id) {
          const { data: salaData } = await supabase.from('salas').select('nome, serie').eq('id', alunoData.sala_id).maybeSingle()
          setSala(salaData)
        }

        if (alunoData?.id) {
          const [{ data: selosData }, { data: materiasData }, { data: aprendizadoData }, { data: pontData }] = await Promise.all([
            supabase.from('aluno_selos').select('concedido_em, selos(nome, descricao, icone, pontos_necessarios)').eq('aluno_id', alunoData.id),
            supabase.from('materias').select('id, nome').eq('escola_id', perfil.escola_id),
            supabase.from('avaliacoes_aprendizado').select('materia_id, valor, data').eq('aluno_id', alunoData.id),
            supabase.from('pontuacoes').select('pontos, motivo, criada_em').eq('aluno_id', alunoData.id).order('criada_em', { ascending: false }).limit(4),
          ])
          setSelos(selosData || [])
          setMateriaPorId(Object.fromEntries((materiasData || []).map((m) => [m.id, m.nome])))
          setAprendizado(aprendizadoData || [])
          setPontuacoesRecentes(pontData || [])

          await carregarTrilhaParaRetomar(alunoData)
        }
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar seu painel. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }

    async function carregarTrilhaParaRetomar(alunoData) {
      const { data: trilhasData } = await supabase
        .from('trilhas').select('*, trilha_blocos(*)')
        .eq('escola_id', perfil.escola_id).eq('status', 'publicado')
        .or(`sala_id.eq.${alunoData.sala_id},sala_id.is.null`)
        .order('criada_em', { ascending: false })

      const trilhas = (trilhasData || [])
        .map((t) => ({ ...t, blocos: (t.trilha_blocos || []).sort((a, b) => a.ordem - b.ordem) }))
        .filter((t) => t.blocos.length > 0)
      if (trilhas.length === 0) return

      const { data: conclusoesData } = await supabase.from('trilha_conclusoes').select('trilha_id').eq('aluno_id', alunoData.id)
      const concluidas = new Set((conclusoesData || []).map((c) => c.trilha_id))
      const pendentes = trilhas.filter((t) => !concluidas.has(t.id))
      if (pendentes.length === 0) return

      const { data: progressoData } = await supabase
        .from('trilha_bloco_progresso').select('bloco_id, trilha_id')
        .eq('aluno_id', alunoData.id).in('trilha_id', pendentes.map((t) => t.id))

      const progressoPorTrilha = {}
      for (const p of progressoData || []) {
        if (!progressoPorTrilha[p.trilha_id]) progressoPorTrilha[p.trilha_id] = new Set()
        progressoPorTrilha[p.trilha_id].add(p.bloco_id)
      }

      // prioriza uma trilha já iniciada; senão, a mais recente disponível
      const emAndamento = pendentes.find((t) => progressoPorTrilha[t.id]?.size > 0)
      const escolhida = emAndamento || pendentes[0]
      const feitos = progressoPorTrilha[escolhida.id]?.size || 0
      const percentual = escolhida.blocos.length ? Math.round((feitos / escolhida.blocos.length) * 100) : 0
      setTrilhaRetomar({ trilha: escolhida, percentual })
    }

    carregar()
  }, [perfil?.id, perfil?.escola_id])

  if (carregando) return <div className="text-texto/50">Carregando seu painel…</div>

  if (!aluno) {
    return (
      <div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Meu Painel</h1>
        <p className="mt-4 text-texto/60">{erro || 'Ainda não encontramos seu cadastro de aluno. Fale com seu professor.'}</p>
      </div>
    )
  }

  // Progresso médio das matérias: média geral de todas as avaliações de aprendizado já lançadas.
  const porMateria = {}
  for (const a of aprendizado) {
    if (!porMateria[a.materia_id]) porMateria[a.materia_id] = []
    porMateria[a.materia_id].push(a.valor)
  }
  const mediasPorMateria = Object.entries(porMateria).map(([id, vals]) => ({
    nome: materiaPorId[id] || 'Matéria',
    media: vals.reduce((s, v) => s + v, 0) / vals.length,
  }))
  const progressoMedio = mediasPorMateria.length
    ? Math.round(mediasPorMateria.reduce((s, m) => s + m.media, 0) / mediasPorMateria.length)
    : null
  const materiaDestaque = mediasPorMateria.length
    ? mediasPorMateria.reduce((a, b) => (b.media > a.media ? b : a))
    : null

  // PIA (Porcentagem Imediata de Aprendizado): média só do lançamento mais recente de cada matéria.
  const maisRecentePorMateria = {}
  for (const a of aprendizado) {
    const atual = maisRecentePorMateria[a.materia_id]
    if (!atual || a.data > atual.data) maisRecentePorMateria[a.materia_id] = a
  }
  const valoresRecentes = Object.values(maisRecentePorMateria).map((a) => a.valor)
  const pia = valoresRecentes.length
    ? Math.round(valoresRecentes.reduce((s, v) => s + v, 0) / valoresRecentes.length)
    : null

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-texto/45">Boas-vindas à Slark, a nova educação.</p>
          <h1 className="mt-1 text-4xl font-bold text-white tracking-tight">Olá, {aluno.nome.split(' ')[0]}!</h1>
        </div>
        <button className="shrink-0 w-11 h-11 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-center text-texto/60 hover:text-white transition">
          <Bell size={17} />
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={Rocket} label="Sua Pontuação" value={aluno.pontos} sub="Pontos acumulados" />
        <StatCard
          icon={GraduationCap}
          label="Progresso médio das matérias"
          value={progressoMedio != null ? `${progressoMedio}%` : '—'}
          sub={materiaDestaque ? `${Math.round(materiaDestaque.media)}% é de ${materiaDestaque.nome}` : 'Ainda sem avaliações lançadas'}
        />
        <StatCard
          icon={Flame}
          label="PIA"
          value={pia != null ? `${pia}%` : '—'}
          sub="Porcentagem Imediata de Aprendizado"
        />
        <StatCard
          icon={Clock3}
          label="Sua característica"
          value={aluno.caracteristicas?.nome || '—'}
          sub="Este mês"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-3">Sua Trilha Recomendada</h2>
          <div className="rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6">
            {trilhaRetomar ? (
              <>
                <span className="inline-flex items-center text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded-full bg-white/10 text-texto/70">
                  Módulo recomendado por IA
                </span>
                <h2 className="mt-3 text-2xl font-bold text-white">{trilhaRetomar.trilha.titulo}</h2>
                {trilhaRetomar.trilha.descricao && (
                  <p className="mt-1.5 text-sm text-texto/60 leading-relaxed">{trilhaRetomar.trilha.descricao}</p>
                )}

                <div className="mt-5 flex items-center justify-between text-xs text-texto/50">
                  <span>A sua sala está indo bem!</span>
                  <span className="text-white font-semibold">{trilhaRetomar.percentual}% concluído</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${trilhaRetomar.percentual}%`, background: 'linear-gradient(to right, #FF6FA5, #5B4CFF)' }}
                  />
                </div>

                <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    onClick={() => navigate(`/aluno/trilhas/${trilhaRetomar.trilha.id}`)}
                    className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-profundo font-semibold hover:bg-white/90 transition"
                  >
                    Veja trilha teórica <Play size={14} fill="currentColor" />
                  </button>
                  <p className="text-xs text-texto/45 leading-relaxed">Esteja preparado antes de entrar na sala (não é obrigatório, mas é bom :))</p>
                </div>
              </>
            ) : (
              <div className="text-sm text-texto/50 py-6 text-center">Nenhuma trilha disponível pra recomendar agora.</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-3">Atividades Recentes</h2>
          <div className="rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6">
            {pontuacoesRecentes.length === 0 ? (
              <p className="text-sm text-texto/45">Ainda sem atividades pontuadas.</p>
            ) : (
              <div className="space-y-3">
                {pontuacoesRecentes.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/90 mt-0.5">
                      <CheckCircle2 size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{p.motivo || 'Pontuação'}</div>
                      <div className="text-xs text-texto/45">{tempoRelativo(p.criada_em)}</div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white">
                      {p.pontos >= 0 ? '+' : ''}{p.pontos} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate('/aluno/competencias')}
              className="mt-4 flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition"
              style={{ color: '#FF6FA5' }}
            >
              Ver histórico completo de pontos <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {aluno.caracteristicas?.descricao && (
        <div className="mt-6 rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6">
          <div className="text-sm text-texto/60 mb-2">Sobre sua característica</div>
          <span
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ background: `${aluno.caracteristicas.cor}22`, color: aluno.caracteristicas.cor }}
          >
            {aluno.caracteristicas.nome}
          </span>
          <p className="mt-3 text-sm text-texto/60 leading-relaxed">{aluno.caracteristicas.descricao}</p>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center gap-2 text-white font-semibold mb-3">
          <Award size={18} className="text-azul" /> Meus selos
        </div>
        {selos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-azul/30 bg-white/[0.02] backdrop-blur-xl p-8 text-center text-texto/60 text-sm">
            Ainda sem selos — continue somando pontos!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {selos.map((s, i) => (
              <div key={i} className="rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 text-center">
                <div className="h-9 flex items-center justify-center">
                  <IconeSelo icone={s.selos.icone} size={30} className="text-azul/80" />
                </div>
                <div className="mt-2 font-semibold text-white text-sm">{s.selos.nome}</div>
                <div className="text-xs text-texto/50 mt-1">{s.selos.descricao}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
