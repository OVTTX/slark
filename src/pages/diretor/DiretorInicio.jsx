import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { School, Users, GraduationCap, Trophy, CreditCard, Calendar } from 'lucide-react'

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

const STATUS_COR = { trial: '#F5C451', ativa: '#3FD08A', inadimplente: '#FF6B6B', cancelada: '#8892B0' }
const STATUS_ROTULO = { trial: 'Trial', ativa: 'Ativa', inadimplente: 'Inadimplente', cancelada: 'Cancelada' }

export default function DiretorInicio() {
  const { perfil } = useAuth()
  const [m, setM] = useState({ salas: 0, professores: 0, alunos: 0, pontos: 0 })
  const [assinatura, setAssinatura] = useState(null)
  const [proximosEventos, setProximosEventos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!perfil?.escola_id) return
    async function carregar() {
      try {
        const [salas, professores, alunos, assinaturaRes, eventosRes] = await Promise.all([
          supabase.from('salas').select('id', { count: 'exact', head: true }).eq('escola_id', perfil.escola_id),
          supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('escola_id', perfil.escola_id).eq('perfil', 'professor'),
          supabase.from('alunos').select('pontos').eq('escola_id', perfil.escola_id),
          supabase.from('assinaturas').select('*').eq('escola_id', perfil.escola_id).order('criada_em', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('eventos').select('*').eq('escola_id', perfil.escola_id).gte('inicio', new Date().toISOString()).order('inicio', { ascending: true }).limit(4),
        ])
        const pontos = (alunos.data || []).reduce((s, a) => s + (a.pontos || 0), 0)
        setM({
          salas: salas.count || 0,
          professores: professores.count || 0,
          alunos: (alunos.data || []).length,
          pontos,
        })
        setAssinatura(assinaturaRes.data || null)
        setProximosEventos(eventosRes.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.escola_id])

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Dashboard do Diretor</h1>
      <p className="mt-2 text-texto/60">Visão geral da {perfil?.escolas?.nome || 'sua escola'}.</p>

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando dados…</div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Kpi icon={School} rotulo="Salas" valor={m.salas} cor="#2E5BFF" />
            <Kpi icon={GraduationCap} rotulo="Professores" valor={m.professores} cor="#C44DFF" />
            <Kpi icon={Users} rotulo="Alunos" valor={m.alunos} cor="#3FD08A" />
            <Kpi icon={Trophy} rotulo="Pontos Slark gerados" valor={m.pontos} cor="#F5C451" />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-card border p-6">
              <div className="flex items-center gap-2 text-white font-semibold">
                <CreditCard size={18} className="text-azul" /> Assinatura
              </div>
              {assinatura ? (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: `${STATUS_COR[assinatura.status]}22`, color: STATUS_COR[assinatura.status] }}
                    >
                      {STATUS_ROTULO[assinatura.status]}
                    </span>
                  </div>
                  <div className="text-texto/60">R$ {Number(assinatura.preco_por_aluno).toLocaleString('pt-BR')} por aluno · {assinatura.qtd_alunos_contratada} contratados</div>
                  {assinatura.proxima_cobranca && (
                    <div className="text-texto/60">Próxima cobrança: {new Date(assinatura.proxima_cobranca).toLocaleDateString('pt-BR')}</div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-texto/50">Nenhuma assinatura encontrada.</p>
              )}
            </div>

            <div className="rounded-2xl bg-card border p-6">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Calendar size={18} className="text-azul" /> Próximos eventos
              </div>
              {proximosEventos.length === 0 ? (
                <p className="mt-4 text-sm text-texto/50">Nada agendado por enquanto.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {proximosEventos.map((ev) => (
                    <li key={ev.id} className="text-sm flex items-center justify-between">
                      <span className="text-white/90">{ev.titulo}</span>
                      <span className="text-texto/50 text-xs">{new Date(ev.inicio).toLocaleDateString('pt-BR')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
