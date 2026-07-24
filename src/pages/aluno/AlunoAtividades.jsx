import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ClipboardList, Loader2, CheckCircle2, Send } from 'lucide-react'

const STATUS_ROTULO = { pendente: 'Pendente', entregue: 'Entregue', corrigida: 'Corrigida', atrasada: 'Atrasada' }
const STATUS_COR = { pendente: '#8892B0', entregue: '#2E5BFF', corrigida: '#3FD08A', atrasada: '#FF6B6B' }

export default function AlunoAtividades() {
  const { perfil } = useAuth()
  const [alunoId, setAlunoId] = useState(null)
  const [atividades, setAtividades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(null)
  const [texto, setTexto] = useState('')
  const [arquivoUrl, setArquivoUrl] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: alunoData, error: eAluno } = await supabase.from('alunos').select('id, sala_id').eq('usuario_id', perfil.id).maybeSingle()
      if (eAluno) throw eAluno
      if (!alunoData) { setAtividades([]); return }
      setAlunoId(alunoData.id)

      const { data: atividadesData, error: eAt } = await supabase
        .from('atividades').select('*').eq('sala_id', alunoData.sala_id).order('criada_em', { ascending: false })
      if (eAt) throw eAt

      const atividadeIds = (atividadesData || []).map((a) => a.id)
      let entregaPorAtividade = {}
      if (atividadeIds.length) {
        const { data: entregasData } = await supabase.from('entregas').select('*').eq('aluno_id', alunoData.id).in('atividade_id', atividadeIds)
        for (const e of entregasData || []) entregaPorAtividade[e.atividade_id] = e
      }

      setAtividades((atividadesData || []).map((a) => ({ ...a, entrega: entregaPorAtividade[a.id] || null })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as atividades. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  function abrir(a) {
    setAberto(a)
    setTexto(a.entrega?.texto || '')
    setArquivoUrl(a.entrega?.arquivo_url || '')
  }

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim() && !arquivoUrl.trim()) return
    setEnviando(true)
    try {
      if (aberto.entrega) {
        const { error } = await supabase.from('entregas').update({
          texto: texto || null, arquivo_url: arquivoUrl || null, status: 'entregue', entregue_em: new Date().toISOString(),
        }).eq('id', aberto.entrega.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('entregas').insert({
          atividade_id: aberto.id, aluno_id: alunoId, texto: texto || null, arquivo_url: arquivoUrl || null,
          status: 'entregue', entregue_em: new Date().toISOString(),
        })
        if (error) throw error
      }
      setAberto(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível enviar sua entrega.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Atividades</h1>
      <p className="mt-2 text-texto/60">Entregue suas tarefas e acompanhe o feedback do professor.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando atividades…</div>
      ) : atividades.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <ClipboardList className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma atividade por enquanto.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {atividades.map((a) => {
            const status = a.entrega?.status || 'pendente'
            return (
              <button
                key={a.id} onClick={() => abrir(a)}
                className="w-full text-left rounded-2xl bg-card border p-5 flex items-center justify-between gap-4 transition hover:-translate-y-0.5 hover:border-azul/40"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white">{a.titulo}</div>
                  {a.prazo && <div className="text-xs text-texto/45 mt-1">Prazo: {new Date(a.prazo).toLocaleDateString('pt-BR')}</div>}
                  {a.entrega?.nota != null && <div className="text-xs text-[#3FD08A] mt-1">Nota: {Math.round(Number(a.entrega.nota))}%</div>}
                </div>
                <span
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: `${STATUS_COR[status]}22`, color: STATUS_COR[status] }}
                >
                  {STATUS_ROTULO[status]}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setAberto(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white">{aberto.titulo}</h2>
            {aberto.descricao && <p className="text-sm text-texto/60 mt-2">{aberto.descricao}</p>}

            {aberto.entrega?.status === 'corrigida' && (
              <div className="mt-4 rounded-xl bg-[#3FD08A]/10 border border-[#3FD08A]/30 p-4">
                <div className="flex items-center gap-2 text-[#3FD08A] font-semibold text-sm"><CheckCircle2 size={15} /> Corrigida — {Math.round(Number(aberto.entrega.nota))}%</div>
                {aberto.entrega.feedback_ia && <p className="text-sm text-white/80 mt-2">{aberto.entrega.feedback_ia}</p>}
              </div>
            )}

            <form onSubmit={enviar} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Sua resposta</label>
                <textarea
                  value={texto} onChange={(e) => setTexto(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Link do arquivo (opcional)</label>
                <input
                  value={arquivoUrl} onChange={(e) => setArquivoUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>
              <button
                type="submit" disabled={enviando}
                className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                {enviando ? 'Enviando…' : aberto.entrega ? 'Reenviar entrega' : 'Enviar entrega'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
