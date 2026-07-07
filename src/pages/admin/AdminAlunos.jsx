import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Search, Trophy, School } from 'lucide-react'

export default function AdminAlunos() {
  const [alunos, setAlunos] = useState([])
  const [escolas, setEscolas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('todas')

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const [{ data: alunosData, error: e1 }, { data: escolasData, error: e2 }, { data: salasData, error: e3 }, { data: caracData, error: e4 }] =
          await Promise.all([
            supabase.from('alunos').select('*').order('pontos', { ascending: false }),
            supabase.from('escolas').select('id, nome'),
            supabase.from('salas').select('id, nome, escola_id'),
            supabase.from('caracteristicas').select('id, nome, cor'),
          ])
        if (e1) throw e1
        if (e2) throw e2
        if (e3) throw e3
        if (e4) throw e4

        const escolaPorId = Object.fromEntries((escolasData || []).map((e) => [e.id, e]))
        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
        const caracPorId = Object.fromEntries((caracData || []).map((c) => [c.id, c]))

        const lista = (alunosData || []).map((a) => ({
          ...a,
          escolaNome: escolaPorId[a.escola_id]?.nome || '—',
          salaNome: salaPorId[a.sala_id]?.nome || '—',
          caracteristica: caracPorId[a.caracteristica_id] || null,
        }))
        setAlunos(lista)
        setEscolas(escolasData || [])
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar os alunos. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const listaFiltrada = useMemo(() => {
    return alunos.filter((a) => {
      const passaBusca = a.nome.toLowerCase().includes(busca.toLowerCase())
      const passaEscola = filtroEscola === 'todas' || a.escola_id === filtroEscola
      return passaBusca && passaEscola
    })
  }, [alunos, busca, filtroEscola])

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Alunos</h1>
      <p className="mt-2 text-texto/60">Visão global de todos os alunos, em todas as escolas.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto/40" />
          <input
            value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno pelo nome…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
          />
        </div>
        <select
          value={filtroEscola} onChange={(e) => setFiltroEscola(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
        >
          <option value="todas">Todas as escolas</option>
          {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando alunos…</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Users className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            {alunos.length === 0 ? 'Nenhum aluno cadastrado ainda.' : 'Nenhum aluno encontrado com esse filtro.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Aluno</th>
                <th className="px-6 py-4 font-medium">Escola</th>
                <th className="px-6 py-4 font-medium">Sala</th>
                <th className="px-6 py-4 font-medium">Característica</th>
                <th className="px-6 py-4 font-medium">Nível</th>
                <th className="px-6 py-4 font-medium text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 font-semibold text-white">{a.nome}</td>
                  <td className="px-6 py-4 text-texto/70">
                    <div className="flex items-center gap-1.5"><School size={13} className="text-texto/40" />{a.escolaNome}</div>
                  </td>
                  <td className="px-6 py-4 text-texto/70">{a.salaNome}</td>
                  <td className="px-6 py-4">
                    {a.caracteristica ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: `${a.caracteristica.cor}22`, color: a.caracteristica.cor }}
                      >
                        {a.caracteristica.nome}
                      </span>
                    ) : <span className="text-texto/40 text-xs">—</span>}
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
  )
}
