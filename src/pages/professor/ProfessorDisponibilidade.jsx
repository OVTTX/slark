import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CalendarClock, Loader2, Check } from 'lucide-react'
import { DIAS_SEMANA_GRADE, NOME_DIA_SEMANA } from '../../lib/gerarGrade'

const PERIODOS = [1, 2, 3, 4, 5, 6]

export default function ProfessorDisponibilidade() {
  const { perfil } = useAuth()
  const [disponibilidade, setDisponibilidade] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [alterando, setAlterando] = useState(null) // "dia-periodo" em andamento

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data, error } = await supabase.from('disponibilidade_professor').select('*').eq('professor_id', perfil.id)
      if (error) throw error
      setDisponibilidade(data || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar sua disponibilidade. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  const marcados = useMemo(
    () => new Set(disponibilidade.map((d) => `${d.dia_semana}-${d.periodo}`)),
    [disponibilidade],
  )

  async function alternar(dia, periodo) {
    const chave = `${dia}-${periodo}`
    setAlterando(chave)
    setErro('')
    try {
      if (marcados.has(chave)) {
        const existente = disponibilidade.find((d) => d.dia_semana === dia && d.periodo === periodo)
        const { error } = await supabase.from('disponibilidade_professor').delete().eq('id', existente.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('disponibilidade_professor').insert({
          professor_id: perfil.id,
          escola_id: perfil.escola_id,
          dia_semana: dia,
          periodo,
        })
        if (error) throw error
      }
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível atualizar esse horário.')
    } finally {
      setAlterando(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <CalendarClock className="text-azul" size={28} />
        <h1 className="text-4xl font-bold text-white tracking-tight">Minha Disponibilidade</h1>
      </div>
      <p className="mt-2 text-texto/60 max-w-2xl">
        Marque os dias e períodos em que você pode dar aula. A direção usa essa informação para montar o cronograma semanal das turmas automaticamente.
      </p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando disponibilidade…</div>
      ) : (
        <div className="mt-8 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse">
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
                  <td className="px-3 py-2.5 text-sm text-texto/60 font-medium">{periodo}º</td>
                  {DIAS_SEMANA_GRADE.map((dia) => {
                    const chave = `${dia}-${periodo}`
                    const ativo = marcados.has(chave)
                    const carregandoCelula = alterando === chave
                    return (
                      <td key={dia} className="px-2 py-2 text-center">
                        <button
                          onClick={() => alternar(dia, periodo)}
                          disabled={carregandoCelula}
                          className={`w-full h-10 rounded-lg flex items-center justify-center transition ${
                            ativo
                              ? 'bg-[#3FD08A]/20 text-[#3FD08A] border border-[#3FD08A]/40'
                              : 'bg-white/[0.03] text-texto/30 border border-transparent hover:border-azul/30 hover:text-texto/60'
                          }`}
                        >
                          {carregandoCelula ? <Loader2 size={14} className="animate-spin" /> : ativo ? <Check size={15} /> : null}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-texto/45">
        Dica: turmas de Fundamental 2 usam só até o 5º período; turmas de Ensino Médio usam até o 6º. Marcar o 6º período não atrapalha quem só dá aula no Fundamental.
      </p>
    </div>
  )
}
