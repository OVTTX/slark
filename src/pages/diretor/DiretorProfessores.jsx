import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { GraduationCap, School, Mail, Plus, X, Send, Loader2, Clock, Check, XCircle } from 'lucide-react'

const ROTULO_STATUS = {
  pendente: { texto: 'Aguardando a equipe Slark', cor: '#F5C451' },
  aprovado: { texto: 'Aprovado', cor: '#3FD08A' },
  rejeitado: { texto: 'Rejeitado', cor: '#FF6B6B' },
}

export default function DiretorProfessores() {
  const { perfil } = useAuth()
  const [professores, setProfessores] = useState([])
  const [solicitacoes, setSolicitacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [nomesPendentes, setNomesPendentes] = useState([])
  const [nomeAtual, setNomeAtual] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviadoComSucesso, setEnviadoComSucesso] = useState(false)

  async function carregar() {
    if (!perfil?.escola_id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: profData, error: e1 }, { data: salasData, error: e2 }, { data: solicitacoesData, error: e3 }] = await Promise.all([
        supabase.from('usuarios').select('*').eq('escola_id', perfil.escola_id).eq('perfil', 'professor').order('nome'),
        supabase.from('salas').select('id, nome, professor_id').eq('escola_id', perfil.escola_id),
        supabase.from('solicitacoes_professor').select('*').eq('escola_id', perfil.escola_id).order('criado_em', { ascending: false }),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      const salasPorProfessor = {}
      for (const s of salasData || []) {
        if (!s.professor_id) continue
        salasPorProfessor[s.professor_id] = [...(salasPorProfessor[s.professor_id] || []), s.nome]
      }
      setProfessores((profData || []).map((p) => ({ ...p, salas: salasPorProfessor[p.id] || [] })))
      setSolicitacoes(solicitacoesData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os professores. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.escola_id])

  function adicionarNome() {
    const nome = nomeAtual.trim()
    if (!nome) return
    setNomesPendentes((lista) => [...lista, nome])
    setNomeAtual('')
  }

  function removerNome(i) {
    setNomesPendentes((lista) => lista.filter((_, idx) => idx !== i))
  }

  async function enviarSolicitacao() {
    if (nomesPendentes.length === 0 || !perfil?.escola_id) return
    setEnviando(true)
    setErro('')
    try {
      const linhas = nomesPendentes.map((nome) => ({
        escola_id: perfil.escola_id,
        nome,
        criado_por: perfil.id,
      }))
      const { error } = await supabase.from('solicitacoes_professor').insert(linhas)
      if (error) throw error
      setNomesPendentes([])
      setEnviadoComSucesso(true)
      setTimeout(() => setEnviadoComSucesso(false), 4000)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível enviar a solicitação. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Professores</h1>
      <p className="mt-2 text-texto/60">Equipe docente da sua escola.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      <div className="mt-6 rounded-2xl bg-card border p-6">
        <h2 className="font-bold text-white">Solicitar novos professores</h2>
        <p className="mt-1 text-sm text-texto/60">
          Adicione o nome de cada professor novo. A equipe Slark cadastra o e-mail (no domínio da sua escola) e aprova o acesso.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <input
            value={nomeAtual}
            onChange={(e) => setNomeAtual(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarNome() } }}
            placeholder="Ex: Luciano Ferreira"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
          />
          <button
            type="button" onClick={adicionarNome}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>

        {nomesPendentes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {nomesPendentes.map((nome, i) => (
              <span key={i} className="flex items-center gap-1.5 text-sm pl-3 pr-1.5 py-1.5 rounded-full bg-azul/15 text-white">
                {nome}
                <button type="button" onClick={() => removerNome(i)} className="p-0.5 rounded-full hover:bg-white/15 transition">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {enviadoComSucesso && (
          <p className="mt-4 text-sm text-[#3FD08A] flex items-center gap-1.5"><Check size={15} /> Solicitação enviada para a equipe Slark.</p>
        )}

        <button
          type="button" onClick={enviarSolicitacao} disabled={nomesPendentes.length === 0 || enviando}
          className="mt-5 flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30 disabled:opacity-40 disabled:pointer-events-none"
        >
          {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
          {enviando ? 'Enviando…' : 'Enviar solicitação para a equipe'}
        </button>

        {solicitacoes.length > 0 && (
          <div className="mt-6 pt-5 border-t space-y-2">
            <div className="text-xs font-medium text-texto/50 uppercase tracking-wide mb-2">Solicitações enviadas</div>
            {solicitacoes.map((s) => {
              const status = ROTULO_STATUS[s.status]
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 text-sm py-1.5">
                  <span className="text-white">{s.nome}</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${status.cor}22`, color: status.cor }}>
                    {s.status === 'pendente' && <Clock size={12} />}
                    {s.status === 'aprovado' && <Check size={12} />}
                    {s.status === 'rejeitado' && <XCircle size={12} />}
                    {status.texto}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando professores…</div>
      ) : professores.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <GraduationCap className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            Nenhum professor cadastrado ainda. Use o formulário acima para solicitar o acesso deles à equipe Slark.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {professores.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-azul/30 flex items-center justify-center text-white font-mono">
                  {p.nome?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">{p.nome}</div>
                  <div className="flex items-center gap-1 text-texto/50 text-xs truncate"><Mail size={11} /> {p.email}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-1.5 text-xs text-texto/60 mb-1.5"><School size={13} /> Salas</div>
                {p.salas.length === 0 ? (
                  <span className="text-texto/40 text-xs">Nenhuma sala atribuída</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {p.salas.map((nome) => (
                      <span key={nome} className="text-xs px-2 py-0.5 rounded-full bg-azul/15 text-azul">{nome}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
