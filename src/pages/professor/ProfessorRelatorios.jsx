import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BarChart3 } from 'lucide-react'

export default function ProfessorRelatorios() {
  const { perfil } = useAuth()
  const [linhas, setLinhas] = useState([])
  const [salas, setSalas] = useState([])
  const [filtroSala, setFiltroSala] = useState('todas')
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
        setSalas(salasData || [])
        const salaIds = (salasData || []).map((s) => s.id)
        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
        if (salaIds.length === 0) { setLinhas([]); return }

        const { data: alunosData, error: eAlunos } = await supabase.from('alunos').select('*').in('sala_id', salaIds)
        if (eAlunos) throw eAlunos
        const alunoIds = (alunosData || []).map((a) => a.id)

        const [{ data: entregasData }, { data: observacoesData }, { data: selosData }] = await Promise.all([
          alunoIds.length ? supabase.from('entregas').select('aluno_id, nota, status').in('aluno_id', alunoIds) : Promise.resolve({ data: [] }),
          alunoIds.length ? supabase.from('observacoes').select('aluno_id').in('aluno_id', alunoIds) : Promise.resolve({ data: [] }),
          alunoIds.length ? supabase.from('aluno_selos').select('aluno_id').in('aluno_id', alunoIds) : Promise.resolve({ data: [] }),
        ])

        const notasPorAluno = {}
        const entreguesPorAluno = {}
        for (const e of entregasData || []) {
          if (e.status === 'entregue' || e.status === 'corrigida') entreguesPorAluno[e.aluno_id] = (entreguesPorAluno[e.aluno_id] || 0) + 1
          if (e.nota != null) {
            if (!notasPorAluno[e.aluno_id]) notasPorAluno[e.aluno_id] = []
            notasPorAluno[e.aluno_id].push(Number(e.nota))
          }
        }
        const obsPorAluno = {}
        for (const o of observacoesData || []) obsPorAluno[o.aluno_id] = (obsPorAluno[o.aluno_id] || 0) + 1
        const selosPorAluno = {}
        for (const s of selosData || []) selosPorAluno[s.aluno_id] = (selosPorAluno[s.aluno_id] || 0) + 1

        setLinhas((alunosData || []).map((a) => {
          const notas = notasPorAluno[a.id] || []
          const media = notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : '—'
          return {
            id: a.id,
            nome: a.nome,
            salaId: a.sala_id,
            salaNome: salaPorId[a.sala_id]?.nome || '—',
            pontos: a.pontos,
            entregas: entreguesPorAluno[a.id] || 0,
            media,
            observacoes: obsPorAluno[a.id] || 0,
            selos: selosPorAluno[a.id] || 0,
          }
        }))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar os relatórios. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  const linhasFiltradas = useMemo(
    () => linhas.filter((l) => filtroSala === 'todas' || l.salaId === filtroSala),
    [linhas, filtroSala],
  )

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Relatórios</h1>
      <p className="mt-2 text-texto/60">Panorama de cada aluno das suas turmas.</p>

      <div className="mt-6">
        <select
          value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
        >
          <option value="todas">Todas as salas</option>
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando relatórios…</div>
      ) : linhasFiltradas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <BarChart3 className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno para gerar relatório ainda.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Aluno</th>
                <th className="px-6 py-4 font-medium">Sala</th>
                <th className="px-6 py-4 font-medium text-right">Pontos</th>
                <th className="px-6 py-4 font-medium text-right">Entregas</th>
                <th className="px-6 py-4 font-medium text-right">Média</th>
                <th className="px-6 py-4 font-medium text-right">Observações</th>
                <th className="px-6 py-4 font-medium text-right">Selos</th>
              </tr>
            </thead>
            <tbody>
              {linhasFiltradas.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 font-semibold text-white">{l.nome}</td>
                  <td className="px-6 py-4 text-texto/70">{l.salaNome}</td>
                  <td className="px-6 py-4 text-right text-white">{l.pontos}</td>
                  <td className="px-6 py-4 text-right text-texto/70">{l.entregas}</td>
                  <td className="px-6 py-4 text-right text-texto/70">{l.media}</td>
                  <td className="px-6 py-4 text-right text-texto/70">{l.observacoes}</td>
                  <td className="px-6 py-4 text-right text-texto/70">{l.selos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
