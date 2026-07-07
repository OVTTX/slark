import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Target, Loader2, Trophy } from 'lucide-react'

export default function ProfessorDesafios() {
  const { perfil } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [historico, setHistorico] = useState([])
  const [alunoId, setAlunoId] = useState('')
  const [pontos, setPontos] = useState(10)
  const [motivo, setMotivo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: salasData, error: eSalas } = await supabase.from('salas').select('id').eq('professor_id', perfil.id)
      if (eSalas) throw eSalas
      const salaIds = (salasData || []).map((s) => s.id)
      if (salaIds.length === 0) { setAlunos([]); return }

      const { data: alunosData, error: eAlunos } = await supabase.from('alunos').select('id, nome, pontos').in('sala_id', salaIds).order('nome')
      if (eAlunos) throw eAlunos
      setAlunos(alunosData || [])

      const alunoIds = (alunosData || []).map((a) => a.id)
      if (alunoIds.length > 0) {
        const { data: histData } = await supabase
          .from('pontuacoes').select('*, alunos(nome)').in('aluno_id', alunoIds)
          .order('criada_em', { ascending: false }).limit(15)
        setHistorico(histData || [])
      }
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os dados. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  async function lancar(e) {
    e.preventDefault()
    if (!alunoId || !motivo.trim()) return
    setSalvando(true)
    setErro('')
    try {
      const aluno = alunos.find((a) => a.id === alunoId)
      const { error: eInsert } = await supabase.from('pontuacoes').insert({
        aluno_id: alunoId, professor_id: perfil.id, pontos: Number(pontos), motivo: motivo.trim(),
      })
      if (eInsert) throw eInsert

      const { error: eUpdate } = await supabase.from('alunos').update({ pontos: (aluno?.pontos || 0) + Number(pontos) }).eq('id', alunoId)
      if (eUpdate) throw eUpdate

      setMotivo('')
      setPontos(10)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível lançar os pontos do desafio.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Desafios</h1>
      <p className="mt-2 text-texto/60">Premie desafios superados com pontos extras.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando…</div>
      ) : alunos.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Target className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno nas suas turmas ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-card border p-6 h-fit">
            <div className="font-semibold text-white mb-4">Lançar desafio superado</div>
            <form onSubmit={lancar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Aluno</label>
                <select
                  required value={alunoId} onChange={(e) => setAlunoId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="">Selecione…</option>
                  {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Pontos</label>
                <input
                  type="number" min={1} required value={pontos} onChange={(e) => setPontos(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Desafio / motivo</label>
                <textarea
                  required value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Resolveu o desafio de lógica da semana"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none"
                />
              </div>
              <button
                type="submit" disabled={salvando}
                className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Lançando…' : 'Lançar pontos'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="text-sm font-semibold text-texto/50 uppercase tracking-wide mb-3">Histórico recente</div>
            {historico.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-azul/30 bg-card/40 p-8 text-center text-texto/60 text-sm">
                Nenhum desafio lançado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {historico.map((h) => (
                  <div key={h.id} className="rounded-xl bg-card border p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-white">{h.alunos?.nome}</div>
                      <div className="text-xs text-texto/50 truncate">{h.motivo}</div>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-[#F5C451] shrink-0">
                      <Trophy size={14} /> +{h.pontos}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
