import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BookOpen, FileText, File, Link2, CheckCircle2, X, Loader2 } from 'lucide-react'

const ICONE_TIPO = { texto: FileText, pdf: File, link: Link2, canva: Link2 }

export default function AlunoTrilhas() {
  const { perfil } = useAuth()
  const [alunoId, setAlunoId] = useState(null)
  const [trilhas, setTrilhas] = useState([])
  const [concluidas, setConcluidas] = useState(new Set())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [trilhaAberta, setTrilhaAberta] = useState(null)

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const { data: alunoData, error: eAluno } = await supabase.from('alunos').select('id, sala_id').eq('usuario_id', perfil.id).maybeSingle()
      if (eAluno) throw eAluno
      if (!alunoData) { setTrilhas([]); return }
      setAlunoId(alunoData.id)

      const { data: trilhasData, error: eTrilhas } = await supabase
        .from('trilhas')
        .select('*, trilha_blocos(*)')
        .eq('escola_id', perfil.escola_id)
        .eq('status', 'publicado')
        .or(`sala_id.eq.${alunoData.sala_id},sala_id.is.null`)
        .order('criada_em', { ascending: false })
      if (eTrilhas) throw eTrilhas

      const { data: conclusoesData, error: eConc } = await supabase
        .from('trilha_conclusoes').select('trilha_id').eq('aluno_id', alunoData.id)
      if (eConc) throw eConc

      setTrilhas((trilhasData || []).map((t) => ({ ...t, blocos: (t.trilha_blocos || []).sort((a, b) => a.ordem - b.ordem) })))
      setConcluidas(new Set((conclusoesData || []).map((c) => c.trilha_id)))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as trilhas. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Trilhas</h1>
      <p className="mt-2 text-texto/60">Conteúdos preparados pelo seu professor.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando trilhas…</div>
      ) : trilhas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <BookOpen className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma trilha disponível ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trilhas.map((t) => {
            const feita = concluidas.has(t.id)
            return (
              <button
                key={t.id}
                onClick={() => setTrilhaAberta(t)}
                className="text-left rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-white text-lg leading-snug">{t.titulo}</div>
                  {feita && <CheckCircle2 size={20} className="text-[#3FD08A] shrink-0" />}
                </div>
                {t.descricao && <p className="text-texto/60 text-sm mt-2 line-clamp-2">{t.descricao}</p>}
                <div className="mt-4 text-xs text-texto/45">{t.blocos.length} bloco(s) de conteúdo</div>
              </button>
            )
          })}
        </div>
      )}

      {trilhaAberta && (
        <TrilhaModal
          trilha={trilhaAberta}
          alunoId={alunoId}
          concluida={concluidas.has(trilhaAberta.id)}
          onFechar={() => setTrilhaAberta(null)}
          onConcluida={() => { setConcluidas(new Set([...concluidas, trilhaAberta.id])); }}
        />
      )}
    </div>
  )
}

function TrilhaModal({ trilha, alunoId, concluida, onFechar, onConcluida }) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function marcarConcluida() {
    setSalvando(true)
    setErro('')
    try {
      const { error } = await supabase.from('trilha_conclusoes').insert({ trilha_id: trilha.id, aluno_id: alunoId })
      if (error) throw error
      onConcluida()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível marcar como concluída.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onFechar}>
      <div className="w-full max-w-lg rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">{trilha.titulo}</h2>
          <button onClick={onFechar} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
        </div>
        {trilha.descricao && <p className="text-sm text-texto/60 mb-6">{trilha.descricao}</p>}

        <div className="space-y-3">
          {trilha.blocos.length === 0 && <p className="text-sm text-texto/45">Essa trilha ainda não tem conteúdo.</p>}
          {trilha.blocos.map((b) => {
            const Icon = ICONE_TIPO[b.tipo] || FileText
            return (
              <div key={b.id} className="rounded-xl bg-card border p-4">
                <div className="flex items-center gap-2 text-xs text-texto/45 mb-2">
                  <Icon size={13} /> {b.tipo === 'texto' ? 'Texto' : b.tipo === 'pdf' ? 'PDF' : b.tipo === 'canva' ? 'Arte' : 'Link'}
                </div>
                {b.tipo === 'texto' ? (
                  <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{b.conteudo?.texto}</p>
                ) : (
                  <a href={b.conteudo?.url} target="_blank" rel="noopener" className="text-sm text-azul hover:underline break-all">
                    {b.conteudo?.url}
                  </a>
                )}
              </div>
            )
          })}
        </div>

        {erro && <p className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

        <button
          onClick={marcarConcluida}
          disabled={concluida || salvando}
          className="w-full mt-6 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {salvando && <Loader2 size={18} className="animate-spin" />}
          {concluida ? <><CheckCircle2 size={18} /> Concluída</> : salvando ? 'Salvando…' : 'Marcar como concluída'}
        </button>
      </div>
    </div>
  )
}
