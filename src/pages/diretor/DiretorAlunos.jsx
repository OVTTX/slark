import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Users, Search, Trophy, School, Clock, Mail } from 'lucide-react'
import ConvidarAlunoModal from '../../components/ConvidarAlunoModal'
import ImportarAlunosModal from '../../components/ImportarAlunosModal'

export default function DiretorAlunos() {
  const { perfil } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [salas, setSalas] = useState([])
  const [convitesPendentes, setConvitesPendentes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroSala, setFiltroSala] = useState('todas')

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: alunosData, error: e1 }, { data: salasData, error: e2 }, { data: convitesData, error: e3 }] = await Promise.all([
        supabase.from('alunos').select('*').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('salas').select('id, nome').eq('escola_id', perfil.escola_id).order('nome'),
        supabase.from('convites_aluno').select('*').eq('escola_id', perfil.escola_id).eq('usado', false).order('criado_em', { ascending: false }),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
      setAlunos((alunosData || []).map((a) => ({ ...a, salaNome: salaPorId[a.sala_id]?.nome || '—' })))
      setSalas(salasData || [])
      setConvitesPendentes((convitesData || []).map((c) => ({ ...c, salaNome: salaPorId[c.sala_id]?.nome || '—' })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os alunos. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.escola_id])

  const listaFiltrada = useMemo(() => {
    return alunos.filter((a) => {
      const passaBusca = a.nome.toLowerCase().includes(busca.toLowerCase())
      const passaSala = filtroSala === 'todas' || a.sala_id === filtroSala
      return passaBusca && passaSala
    })
  }, [alunos, busca, filtroSala])

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Alunos</h1>
          <p className="mt-2 text-texto/60">Cadastre alunos um a um ou importe uma turma inteira por planilha.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ImportarAlunosModal salas={salas} onImportado={carregar} />
          <ConvidarAlunoModal salas={salas} onConvidado={carregar} />
        </div>
      </div>

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
          value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
        >
          <option value="todas">Todas as salas</option>
          {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {convitesPendentes.length > 0 && (
        <div className="mt-6 rounded-2xl bg-[#F5C451]/10 border border-[#F5C451]/25 p-5">
          <div className="flex items-center gap-2 text-[#F5C451] font-semibold text-sm">
            <Clock size={15} /> {convitesPendentes.length} convite{convitesPendentes.length === 1 ? '' : 's'} aguardando primeiro login
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {convitesPendentes.slice(0, 12).map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 text-xs text-texto/70 bg-white/5 px-2.5 py-1 rounded-full">
                <Mail size={11} /> {c.nome} · {c.salaNome}
              </span>
            ))}
            {convitesPendentes.length > 12 && (
              <span className="text-xs text-texto/50 px-2.5 py-1">+{convitesPendentes.length - 12} mais</span>
            )}
          </div>
        </div>
      )}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando alunos…</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Users className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            {alunos.length === 0 ? 'Nenhum aluno cadastrado ainda. Importe uma planilha ou convide o primeiro aluno.' : 'Nenhum aluno encontrado com esse filtro.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
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
              {listaFiltrada.map((a) => (
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
  )
}
