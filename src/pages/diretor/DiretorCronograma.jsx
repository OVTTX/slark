import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CalendarRange, Wand2, Loader2, AlertTriangle, School } from 'lucide-react'
import { gerarGradeEscola, DIAS_SEMANA_GRADE, NOME_DIA_SEMANA, PERIODOS_POR_ETAPA } from '../../lib/gerarGrade'

export default function DiretorCronograma() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [atribuicoes, setAtribuicoes] = useState([])
  const [disponibilidades, setDisponibilidades] = useState([])
  const [grade, setGrade] = useState([])
  const [salaAtiva, setSalaAtiva] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [avisos, setAvisos] = useState([])

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const [
        { data: salasData, error: eSalas },
        { data: atribData, error: eAtrib },
        { data: dispData, error: eDisp },
        { data: gradeData, error: eGrade },
      ] = await Promise.all([
        supabase.from('salas').select('id, nome, etapa').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('sala_materias').select('*, materias(nome), usuarios:professor_id(nome)').eq('escola_id', perfil.escola_id),
        supabase.from('disponibilidade_professor').select('*').eq('escola_id', perfil.escola_id),
        supabase.from('grade_horarios').select('*, materias(nome), usuarios:professor_id(nome)').eq('escola_id', perfil.escola_id),
      ])
      if (eSalas) throw eSalas
      if (eAtrib) throw eAtrib
      if (eDisp) throw eDisp
      if (eGrade) throw eGrade

      setSalas(salasData || [])
      setSalaAtiva((atual) => atual && (salasData || []).some((s) => s.id === atual) ? atual : (salasData || [])[0]?.id || '')
      setAtribuicoes((atribData || []).map((a) => ({
        ...a,
        materiaNome: a.materias?.nome || '—',
        professorNome: a.usuarios?.nome || null,
      })))
      setDisponibilidades(dispData || [])
      setGrade(gradeData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os dados do cronograma. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.escola_id])

  async function gerarGrade() {
    if (!confirm('Isso substitui a grade atual de todas as salas da escola pela nova grade gerada automaticamente. Continuar?')) return
    setGerando(true)
    setErro('')
    setAvisos([])
    try {
      const { linhas, avisos: avisosGeracao } = gerarGradeEscola({
        salas: salas.map((s) => ({ ...s, escola_id: perfil.escola_id })),
        atribuicoes,
        disponibilidades,
      })

      const { error: eDelete } = await supabase.from('grade_horarios').delete().eq('escola_id', perfil.escola_id)
      if (eDelete) throw eDelete

      if (linhas.length > 0) {
        const { error: eInsert } = await supabase.from('grade_horarios').insert(linhas)
        if (eInsert) throw eInsert
      }

      setAvisos(avisosGeracao)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível gerar a grade automaticamente.')
    } finally {
      setGerando(false)
    }
  }

  const sala = salas.find((s) => s.id === salaAtiva)
  const periodosPorDia = PERIODOS_POR_ETAPA[sala?.etapa] || PERIODOS_POR_ETAPA.ensino_medio
  const periodos = useMemo(() => Array.from({ length: periodosPorDia }, (_, i) => i + 1), [periodosPorDia])

  const gradeDaSala = useMemo(() => grade.filter((g) => g.sala_id === salaAtiva), [grade, salaAtiva])
  const porSlot = useMemo(
    () => Object.fromEntries(gradeDaSala.map((g) => [`${g.dia_semana}-${g.periodo}`, g])),
    [gradeDaSala],
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <CalendarRange className="text-azul" size={28} />
            <h1 className="text-4xl font-bold text-white tracking-tight">Cronograma</h1>
          </div>
          <p className="mt-2 text-texto/60 max-w-2xl">
            Gere automaticamente a grade semanal de todas as turmas, com base na disponibilidade que cada professor marcou e nas aulas/semana definidas em "Matérias".
          </p>
        </div>
        <button
          onClick={gerarGrade} disabled={gerando || salas.length === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30 disabled:opacity-50"
        >
          {gerando ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
          {gerando ? 'Gerando…' : 'Gerar grade automaticamente'}
        </button>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {avisos.length > 0 && (
        <div className="mt-6 rounded-2xl bg-[#F5C451]/10 border border-[#F5C451]/25 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F5C451]">
            <AlertTriangle size={16} /> {avisos.length} aviso{avisos.length > 1 ? 's' : ''} sobre a grade gerada
          </div>
          <ul className="mt-2.5 space-y-1.5 text-xs text-texto/70 list-disc list-inside">
            {avisos.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando…</div>
      ) : salas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <School className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Cadastre salas e matérias antes de gerar o cronograma.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2">
            {salas.map((s) => (
              <button
                key={s.id} onClick={() => setSalaAtiva(s.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${salaAtiva === s.id ? 'bg-azul text-white' : 'bg-card border text-texto/60 hover:text-white'}`}
              >
                {s.nome}
              </button>
            ))}
          </div>

          {gradeDaSala.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
              <CalendarRange className="mx-auto text-azul/60" size={40} />
              <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Essa sala ainda não tem grade gerada.</p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
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
                  {periodos.map((periodo) => (
                    <tr key={periodo} className="border-b last:border-b-0">
                      <td className="px-3 py-3 text-sm text-texto/60 font-medium">{periodo}º</td>
                      {DIAS_SEMANA_GRADE.map((dia) => {
                        const aula = porSlot[`${dia}-${periodo}`]
                        return (
                          <td key={dia} className="px-2 py-2 text-center">
                            {aula ? (
                              <div className="rounded-lg bg-azul/10 border border-azul/25 px-2 py-2">
                                <div className="text-xs font-semibold text-white truncate">{aula.materias?.nome}</div>
                                <div className="text-[11px] text-texto/50 truncate">{aula.usuarios?.nome || '—'}</div>
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
        </>
      )}
    </div>
  )
}
