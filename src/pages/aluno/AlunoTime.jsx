import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { UsersRound, Trophy, Crown } from 'lucide-react'

export default function AlunoTime() {
  const { perfil } = useAuth()
  const [time, setTime] = useState(null)
  const [membros, setMembros] = useState([])
  const [ranking, setRanking] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: alunoData, error: eAluno } = await supabase.from('alunos').select('id, sala_id').eq('usuario_id', perfil.id).maybeSingle()
        if (eAluno) throw eAluno
        if (!alunoData) return

        const { data: membroData, error: eMembro } = await supabase.from('time_membros').select('time_id').eq('aluno_id', alunoData.id).maybeSingle()
        if (eMembro) throw eMembro

        if (alunoData.sala_id) {
          const { data: timesData } = await supabase.from('times').select('*').eq('sala_id', alunoData.sala_id).order('pontos', { ascending: false })
          setRanking(timesData || [])
        }

        if (!membroData) { setTime(null); setMembros([]); return }

        const { data: timeData, error: eTime } = await supabase.from('times').select('*').eq('id', membroData.time_id).maybeSingle()
        if (eTime) throw eTime
        setTime(timeData)

        const { data: membrosData, error: eMembros } = await supabase
          .from('time_membros').select('alunos(id, nome, pontos)').eq('time_id', membroData.time_id)
        if (eMembros) throw eMembros
        setMembros((membrosData || []).map((m) => m.alunos).filter(Boolean).sort((a, b) => b.pontos - a.pontos))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar seu time. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  if (carregando) return <div className="text-texto/50">Carregando seu time…</div>

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Meu Time</h1>
      <p className="mt-2 text-texto/60">Vocês crescem juntos.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {!time ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <UsersRound className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Você ainda não foi colocado em um time. Peça ao seu professor.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 rounded-2xl bg-card border p-6">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-xl">{time.nome}</div>
              <div className="flex items-center gap-1.5 font-bold text-white text-lg"><Trophy size={18} className="text-[#F5C451]" /> {time.pontos}</div>
            </div>
            <div className="mt-5 space-y-2">
              {membros.map((m, i) => (
                <div key={m.id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${m.id === undefined ? '' : 'bg-white/[0.03]'}`}>
                  <div className="flex items-center gap-2">
                    {i === 0 && <Crown size={14} className="text-[#F5C451]" />}
                    <span className="text-white/90">{m.nome}</span>
                  </div>
                  <span className="text-texto/60 text-sm">{m.pontos} pts</span>
                </div>
              ))}
            </div>
          </div>

          {ranking.length > 1 && (
            <div className="mt-6">
              <div className="text-sm font-semibold text-texto/50 uppercase tracking-wide mb-3">Ranking de times da sua turma</div>
              <div className="space-y-2">
                {ranking.map((t, i) => (
                  <div key={t.id} className={`rounded-xl border p-4 flex items-center justify-between ${t.id === time.id ? 'bg-azul/10 border-azul/40' : 'bg-card'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-texto/50 text-sm w-6">{i + 1}º</span>
                      <span className="text-white/90 font-medium">{t.nome}</span>
                    </div>
                    <span className="text-white font-bold">{t.pontos}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
