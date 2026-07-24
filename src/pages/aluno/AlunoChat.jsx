import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { MessageCircle, Send, Loader2, ShieldAlert } from 'lucide-react'

export default function AlunoChat() {
  const { perfil } = useAuth()
  const [professor, setProfessor] = useState(null)
  const [mensagens, setMensagens] = useState([])
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
      const { data: alunoData, error: eAluno } = await supabase.from('alunos').select('sala_id').eq('usuario_id', perfil.id).maybeSingle()
      if (eAluno) throw eAluno
      if (!alunoData?.sala_id) return

      const { data: salaData, error: eSala } = await supabase.from('salas').select('professor_id').eq('id', alunoData.sala_id).maybeSingle()
      if (eSala) throw eSala
      if (!salaData?.professor_id) return

      const { data: profData, error: eProf } = await supabase.from('usuarios').select('id, nome').eq('id', salaData.professor_id).maybeSingle()
      if (eProf) throw eProf
      setProfessor(profData)

      const { data: msgsData, error: eMsgs } = await supabase
        .from('mensagens').select('*')
        .or(`and(remetente_id.eq.${perfil.id},destinatario_id.eq.${salaData.professor_id}),and(remetente_id.eq.${salaData.professor_id},destinatario_id.eq.${perfil.id})`)
        .order('criada_em', { ascending: true })
      if (eMsgs) throw eMsgs
      setMensagens(msgsData || [])

      const naoLidas = (msgsData || []).filter((m) => m.destinatario_id === perfil.id && !m.lida)
      for (const m of naoLidas) {
        supabase.from('mensagens').update({ lida: true }).eq('id', m.id)
      }
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar o chat. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens])

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim() || !professor) return
    setEnviando(true)
    setAviso('')
    try {
      const textoEnviar = texto.trim()
      const { data: moderacao } = await supabase.functions.invoke('moderar-mensagem', {
        body: { texto: textoEnviar, destinatario_id: professor.id },
      })
      if (moderacao && moderacao.permitido === false) {
        setAviso('Essa mensagem não pode ser enviada por conter conteúdo impróprio ou perigoso. Se algo estiver errado, procure um adulto de confiança ou o professor pessoalmente.')
        return
      }
      const { error } = await supabase.from('mensagens').insert({ remetente_id: perfil.id, destinatario_id: professor.id, texto: textoEnviar })
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
      <h1 className="text-4xl font-bold text-white tracking-tight">Chat com o Professor</h1>
      <p className="mt-2 text-texto/60">Tire dúvidas diretamente com seu professor.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando conversa…</div>
      ) : !professor ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <MessageCircle className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Sua turma ainda não tem um professor vinculado.</p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl bg-card border flex flex-col h-[560px]">
          <div className="px-5 py-4 border-b font-semibold text-white">{professor.nome}</div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {mensagens.length === 0 && <p className="text-sm text-texto/45 text-center mt-8">Envie a primeira mensagem para começar a conversa.</p>}
            {mensagens.map((m) => {
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
        </div>
      )}
    </div>
  )
}
