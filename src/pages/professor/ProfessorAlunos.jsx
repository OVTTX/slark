import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ConvidarAlunoModal from '../../components/ConvidarAlunoModal'
import { Users, School, Trophy, Mail, Clock } from 'lucide-react'

export default function ProfessorAlunos() {
  const { perfil } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [convites, setConvites] = useState([])
  const [salas, setSalas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
      if (eSalas) throw eSalas
      const salaIds = (salasData || []).map((s) => s.id)
      const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
      setSalas(salasData || [])

      if (salaIds.length === 0) { setAlunos([]); setConvites([]); return }

      const [{ data: alunosData, error: eAl }, { data: convitesData, error: eConv }] = await Promise.all([
        supabase.from('alunos').select('*').in('sala_id', salaIds).order('nome'),
        supabase.from('convites_aluno').select('*').in('sala_id', salaIds).eq('usado', false),
      ])
      if (eAl) throw eAl
      if (eConv) throw eConv

      setAlunos((alunosData || []).map((a) => ({ ...a, salaNome: salaPorId[a.sala_id]?.nome || '—' })))
      setConvites((convitesData || []).map((c) => ({ ...c, salaNome: salaPorId[c.sala_id]?.nome || '—' })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os alunos. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Alunos</h1>
          <p className="mt-2 text-texto/60">Os alunos das suas turmas.</p>
        </div>
        <ConvidarAlunoModal salas={salas} onConvidado={carregar} />
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando alunos…</div>
      ) : (
        <>
          {convites.length > 0 && (
            <div className="mt-8">
              <div className="text-sm font-semibold text-texto/50 uppercase tracking-wide mb-3">Convites pendentes</div>
              <div className="space-y-2">
                {convites.map((c) => (
                  <div key={c.id} className="rounded-xl bg-card/50 border border-dashed border-azul/30 p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-azul/15 flex items-center justify-center text-azul shrink-0">
                      <Clock size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">{c.nome}</div>
                      <div className="flex items-center gap-1 text-texto/50 text-xs"><Mail size={11} /> {c.email}</div>
                    </div>
                    <span className="text-xs text-texto/45">{c.salaNome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            {alunos.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
                <Users className="mx-auto text-azul/60" size={40} />
                <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
                  Nenhum aluno nas suas turmas ainda. Convide o primeiro pelo botão acima.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-card border overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-texto/50 border-b">
                      <th className="px-6 py-4 font-medium">Aluno</th>
                      <th className="px-6 py-4 font-medium">Sala</th>
                      <th className="px-6 py-4 font-medium">Nível</th>
                      <th className="px-6 py-4 font-medium text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((a) => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                        <td className="px-6 py-4 font-semibold text-white">{a.nome}</td>
                        <td className="px-6 py-4 text-texto/70">
                          <div className="flex items-center gap-1.5"><School size={13} className="text-texto/40" />{a.salaNome}</div>
                        </td>
                        <td className="px-6 py-4 text-texto/70">Nível {a.nivel}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5 font-bold text-white">
                            <Trophy size={14} className="text-[#F5C451]" /> {a.pontos}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
