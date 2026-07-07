import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { UsersRound, Plus, X, Loader2, Trash2, UserPlus } from 'lucide-react'

export default function ProfessorEquipes() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [salaAtiva, setSalaAtiva] = useState('')
  const [times, setTimes] = useState([])
  const [alunos, setAlunos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [nomeTime, setNomeTime] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function carregarSalas() {
    if (!perfil?.id) return
    const { data, error } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id).order('nome')
    if (!error) {
      setSalas(data || [])
      if (data?.length && !salaAtiva) setSalaAtiva(data[0].id)
    }
  }

  async function carregarSala(salaId) {
    if (!salaId) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: timesData, error: eTimes }, { data: alunosData, error: eAlunos }] = await Promise.all([
        supabase.from('times').select('*, time_membros(aluno_id)').eq('sala_id', salaId).order('nome'),
        supabase.from('alunos').select('id, nome, pontos').eq('sala_id', salaId).order('nome'),
      ])
      if (eTimes) throw eTimes
      if (eAlunos) throw eAlunos

      const alunoPorId = Object.fromEntries((alunosData || []).map((a) => [a.id, a]))
      setTimes((timesData || []).map((t) => ({
        ...t,
        membros: (t.time_membros || []).map((m) => alunoPorId[m.aluno_id]).filter(Boolean),
      })))
      setAlunos(alunosData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as equipes. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregarSalas() }, [perfil?.id])
  useEffect(() => { if (salaAtiva) carregarSala(salaAtiva) }, [salaAtiva])

  async function criarTime(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { error } = await supabase.from('times').insert({ sala_id: salaAtiva, nome: nomeTime })
      if (error) throw error
      setNomeTime('')
      setModalNovo(false)
      await carregarSala(salaAtiva)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar a equipe.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirTime(id) {
    try {
      const { error } = await supabase.from('times').delete().eq('id', id)
      if (error) throw error
      await carregarSala(salaAtiva)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir a equipe.')
    }
  }

  async function adicionarMembro(timeId, alunoId) {
    if (!alunoId) return
    try {
      const { error } = await supabase.from('time_membros').insert({ time_id: timeId, aluno_id: alunoId })
      if (error) throw error
      await carregarSala(salaAtiva)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível adicionar o membro (ele já pode estar em outra equipe).')
    }
  }

  async function removerMembro(timeId, alunoId) {
    try {
      const { error } = await supabase.from('time_membros').delete().eq('time_id', timeId).eq('aluno_id', alunoId)
      if (error) throw error
      await carregarSala(salaAtiva)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível remover o membro.')
    }
  }

  const alunosSemTime = (timeId) => {
    const idsEmTimes = new Set(times.flatMap((t) => t.membros.map((m) => m.id)))
    return alunos.filter((a) => !idsEmTimes.has(a.id))
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Equipes</h1>
          <p className="mt-2 text-texto/60">Organize seus alunos em times combinando características diferentes.</p>
        </div>
        {salaAtiva && (
          <button
            onClick={() => setModalNovo(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
          >
            <Plus size={18} /> Nova equipe
          </button>
        )}
      </div>

      {salas.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {salas.map((s) => (
            <button
              key={s.id} onClick={() => setSalaAtiva(s.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${salaAtiva === s.id ? 'bg-azul text-white' : 'bg-card text-texto/60 hover:text-white'}`}
            >
              {s.nome}
            </button>
          ))}
        </div>
      )}

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {salas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <UsersRound className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Você ainda não tem salas atribuídas.</p>
        </div>
      ) : carregando ? (
        <div className="mt-10 text-texto/50">Carregando equipes…</div>
      ) : times.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <UsersRound className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma equipe criada nesta sala ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {times.map((t) => (
            <div key={t.id} className="rounded-2xl bg-card border p-6">
              <div className="flex items-start justify-between">
                <div className="font-bold text-white text-lg">{t.nome}</div>
                <button onClick={() => excluirTime(t.id)} className="p-1.5 rounded-lg text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="text-sm text-texto/50 mt-1">{t.pontos} pontos</div>

              <div className="mt-4 space-y-1.5">
                {t.membros.length === 0 && <p className="text-xs text-texto/40">Sem membros ainda.</p>}
                {t.membros.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-white/85">{m.nome}</span>
                    <button onClick={() => removerMembro(t.id, m.id)} className="text-texto/40 hover:text-red-400 transition">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {alunosSemTime(t.id).length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <select
                    defaultValue=""
                    onChange={(e) => { adicionarMembro(t.id, e.target.value); e.target.value = '' }}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition"
                  >
                    <option value="" disabled>+ Adicionar aluno</option>
                    {alunosSemTime(t.id).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalNovo(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nova equipe</h2>
              <button onClick={() => setModalNovo(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={criarTime} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome da equipe</label>
                <input
                  required value={nomeTime} onChange={(e) => setNomeTime(e.target.value)}
                  placeholder="Ex: Time Águia"
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <button
                type="submit" disabled={salvando}
                className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                <UserPlus size={16} /> {salvando ? 'Criando…' : 'Criar equipe'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
