import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Target, BookOpen, Award, Trophy } from 'lucide-react'

export default function AlunoCompetencias() {
  const { perfil } = useAuth()
  const [aluno, setAluno] = useState(null)
  const [progressoTrilhas, setProgressoTrilhas] = useState({ concluidas: 0, total: 0 })
  const [selosConquistados, setSelosConquistados] = useState(0)
  const [selosTotal, setSelosTotal] = useState(0)
  const [areas, setAreas] = useState([])
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
        if (!alunoData) return

        const [{ data: trilhasData }, { count: concluidasCount }, { count: selosTotalCount }, { count: selosConquistadosCount }, { data: pontuacoesData }] = await Promise.all([
          supabase.from('trilhas').select('id', { count: 'exact', head: true }).eq('escola_id', perfil.escola_id).eq('status', 'publicado'),
          supabase.from('trilha_conclusoes').select('id', { count: 'exact', head: true }).eq('aluno_id', alunoData.id),
          supabase.from('selos').select('id', { count: 'exact', head: true }),
          supabase.from('aluno_selos').select('id', { count: 'exact', head: true }).eq('aluno_id', alunoData.id),
          supabase.from('pontuacoes').select('pontos, motivo').eq('aluno_id', alunoData.id),
        ])

        setProgressoTrilhas({ concluidas: concluidasCount || 0, total: trilhasData?.count || 0 })
        setSelosTotal(selosTotalCount || 0)
        setSelosConquistados(selosConquistadosCount || 0)

        const grupos = {}
        for (const p of pontuacoesData || []) {
          const chave = p.motivo || 'Outros'
          grupos[chave] = (grupos[chave] || 0) + p.pontos
        }
        setAreas(Object.entries(grupos).sort((a, b) => b[1] - a[1]).slice(0, 6))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar seu mapa. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  if (carregando) return <div className="text-texto/50">Carregando seu mapa…</div>

  if (!aluno) {
    return (
      <div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Mapa de Competências</h1>
        <p className="mt-4 text-texto/60">{erro || 'Ainda não encontramos seu cadastro de aluno. Fale com seu professor.'}</p>
      </div>
    )
  }

  const pctTrilhas = progressoTrilhas.total ? Math.round((progressoTrilhas.concluidas / progressoTrilhas.total) * 100) : 0
  const pctSelos = selosTotal ? Math.round((selosConquistados / selosTotal) * 100) : 0
  const maiorArea = areas[0]?.[1] || 1

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Mapa de Competências</h1>
      <p className="mt-2 text-texto/60">Seu perfil de desenvolvimento na Slark.</p>

      {aluno.caracteristicas && (
        <div className="mt-8 rounded-2xl bg-card border p-6">
          <div className="text-sm text-texto/60 mb-2">Sua característica</div>
          <span
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ background: `${aluno.caracteristicas.cor}22`, color: aluno.caracteristicas.cor }}
          >
            {aluno.caracteristicas.nome}
          </span>
          {aluno.caracteristicas.descricao && <p className="mt-3 text-sm text-texto/60 leading-relaxed">{aluno.caracteristicas.descricao}</p>}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-card border p-6">
          <div className="flex items-center gap-2 text-white font-semibold"><BookOpen size={18} className="text-azul" /> Trilhas concluídas</div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-bold text-white">{progressoTrilhas.concluidas}</span>
            <span className="text-texto/50 text-sm mb-1">de {progressoTrilhas.total}</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${Math.max(4, pctTrilhas)}%` }} />
          </div>
        </div>
        <div className="rounded-2xl bg-card border p-6">
          <div className="flex items-center gap-2 text-white font-semibold"><Award size={18} className="text-azul" /> Selos conquistados</div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-bold text-white">{selosConquistados}</span>
            <span className="text-texto/50 text-sm mb-1">de {selosTotal}</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-[#F5C451] transition-all" style={{ width: `${Math.max(4, pctSelos)}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2 text-white font-semibold mb-3"><Target size={18} className="text-azul" /> Áreas em que você mais se destacou</div>
        {areas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-azul/30 bg-card/40 p-8 text-center text-texto/60 text-sm">
            Ainda sem pontos registrados por motivo. Continue participando das atividades!
          </div>
        ) : (
          <div className="space-y-3">
            {areas.map(([motivo, pontos]) => (
              <div key={motivo} className="rounded-2xl bg-card border p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90 truncate">{motivo}</div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${Math.max(4, (pontos / maiorArea) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-white shrink-0">
                  <Trophy size={14} className="text-[#F5C451]" /> {pontos}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
