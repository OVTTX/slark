import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { School, Users, BookOpen, ClipboardList, Clock, Mail } from 'lucide-react'

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

export default function ProfessorInicio() {
  const { perfil } = useAuth()
  const [m, setM] = useState({ salas: 0, alunos: 0, trilhasPublicadas: 0, paraCorrigir: 0 })
  const [convitesPendentes, setConvitesPendentes] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      try {
        const { data: salasData } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
        const salaIds = (salasData || []).map((s) => s.id)

        const [alunosRes, trilhasRes, convitesRes] = await Promise.all([
          salaIds.length ? supabase.from('alunos').select('id', { count: 'exact', head: true }).in('sala_id', salaIds) : Promise.resolve({ count: 0 }),
          supabase.from('trilhas').select('id', { count: 'exact', head: true }).eq('professor_id', perfil.id).eq('status', 'publicado'),
          salaIds.length ? supabase.from('convites_aluno').select('*').in('sala_id', salaIds).eq('usado', false).order('criado_em', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
        ])

        let paraCorrigir = 0
        if (salaIds.length) {
          const { data: atividadesData } = await supabase.from('atividades').select('id').in('sala_id', salaIds)
          const atividadeIds = (atividadesData || []).map((a) => a.id)
          if (atividadeIds.length) {
            const { count } = await supabase.from('entregas').select('id', { count: 'exact', head: true }).in('atividade_id', atividadeIds).eq('status', 'entregue')
            paraCorrigir = count || 0
          }
        }

        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
        setConvitesPendentes((convitesRes.data || []).map((c) => ({ ...c, salaNome: salaPorId[c.sala_id]?.nome || '—' })))
        setM({
          salas: (salasData || []).length,
          alunos: alunosRes.count || 0,
          trilhasPublicadas: trilhasRes.count || 0,
          paraCorrigir,
        })
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
      <h1 className="text-4xl font-bold text-white tracking-tight">Olá, {perfil?.nome?.split(' ')[0]}!</h1>
      <p className="mt-2 text-texto/60">Visão geral das suas turmas.</p>

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando dados…</div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Kpi icon={School} rotulo="Minhas salas" valor={m.salas} cor="#2E5BFF" />
            <Kpi icon={Users} rotulo="Alunos" valor={m.alunos} cor="#3FD08A" />
            <Kpi icon={BookOpen} rotulo="Trilhas publicadas" valor={m.trilhasPublicadas} cor="#C44DFF" />
            <Kpi icon={ClipboardList} rotulo="Para corrigir" valor={m.paraCorrigir} cor="#F5C451" />
          </div>

          <div className="mt-6 rounded-2xl bg-card border p-6">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Clock size={18} className="text-azul" /> Convites pendentes
            </div>
            {convitesPendentes.length === 0 ? (
              <p className="mt-4 text-sm text-texto/50">Nenhum convite de aluno pendente.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {convitesPendentes.map((c) => (
                  <li key={c.id} className="text-sm flex items-center justify-between">
                    <div>
                      <span className="text-white/90 font-medium">{c.nome}</span>
                      <span className="flex items-center gap-1 text-texto/45 text-xs mt-0.5"><Mail size={11} /> {c.email}</span>
                    </div>
                    <span className="text-texto/50 text-xs">{c.salaNome}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
