import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { MessageCircle, Send, Loader2, ShieldAlert, Search } from 'lucide-react'

export default function ProfessorChat() {
  const { perfil } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [mensagensPorAluno, setMensagensPorAluno] = useState({})
  const [selecionadoId, setSelecionadoId] = useState(null)
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const fimRef = useRef(null)

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
      if (eSalas) throw eSalas
      const salaIds = (salasData || []).map((s) => s.id)
      const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
      if (salaIds.length === 0) { setAlunos([]); return }

      const { data: alunosData, error: eAlunos } = await supabase
        .from('alunos').select('id, nome, sala_id, usuario_id').in('sala_id', salaIds).not('usuario_id', 'is', null)
      if (eAlunos) throw eAlunos

      const usuarioIds = (alunosData || []).map((a) => a.usuario_id)
      let mensagensData = []
      if (usuarioIds.length) {
        const { data, error: eMsgs } = await supabase
          .from('mensagens').select('*')
          .or(
            `and(remetente_id.eq.${perfil.id},destinatario_id.in.(${usuarioIds.join(',')})),and(destinatario_id.eq.${perfil.id},remetente_id.in.(${usuarioIds.join(',')}))`,
          )
          .order('criada_em', { ascending: true })
        if (eMsgs) throw eMsgs
        mensagensData = data || []
      }

      const porAluno = {}
      for (const uid of usuarioIds) porAluno[uid] = []
      for (const m of mensagensData) {
        const outroId = m.remetente_id === perfil.id ? m.destinatario_id : m.remetente_id
        if (!porAluno[outroId]) porAluno[outroId] = []
        porAluno[outroId].push(m)
      }
      setMensagensPorAluno(porAluno)

      setAlunos((alunosData || []).map((a) => {
        const conversa = porAluno[a.usuario_id] || []
        const ultima = conversa[conversa.length - 1]
        const naoLidas = conversa.filter((m) => m.destinatario_id === perfil.id && !m.lida).length
        return {
          ...a,
          salaNome: salaPorId[a.sala_id]?.nome || '—',
          ultimaMsg: ultima?.texto || '',
          ultimaEm: ultima?.criada_em || null,
          naoLidas,
        }
      }).sort((x, y) => {
        if (x.naoLidas !== y.naoLidas) return y.naoLidas - x.naoLidas
        return new Date(y.ultimaEm || 0) - new Date(x.ultimaEm || 0)
      }))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as conversas. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [selecionadoId, mensagensPorAluno])

  const alunosFiltrados = useMemo(
    () => alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())),
    [alunos, busca],
  )

  const selecionado = alunos.find((a) => a.usuario_id === selecionadoId) || null
  const conversaAtual = selecionadoId ? mensagensPorAluno[selecionadoId] || [] : []

  async function abrir(aluno) {
    setSelecionadoId(aluno.usuario_id)
    setAviso('')
    const naoLidas = (mensagensPorAluno[aluno.usuario_id] || []).filter((m) => m.destinatario_id === perfil.id && !m.lida)
    if (naoLidas.length) {
      for (const m of naoLidas) {
        await supabase.from('mensagens').update({ lida: true }).eq('id', m.id)
      }
      setAlunos((prev) => prev.map((a) => (a.usuario_id === aluno.usuario_id ? { ...a, naoLidas: 0 } : a)))
    }
  }

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim() || !selecionado) return
    setEnviando(true)
    setAviso('')
    try {
      const textoEnviar = texto.trim()
      const { data: moderacao } = await supabase.functions.invoke('moderar-mensagem', {
        body: { texto: textoEnviar, destinatario_id: selecionado.usuario_id },
      })
      if (moderacao && moderacao.permitido === false) {
        setAviso('Essa mensagem não pode ser enviada por conter conteúdo impróprio ou perigoso.')
        return
      }
      const { error } = await supabase.from('mensagens').insert({ remetente_id: perfil.id, destinatario_id: selecionado.usuario_id, texto: textoEnviar })
      if (error) throw error
      setTexto('')
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível enviar a mensagem.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Chat</h1>
      <p className="mt-2 text-texto/60">Converse com os alunos das suas turmas. Mensagens são analisadas por IA de segurança.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando conversas…</div>
      ) : alunos.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <MessageCircle className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno com conta ativa nas suas turmas ainda.</p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl bg-card border flex h-[560px] overflow-hidden">
          <div className="w-64 shrink-0 border-r flex flex-col">
            <div className="p-3 border-b">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto/40" />
                <input
                  value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar aluno…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.03] border border-azul/15 text-white text-sm placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {alunosFiltrados.map((a) => (
                <button
                  key={a.id} onClick={() => abrir(a)}
                  className={`w-full text-left px-4 py-3 border-b transition ${selecionadoId === a.usuario_id ? 'bg-azul/10' : 'hover:bg-white/[0.03]'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white text-sm truncate">{a.nome}</span>
                    {a.naoLidas > 0 && (
                      <span className="shrink-0 text-[10px] font-bold bg-azul text-white rounded-full w-5 h-5 flex items-center justify-center">{a.naoLidas}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-texto/40 mt-0.5">{a.salaNome}</div>
                  {a.ultimaMsg && <div className="text-xs text-texto/50 mt-1 truncate">{a.ultimaMsg}</div>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {!selecionado ? (
              <div className="flex-1 flex items-center justify-center text-texto/40 text-sm">Selecione um aluno para conversar.</div>
            ) : (
              <>
                <div className="px-5 py-4 border-b font-semibold text-white">{selecionado.nome}</div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {conversaAtual.length === 0 && <p className="text-sm text-texto/45 text-center mt-8">Envie a primeira mensagem para começar a conversa.</p>}
                  {conversaAtual.map((m) => {
                    const minha = m.remetente_id === perfil.id
                    return (
                      <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${minha ? 'bg-azul text-white' : 'bg-white/[0.05] text-white/90'}`}>
                          {m.texto}
                          <div className={`text-[10px] mt-1 ${minha ? 'text-white/60' : 'text-texto/40'}`}>
                            {new Date(m.criada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={fimRef} />
                </div>
                {aviso && (
                  <div className="mx-4 mb-3 rounded-xl bg-red-400/10 border border-red-400/25 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <span>{aviso}</span>
                  </div>
                )}
                <form onSubmit={enviar} className="p-4 border-t flex gap-2">
                  <input
                    value={texto} onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escreva sua mensagem…"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
                  />
                  <button
                    type="submit" disabled={enviando}
                    className="px-5 rounded-xl bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30 disabled:opacity-60 flex items-center gap-2"
                  >
                    {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
