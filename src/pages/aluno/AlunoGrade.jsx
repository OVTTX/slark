import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CalendarDays } from 'lucide-react'
import { DIAS_SEMANA_GRADE, NOME_DIA_SEMANA } from '../../lib/gerarGrade'

const PERIODOS = [1, 2, 3, 4, 5, 6]

export default function AlunoGrade() {
  const { perfil } = useAuth()
  const [grade, setGrade] = useState([])
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
        if (!alunoData?.sala_id) { setGrade([]); return }

        const { data, error } = await supabase
          .from('grade_horarios')
          .select('*, materias(nome), usuarios:professor_id(nome)')
          .eq('sala_id', alunoData.sala_id)
        if (error) throw error
        setGrade(data || [])
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar a grade. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  const porSlot = useMemo(
    () => Object.fromEntries(grade.map((g) => [`${g.dia_semana}-${g.periodo}`, g])),
    [grade],
  )

  return (
    <div>
      <div className="flex items-center gap-3">
        <CalendarDays className="text-azul" size={28} />
        <h1 className="text-4xl font-bold text-white tracking-tight">Grade de Aulas</h1>
      </div>
      <p className="mt-2 text-texto/60">O cronograma semanal da sua turma.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando grade…</div>
      ) : grade.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <CalendarDays className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">A grade da sua turma ainda não foi montada pela direção.</p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-3 text-left text-xs font-semibold text-texto/50 uppercase tracking-wide">Período</th>
                {DIAS_SEMANA_GRADE.map((dia) => (
                  <th key={dia} className="px-3 py-3 text-center text-xs font-semibold text-texto/50 uppercase tracking-wide">
                    {NOME_DIA_SEMANA[dia]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODOS.map((periodo) => (
                <tr key={periodo} className="border-b last:border-b-0">
                  <td className="px-3 py-3 text-sm text-texto/60 font-medium">{periodo}º</td>
                  {DIAS_SEMANA_GRADE.map((dia) => {
                    const aula = porSlot[`${dia}-${periodo}`]
                    return (
                      <td key={dia} className="px-2 py-2 text-center">
                        {aula ? (
                          <div className="rounded-lg bg-azul/10 border border-azul/25 px-2 py-2">
                            <div className="text-xs font-semibold text-white truncate">{aula.materias?.nome}</div>
                            <div className="text-[11px] text-texto/50 truncate">{aula.usuarios?.nome}</div>
                          </div>
                        ) : (
                          <div className="h-full py-2 text-texto/20 text-xs">—</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
