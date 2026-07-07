import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Trophy, UsersRound } from 'lucide-react'

const CORES_PODIO = ['#F5C451', '#C0C0C0', '#CD7F32']

export default function ProfessorPlacar() {
  const { perfil } = useAuth()
  const [times, setTimes] = useState([])
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
        const salaIds = (salasData || []).map((s) => s.id)
        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
        if (salaIds.length === 0) { setTimes([]); return }

        const { data: timesData, error: eTimes } = await supabase
          .from('times').select('*').in('sala_id', salaIds).order('pontos', { ascending: false })
        if (eTimes) throw eTimes
        setTimes((timesData || []).map((t) => ({ ...t, salaNome: salaPorId[t.sala_id]?.nome || '—' })))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar o placar. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  const maior = times[0]?.pontos || 1

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Placar das Equipes</h1>
      <p className="mt-2 text-texto/60">Acompanhe a disputa entre as equipes das suas turmas.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando placar…</div>
      ) : times.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <UsersRound className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma equipe criada ainda. Crie equipes na tela "Equipes".</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {times.map((t, i) => (
            <div key={t.id} className="rounded-2xl bg-card border p-5 flex items-center gap-5 transition hover:-translate-y-0.5 hover:border-azul/40">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
                style={{
                  background: i < 3 ? `${CORES_PODIO[i]}22` : 'rgba(255,255,255,0.05)',
                  color: i < 3 ? CORES_PODIO[i] : 'rgba(255,255,255,0.5)',
                }}
              >
                {i + 1}º
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{t.nome}</div>
                <div className="text-xs text-texto/50">{t.salaNome}</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${Math.max(4, (t.pontos / maior) * 100)}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 justify-end font-bold text-white text-lg shrink-0">
                <Trophy size={16} className="text-[#F5C451]" /> {t.pontos}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
