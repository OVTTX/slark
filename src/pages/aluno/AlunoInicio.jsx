import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Trophy, Award, Sparkles, School, Crown, Brain, Lightbulb, MessageCircle, HeartHandshake, Eye, Search } from 'lucide-react'

// selos antigos guardam um emoji em "icone"; os ligados a características
// guardam o nome de um ícone lucide (ex: "Lightbulb").
const ICONES_LUCIDE = { Crown, Brain, Lightbulb, MessageCircle, HeartHandshake, Eye, Search }

function IconeSelo({ icone, size = 32, className = '' }) {
  const Comp = icone && ICONES_LUCIDE[icone]
  if (Comp) return <Comp size={size} className={className} />
  if (!icone) return <Award size={size} className={className} />
  return <span className="leading-none" style={{ fontSize: size }}>{icone}</span>
}

export default function AlunoInicio() {
  const { perfil } = useAuth()
  const [aluno, setAluno] = useState(null)
  const [sala, setSala] = useState(null)
  const [selos, setSelos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: alunoData, error: eAluno } = await supabase
          .from('alunos').select('*, caracteristicas(nome, cor, descricao)').eq('usuario_id', perfil.id).maybeSingle()
        if (eAluno) throw eAluno
        setAluno(alunoData)

        if (alunoData?.sala_id) {
          const { data: salaData } = await supabase.from('salas').select('nome, serie').eq('id', alunoData.sala_id).maybeSingle()
          setSala(salaData)
        }

        if (alunoData?.id) {
          const { data: selosData } = await supabase
            .from('aluno_selos').select('concedido_em, selos(nome, descricao, icone, pontos_necessarios)').eq('aluno_id', alunoData.id)
          setSelos(selosData || [])
        }
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar seu painel. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  if (carregando) return <div className="text-texto/50">Carregando seu painel…</div>

  if (!aluno) {
    return (
      <div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Meu Painel</h1>
        <p className="mt-4 text-texto/60">{erro || 'Ainda não encontramos seu cadastro de aluno. Fale com seu professor.'}</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Olá, {aluno.nome.split(' ')[0]}!</h1>
      <p className="mt-2 text-texto/60">Seus pontos, selos e progresso na Slark.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl bg-card border p-6">
          <div className="flex items-center gap-2 text-sm text-texto/60"><Trophy size={15} /> Pontos</div>
          <div className="mt-1 text-3xl font-bold text-[#F5C451]">{aluno.pontos}</div>
        </div>
        <div className="rounded-2xl bg-card border p-6">
          <div className="flex items-center gap-2 text-sm text-texto/60"><Sparkles size={15} /> Nível</div>
          <div className="mt-1 text-3xl font-bold text-white">{aluno.nivel}</div>
        </div>
        <div className="rounded-2xl bg-card border p-6">
          <div className="flex items-center gap-2 text-sm text-texto/60"><School size={15} /> Turma</div>
          <div className="mt-1 text-xl font-bold text-white">{sala?.nome || '—'}</div>
        </div>
      </div>

      {aluno.caracteristicas && (
        <div className="mt-6 rounded-2xl bg-card border p-6">
          <div className="text-sm text-texto/60 mb-2">Sua característica</div>
          <span
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ background: `${aluno.caracteristicas.cor}22`, color: aluno.caracteristicas.cor }}
          >
            {aluno.caracteristicas.nome}
          </span>
          {aluno.caracteristicas.descricao && (
            <p className="mt-3 text-sm text-texto/60 leading-relaxed">{aluno.caracteristicas.descricao}</p>
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center gap-2 text-white font-semibold mb-3">
          <Award size={18} className="text-azul" /> Meus selos
        </div>
        {selos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-azul/30 bg-card/40 p-8 text-center text-texto/60 text-sm">
            Ainda sem selos — continue somando pontos!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {selos.map((s, i) => (
              <div key={i} className="rounded-2xl bg-card border p-5 text-center">
                <div className="h-9 flex items-center justify-center">
                  <IconeSelo icone={s.selos.icone} size={30} className="text-azul/80" />
                </div>
                <div className="mt-2 font-semibold text-white text-sm">{s.selos.nome}</div>
                <div className="text-xs text-texto/50 mt-1">{s.selos.descricao}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
