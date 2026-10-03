import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ConvidarAlunoModal from '../../components/ConvidarAlunoModal'
import useLimiteAlunos from '../../hooks/useLimiteAlunos'
import {
  ArrowLeft, UsersRound, Plus, X, Loader2, Trash2, Mail, Clock, Trophy,
  Shuffle, ShieldAlert,
} from 'lucide-react'

const CORES_PODIO = ['#F5C451', '#C0C0C0', '#CD7F32']
const TAMANHO_MAX_TIME = 4

// Antes "Salas", "Alunos" e "Equipes" eram 3 itens separados no menu do
// professor. Agora tudo vive dentro da sala: caminho é Salas -> (escolhe a
// sala) -> Equipes, e os alunos aparecem dentro do formato das próprias
// equipes (cards de time), não numa lista solta.
export default function ProfessorSalaDetalhe() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const { limite, usados, recarregar: recarregarLimite } = useLimiteAlunos()

  const [sala, setSala] = useState(null)
  const [aba, setAba] = useState('equipes')
  const [alunos, setAlunos] = useState([])
  const [convites, setConvites] = useState([])
  const [times, setTimes] = useState([])
  const [restricoes, setRestricoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [nomeTime, setNomeTime] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [modalRestricoes, setModalRestricoes] = useState(false)
  const [restricaoA, setRestricaoA] = useState('')
  const [restricaoB, setRestricaoB] = useState('')
  const [salvandoRestricao, setSalvandoRestricao] = useState(false)
  const [distribuindo, setDistribuindo] = useState(false)
  const [avisoDistribuicao, setAvisoDistribuicao] = useState('')

  async function carregar() {
    if (!id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: salaData, error: eSala }, { data: alunosData, error: eAl }, { data: convitesData, error: eConv }, { data: timesData, error: eTimes }, { data: restricoesData, error: eRestricoes }] =
        await Promise.all([
          supabase.from('salas').select('*').eq('id', id).single(),
          supabase.from('alunos').select('id, nome, pontos, nivel, caracteristica_id').eq('sala_id', id).order('nome'),
          supabase.from('convites_aluno').select('*').eq('sala_id', id).eq('usado', false),
          supabase.from('times').select('*, time_membros(aluno_id)').eq('sala_id', id).order('nome'),
          supabase.from('restricoes_equipe').select('*').eq('sala_id', id),
        ])
      if (eSala) throw eSala
      if (eAl) throw eAl
      if (eConv) throw eConv
      if (eTimes) throw eTimes
      if (eRestricoes) throw eRestricoes

      const alunoPorId = Object.fromEntries((alunosData || []).map((a) => [a.id, a]))
      setSala(salaData)
      setAlunos(alunosData || [])
      setConvites(convitesData || [])
      setTimes((timesData || []).map((t) => ({
        ...t,
        membros: (t.time_membros || []).map((m) => alunoPorId[m.aluno_id]).filter(Boolean),
      })))
      setRestricoes(restricoesData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar a sala. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  async function cancelarConvite(convId) {
    if (!confirm('Cancelar esse convite? Se o e-mail estiver errado, você pode criar um novo convite com o e-mail certo depois.')) return
    try {
      const { error } = await supabase.from('convites_aluno').delete().eq('id', convId)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível cancelar o convite.')
    }
  }

  async function criarTime(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { error } = await supabase.from('times').insert({ sala_id: id, nome: nomeTime })
      if (error) throw error
      setNomeTime('')
      setModalNovo(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar a equipe.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirTime(timeId) {
    try {
      const { error } = await supabase.from('times').delete().eq('id', timeId)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível excluir a equipe.')
    }
  }

  async function adicionarMembro(timeId, alunoId) {
    if (!alunoId) return
    const time = times.find((t) => t.id === timeId)
    if (time && time.membros.length >= TAMANHO_MAX_TIME) {
      setErro(`Essa equipe já tem ${TAMANHO_MAX_TIME} membros, o máximo permitido.`)
      return
    }
    try {
      const { error } = await supabase.from('time_membros').insert({ time_id: timeId, aluno_id: alunoId })
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível adicionar o membro (ele já pode estar em outra equipe).')
    }
  }

  async function removerMembro(timeId, alunoId) {
    try {
      const { error } = await supabase.from('time_membros').delete().eq('time_id', timeId).eq('aluno_id', alunoId)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível remover o membro.')
    }
  }

  async function adicionarRestricao(e) {
    e.preventDefault()
    if (!restricaoA || !restricaoB || restricaoA === restricaoB) return
    setSalvandoRestricao(true)
    setErro('')
    try {
      const { error } = await supabase.from('restricoes_equipe').insert({
        sala_id: id,
        aluno_id_1: restricaoA,
        aluno_id_2: restricaoB,
      })
      if (error) throw error
      setRestricaoA('')
      setRestricaoB('')
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível adicionar a restrição (talvez esse par já esteja cadastrado).')
    } finally {
      setSalvandoRestricao(false)
    }
  }

  async function removerRestricao(restricaoId) {
    try {
      const { error } = await supabase.from('restricoes_equipe').delete().eq('id', restricaoId)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível remover a restrição.')
    }
  }

  async function distribuirAutomaticamente() {
    const semTime = alunosSemTime(null)
    if (times.length === 0) {
      setAvisoDistribuicao('Crie ao menos uma equipe antes de distribuir os alunos.')
      return
    }
    if (semTime.length === 0) {
      setAvisoDistribuicao('Todos os alunos já estão em uma equipe.')
      return
    }
    setDistribuindo(true)
    setAvisoDistribuicao('')
    setErro('')
    try {
      // mapa aluno -> conjunto de alunos com quem ele não pode ficar
      const proibidosPorAluno = new Map()
      for (const r of restricoes) {
        if (!proibidosPorAluno.has(r.aluno_id_1)) proibidosPorAluno.set(r.aluno_id_1, new Set())
        if (!proibidosPorAluno.has(r.aluno_id_2)) proibidosPorAluno.set(r.aluno_id_2, new Set())
        proibidosPorAluno.get(r.aluno_id_1).add(r.aluno_id_2)
        proibidosPorAluno.get(r.aluno_id_2).add(r.aluno_id_1)
      }

      // cópia local dos membros atuais de cada time (ids e características), pra ir atualizando durante a distribuição
      const alunoPorId = Object.fromEntries(alunos.map((a) => [a.id, a]))
      const membrosPorTime = Object.fromEntries(times.map((t) => [t.id, t.membros.map((m) => m.id)]))

      const embaralhados = [...semTime].sort(() => Math.random() - 0.5)
      const insercoes = []
      let comConflito = 0
      let semVaga = 0

      for (const aluno of embaralhados) {
        const proibidos = proibidosPorAluno.get(aluno.id) || new Set()

        const comVaga = times.filter((t) => membrosPorTime[t.id].length < TAMANHO_MAX_TIME)
        if (comVaga.length === 0) { semVaga++; continue }

        const semRestricao = comVaga.filter((t) => !membrosPorTime[t.id].some((mId) => proibidos.has(mId)))
        const candidatos = semRestricao.length > 0 ? semRestricao : comVaga
        if (semRestricao.length === 0) comConflito++

        // entre os candidatos, prioriza equipes que ainda não têm ninguém com a
        // mesma característica do aluno — características complementares, de
        // preferência uma de cada — e só depois equilibra pelo tamanho do time
        const semCaracRepetida = aluno.caracteristica_id
          ? candidatos.filter((t) => !membrosPorTime[t.id].some((mId) => alunoPorId[mId]?.caracteristica_id === aluno.caracteristica_id))
          : candidatos
        const pool = semCaracRepetida.length > 0 ? semCaracRepetida : candidatos

        const escolhido = pool.reduce((menor, t) =>
          membrosPorTime[t.id].length < membrosPorTime[menor.id].length ? t : menor
        , pool[0])

        membrosPorTime[escolhido.id].push(aluno.id)
        insercoes.push({ time_id: escolhido.id, aluno_id: aluno.id })
      }

      if (insercoes.length > 0) {
        const { error } = await supabase.from('time_membros').insert(insercoes)
        if (error) throw error
      }

      await carregar()

      const partes = [`${insercoes.length} aluno${insercoes.length !== 1 ? 's' : ''} distribuído${insercoes.length !== 1 ? 's' : ''}.`]
      if (comConflito > 0) partes.push(`${comConflito} não puderam respeitar todas as restrições.`)
      if (semVaga > 0) partes.push(`${semVaga} ficaram sem equipe por falta de vaga (limite de ${TAMANHO_MAX_TIME} por equipe) — crie mais equipes.`)
      setAvisoDistribuicao(partes.join(' '))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível distribuir os alunos automaticamente.')
    } finally {
      setDistribuindo(false)
    }
  }

  const alunosSemTime = (timeId) => {
    const idsEmTimes = new Set(times.flatMap((t) => t.membros.map((m) => m.id)))
    return alunos.filter((a) => !idsEmTimes.has(a.id))
  }
  const semTimeGeral = alunosSemTime(null)

  const maiorPontuacao = times[0]?.pontos || 1
  const timesOrdenados = [...times].sort((a, b) => (b.pontos || 0) - (a.pontos || 0))

  if (carregando && !sala) {
    return <div className="text-texto/50">Carregando sala…</div>
  }

  return (
    <div>
      <Link to="/professor/salas" className="inline-flex items-center gap-1.5 text-sm text-texto/50 hover:text-white transition mb-4">
        <ArrowLeft size={14} /> Salas
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">{sala?.nome}</h1>
          {sala?.serie && <p className="mt-1 text-texto/60">{sala.serie}</p>}
          {limite != null && <p className="mt-1 text-xs text-texto/45">{usados}/{limite} alunos usados na escola</p>}
        </div>
        <ConvidarAlunoModal
          salas={sala ? [{ id: sala.id, nome: sala.nome }] : []}
          limite={limite} usados={usados}
          onConvidado={() => { carregar(); recarregarLimite() }}
        />
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {convites.length > 0 && (
        <div className="mt-8">
          <div className="text-sm font-semibold text-texto/50 uppercase tracking-wide mb-3">Convites pendentes</div>
          <div className="space-y-2">
            {convites.map((c) => (
              <div key={c.id} className="rounded-xl bg-card/50 border border-dashed border-azul/30 p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-azul/15 flex items-center justify-center text-azul shrink-0">
                  <Clock size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">{c.nome}</div>
                  <div className="flex items-center gap-1 text-texto/50 text-xs"><Mail size={11} /> {c.email}</div>
                </div>
                <button
                  onClick={() => cancelarConvite(c.id)}
                  title="Cancelar convite (ex: e-mail digitado errado)"
                  className="shrink-0 p-1.5 rounded-lg text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 inline-flex rounded-xl bg-card border p-1">
        <button onClick={() => setAba('equipes')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'equipes' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Equipes
        </button>
        <button onClick={() => setAba('placar')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'placar' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Placar
        </button>
      </div>

      {aba === 'equipes' ? (
        <div className="mt-6">
          <div className="flex justify-end gap-2 flex-wrap">
            <button
              onClick={() => setModalRestricoes(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-full bg-card border text-texto/70 hover:text-white hover:border-azul/40 font-semibold text-sm transition"
            >
              <ShieldAlert size={16} /> Restrições {restricoes.length > 0 && `(${restricoes.length})`}
            </button>
            <button
              onClick={distribuirAutomaticamente}
              disabled={distribuindo || times.length === 0}
              className="flex items-center gap-2 px-4 py-3 rounded-full bg-card border text-texto/70 hover:text-white hover:border-azul/40 font-semibold text-sm transition disabled:opacity-50"
            >
              {distribuindo ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
              Distribuir automaticamente
            </button>
            <button
              onClick={() => setModalNovo(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
            >
              <Plus size={18} /> Nova equipe
            </button>
          </div>

          {avisoDistribuicao && (
            <p className="mt-4 text-sm text-[#F5C451] bg-[#F5C451]/10 px-4 py-3 rounded-xl">{avisoDistribuicao}</p>
          )}

          {alunos.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
              <UsersRound className="mx-auto text-azul/60" size={40} />
              <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno nessa sala ainda. Convide o primeiro pelo botão acima.</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {times.map((t) => (
                <div key={t.id} className="rounded-2xl bg-card border p-6">
                  <div className="flex items-start justify-between">
                    <div className="font-bold text-white text-lg">{t.nome}</div>
                    <button onClick={() => excluirTime(t.id)} className="p-1.5 rounded-lg text-texto/40 hover:text-red-400 hover:bg-red-400/10 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="text-sm text-texto/50 mt-1">{t.pontos} pontos · {t.membros.length}/{TAMANHO_MAX_TIME} membros</div>

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

                  {t.membros.length >= TAMANHO_MAX_TIME ? (
                    <div className="mt-3 pt-3 border-t text-xs text-texto/40 text-center">Equipe completa ({TAMANHO_MAX_TIME}/{TAMANHO_MAX_TIME})</div>
                  ) : alunosSemTime(t.id).length > 0 && (
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

              {/* Alunos ainda sem equipe aparecem aqui, no mesmo formato de card das equipes */}
              {semTimeGeral.length > 0 && (
                <div className="rounded-2xl bg-card/50 border border-dashed p-6">
                  <div className="font-bold text-texto/70 text-lg">Sem equipe</div>
                  <div className="text-sm text-texto/40 mt-1">{semTimeGeral.length} aluno{semTimeGeral.length > 1 ? 's' : ''}</div>
                  <div className="mt-4 space-y-1.5">
                    {semTimeGeral.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-lg px-3 py-2">
                        <span className="text-white/70">{a.nome}</span>
                        <span className="text-texto/40 text-xs">Nível {a.nivel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {times.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
              <UsersRound className="mx-auto text-azul/60" size={40} />
              <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma equipe criada ainda. Crie equipes na aba "Equipes".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timesOrdenados.map((t, i) => (
                <div key={t.id} className="rounded-2xl bg-card border p-5 flex items-center gap-5 transition hover:-translate-y-0.5 hover:border-azul/40">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
                    style={{
                      background: i < 3 ? `${CORES_PODIO[i]}22` : 'rgba(255,255,255,0.05)',
                      color: i < 3 ? CORES_PODIO[i] : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {i + 1}º
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{t.nome}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${Math.max(4, ((t.pontos || 0) / maiorPontuacao) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end font-bold text-white text-lg shrink-0">
                    <Trophy size={16} className="text-[#F5C451]" /> {t.pontos}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalRestricoes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalRestricoes(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldAlert size={18} className="text-azul" /> Restrições de grupo
              </h2>
              <button onClick={() => setModalRestricoes(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <p className="text-xs text-texto/50 mb-5 leading-relaxed">
              Marque pares de alunos que não podem ficar na mesma equipe. A distribuição automática respeita essas regras.
            </p>

            <form onSubmit={adicionarRestricao} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <select
                  required value={restricaoA} onChange={(e) => setRestricaoA(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition"
                >
                  <option value="" disabled>Aluno A</option>
                  {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <select
                  required value={restricaoB} onChange={(e) => setRestricaoB(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white text-sm focus:outline-none focus:border-azul transition"
                >
                  <option value="" disabled>Aluno B</option>
                  {alunos.filter((a) => a.id !== restricaoA).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <button
                type="submit" disabled={salvandoRestricao || !restricaoA || !restricaoB}
                className="w-full py-2.5 rounded-xl bg-azul hover:bg-azul-puro text-white font-semibold text-sm transition shadow-lg shadow-azul/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvandoRestricao && <Loader2 size={15} className="animate-spin" />}
                {salvandoRestricao ? 'Adicionando…' : '+ Adicionar restrição'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t space-y-1.5">
              {restricoes.length === 0 ? (
                <p className="text-xs text-texto/40">Nenhuma restrição cadastrada ainda.</p>
              ) : (
                restricoes.map((r) => {
                  const nomeA = alunos.find((a) => a.id === r.aluno_id_1)?.nome || '—'
                  const nomeB = alunos.find((a) => a.id === r.aluno_id_2)?.nome || '—'
                  return (
                    <div key={r.id} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-lg px-3 py-2">
                      <span className="text-white/80">{nomeA} <span className="text-texto/40">não pode com</span> {nomeB}</span>
                      <button onClick={() => removerRestricao(r.id)} className="text-texto/40 hover:text-red-400 transition shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
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
                {salvando ? 'Criando…' : 'Criar equipe'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
