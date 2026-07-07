import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { GraduationCap, School, Mail } from 'lucide-react'

export default function DiretorProfessores() {
  const { perfil } = useAuth()
  const [professores, setProfessores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.escola_id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const [{ data: profData, error: e1 }, { data: salasData, error: e2 }] = await Promise.all([
          supabase.from('usuarios').select('*').eq('escola_id', perfil.escola_id).eq('perfil', 'professor').order('nome'),
          supabase.from('salas').select('id, nome, professor_id').eq('escola_id', perfil.escola_id),
        ])
        if (e1) throw e1
        if (e2) throw e2

        const salasPorProfessor = {}
        for (const s of salasData || []) {
          if (!s.professor_id) continue
          salasPorProfessor[s.professor_id] = [...(salasPorProfessor[s.professor_id] || []), s.nome]
        }
        setProfessores((profData || []).map((p) => ({ ...p, salas: salasPorProfessor[p.id] || [] })))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar os professores. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.escola_id])

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Professores</h1>
      <p className="mt-2 text-texto/60">Equipe docente da sua escola.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando professores…</div>
      ) : professores.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <GraduationCap className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            Nenhum professor cadastrado ainda. Novos acessos de professor são criados pela equipe Slark.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {professores.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-azul/30 flex items-center justify-center text-white font-mono">
                  {p.nome?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">{p.nome}</div>
                  <div className="flex items-center gap-1 text-texto/50 text-xs truncate"><Mail size={11} /> {p.email}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-1.5 text-xs text-texto/60 mb-1.5"><School size={13} /> Salas</div>
                {p.salas.length === 0 ? (
                  <span className="text-texto/40 text-xs">Nenhuma sala atribuída</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {p.salas.map((nome) => (
                      <span key={nome} className="text-xs px-2 py-0.5 rounded-full bg-azul/15 text-azul">{nome}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
