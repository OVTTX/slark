import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ClipboardList, School } from 'lucide-react'

export default function DiretorNotas() {
  const { perfil } = useAuth()
  const [entregas, setEntregas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroSala, setFiltroSala] = useState('todas')
  const [salas, setSalas] = useState([])

  useEffect(() => {
    if (!perfil?.escola_id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('escola_id', perfil.escola_id)
        if (eSalas) throw eSalas
        const salaIds = (salasData || []).map((s) => s.id)
        setSalas(salasData || [])

        if (salaIds.length === 0) { setEntregas([]); return }

        const { data: atividadesData, error: eAt } = await supabase.from('atividades').select('id, titulo, sala_id').in('sala_id', salaIds)
        if (eAt) throw eAt
        const atividadeIds = (atividadesData || []).map((a) => a.id)
        const atividadePorId = Object.fromEntries((atividadesData || []).map((a) => [a.id, a]))
        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))

        if (atividadeIds.length === 0) { setEntregas([]); return }

        const { data: entregasData, error: eEnt } = await supabase
          .from('entregas')
          .select('*, alunos(nome)')
          .in('atividade_id', atividadeIds)
          .not('nota', 'is', null)
          .order('entregue_em', { ascending: false })
        if (eEnt) throw eEnt

        setEntregas((entregasData || []).map((e) => {
          const atividade = atividadePorId[e.atividade_id]
          return {
            ...e,
            atividadeTitulo: atividade?.titulo || '—',
            salaNome: salaPorId[atividade?.sala_id]?.nome || '—',
            salaId: atividade?.sala_id,
            alunoNome: e.alunos?.nome || '—',
          }
        }))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar as notas. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.escola_id])

  const listaFiltrada = useMemo(
    () => entregas.filter((e) => filtroSala === 'todas' || e.salaId === filtroSala),
    [entregas, filtroSala],
  )

  const media = listaFiltrada.length
    ? `${Math.round(listaFiltrada.reduce((s, e) => s + Number(e.nota), 0) / listaFiltrada.length)}%`
    : '—'

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Notas</h1>
      <p className="mt-2 text-texto/60">Notas lançadas pelos professores em todas as salas.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
        >
          <option value="todas">Todas as salas</option>
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        {!carregando && listaFiltrada.length > 0 && (
          <span className="text-sm text-texto/60">Média: <span className="text-white font-semibold">{media}</span></span>
        )}
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando notas…</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <ClipboardList className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma nota lançada ainda.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Aluno</th>
                <th className="px-6 py-4 font-medium">Atividade</th>
                <th className="px-6 py-4 font-medium">Sala</th>
                <th className="px-6 py-4 font-medium text-right">Nota</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 font-semibold text-white">{e.alunoNome}</td>
                  <td className="px-6 py-4 text-texto/70">{e.atividadeTitulo}</td>
                  <td className="px-6 py-4 text-texto/70">
                    <div className="flex items-center gap-1.5"><School size={13} className="text-texto/40" />{e.salaNome}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-white">{Math.round(Number(e.nota))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
