import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ConvidarAlunoModal from '../../components/ConvidarAlunoModal'
import useLimiteAlunos from '../../hooks/useLimiteAlunos'
import {
  ArrowLeft, UsersRound, Plus, X, Loader2, Trash2, Mail, Clock, Trophy,
  ChevronLeft, ChevronRight, BookOpen, Pencil,
} from 'lucide-react'

const CORES_PODIO = ['#F5C451', '#C0C0C0', '#CD7F32']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatarISO(date) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [nomeTime, setNomeTime] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [diario, setDiario] = useState([])
  const [mesAtual, setMesAtual] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [textoDiario, setTextoDiario] = useState('')
  const [salvandoDiario, setSalvandoDiario] = useState(false)

  async function carregar() {
    if (!id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: salaData, error: eSala }, { data: alunosData, error: eAl }, { data: convitesData, error: eConv }, { data: timesData, error: eTimes }, { data: diarioData, error: eDiario }] =
        await Promise.all([
          supabase.from('salas').select('*').eq('id', id).single(),
          supabase.from('alunos').select('id, nome, pontos, nivel').eq('sala_id', id).order('nome'),
          supabase.from('convites_aluno').select('*').eq('sala_id', id).eq('usado', false),
          supabase.from('times').select('*, time_membros(aluno_id)').eq('sala_id', id).order('nome'),
          supabase.from('diario_aula').select('*').eq('sala_id', id).eq('professor_id', perfil.id),
        ])
      if (eSala) throw eSala
      if (eAl) throw eAl
      if (eConv) throw eConv
      if (eTimes) throw eTimes
      if (eDiario) throw eDiario

      const alunoPorId = Object.fromEntries((alunosData || []).map((a) => [a.id, a]))
      setSala(salaData)
      setAlunos(alunosData || [])
      setConvites(convitesData || [])
      setTimes((timesData || []).map((t) => ({
        ...t,
        membros: (t.time_membros || []).map((m) => alunoPorId[m.aluno_id]).filter(Boolean),
      })))
      setDiario(diarioData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar a sala. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  const diasDoMes = useMemo(() => {
    const ano = mesAtual.getFullYear(); const mes = mesAtual.getMonth()
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    const celulas = []
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null)
    for (let d = 1; d <= totalDias; d++) celulas.push(new Date(ano, mes, d))
    while (celulas.length % 7 !== 0) celulas.push(null)
    return celulas
  }, [mesAtual])

  const diarioPorData = useMemo(() => Object.fromEntries(diario.map((d) => [d.data, d])), [diario])
  const hojeISO = formatarISO(new Date())

  function abrirDia(iso) {
    setDiaSelecionado(iso)
    setTextoDiario(diarioPorData[iso]?.conteudo || '')
  }

  async function salvarDiario(e) {
    e.preventDefault()
    if (!diaSelecionado) return
    setSalvandoDiario(true)
    setErro('')
    try {
      const { error } = await supabase.from('diario_aula').upsert({
        sala_id: id,
        professor_id: perfil.id,
        escola_id: sala.escola_id,
        data: diaSelecionado,
        conteudo: textoDiario.trim(),
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'sala_id,professor_id,data' })
      if (error) throw error
      setDiaSelecionado(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar o diário desse dia.')
    } finally {
      setSalvandoDiario(false)
    }
  }

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
        <button onClick={() => setAba('diario')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'diario' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          <BookOpen size={14} /> Diário de Classe
        </button>
      </div>

      {aba === 'equipes' ? (
        <div className="mt-6">
          <div className="flex justify-end">
            <button
              onClick={() => setModalNovo(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
            >
              <Plus size={18} /> Nova equipe
            </button>
          </div>

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
      ) : aba === 'placar' ? (
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
      ) : (
        <div className="mt-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 rounded-lg bg-card border text-texto/60 hover:text-white transition">
                <ChevronLeft size={16} />
              </button>
              <div className="text-lg font-bold text-white w-44 text-center">{MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}</div>
              <button onClick={() => setMesAtual((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 rounded-lg bg-card border text-texto/60 hover:text-white transition">
                <ChevronRight size={16} />
              </button>
            </div>
            <p className="text-xs text-texto/45 max-w-xs text-right">Registre o que foi trabalhado em cada aula — é o diário de classe, obrigatório por lei.</p>
          </div>

          <div className="mt-4 rounded-2xl bg-card border overflow-hidden">
            <div className="grid grid-cols-7 border-b">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-texto/50">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {diasDoMes.map((date, i) => {
                const iso = date ? formatarISO(date) : null
                const entrada = iso ? diarioPorData[iso] : null
                const ehHoje = iso === hojeISO
                return (
                  <button
                    key={i}
                    disabled={!date}
                    onClick={() => abrirDia(iso)}
                    className={`min-h-[84px] border-b border-r p-2 text-left align-top transition ${!date ? 'bg-white/[0.01]' : 'hover:bg-white/[0.03]'} ${i % 7 === 6 ? 'border-r-0' : ''}`}
                  >
                    {date && (
                      <>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${ehHoje ? 'bg-azul text-white font-bold' : 'text-texto/60'}`}>
                          {date.getDate()}
                        </span>
                        {entrada && (
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#3FD08A]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3FD08A]" /> preenchido
                          </div>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {diaSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDiaSelecionado(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Pencil size={17} className="text-azul" /> {new Date(diaSelecionado + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => setDiaSelecionado(null)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={salvarDiario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">O que foi trabalhado nessa aula?</label>
                <textarea
                  required rows={6} value={textoDiario} onChange={(e) => setTextoDiario(e.target.value)}
                  placeholder="Ex: Introdução ao conteúdo de industrialização no Brasil, leitura do capítulo 3 e discussão em grupo."
                  className="w-full px-4 py-3 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition resize-none"
                />
              </div>
              <button
                type="submit" disabled={salvandoDiario}
                className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvandoDiario && <Loader2 size={18} className="animate-spin" />}
                {salvandoDiario ? 'Salvando…' : 'Salvar diário do dia'}
              </button>
            </form>
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
