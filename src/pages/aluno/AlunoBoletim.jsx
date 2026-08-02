import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { GaugeCircle, Radio } from 'lucide-react'

function corDoValor(v) {
  if (v >= 70) return '#3FD08A'
  if (v >= 40) return '#F5C451'
  return '#FF6B6B'
}

export default function AlunoBoletim() {
  const { perfil } = useAuth()
  const [alunoId, setAlunoId] = useState(null)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [materiaPorId, setMateriaPorId] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar(idDoAluno) {
    try {
      const [{ data: avData, error: e1 }, { data: matData, error: e2 }] = await Promise.all([
        supabase.from('avaliacoes_aprendizado').select('*').eq('aluno_id', idDoAluno).order('data', { ascending: false }),
        supabase.from('materias').select('id, nome'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setAvaliacoes(avData || [])
      setMateriaPorId(Object.fromEntries((matData || []).map((m) => [m.id, m.nome])))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar seu boletim. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (!perfil?.id) return
    let canal
    async function iniciar() {
      setCarregando(true)
      setErro('')
      const { data: alunoData, error } = await supabase.from('alunos').select('id').eq('usuario_id', perfil.id).maybeSingle()
      if (error || !alunoData) { setCarregando(false); return }
      setAlunoId(alunoData.id)
      await carregar(alunoData.id)

      // Tempo real: qualquer lançamento novo do professor atualiza o boletim na hora.
      canal = supabase
        .channel(`boletim-${alunoData.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'avaliacoes_aprendizado', filter: `aluno_id=eq.${alunoData.id}` }, () => {
          carregar(alunoData.id)
        })
        .subscribe()
    }
    iniciar()
    return () => { if (canal) supabase.removeChannel(canal) }
  }, [perfil?.id])

  const porMateria = {}
  for (const a of avaliacoes) {
    if (!porMateria[a.materia_id]) porMateria[a.materia_id] = []
    porMateria[a.materia_id].push(a)
  }
  const resumoPorMateria = Object.entries(porMateria).map(([materiaId, lista]) => ({
    materiaId,
    nome: materiaPorId[materiaId] || 'Matéria',
    media: Math.round(lista.reduce((s, a) => s + a.valor, 0) / lista.length),
    ultima: lista[0],
    qtd: lista.length,
  }))
  const mediaGeral = resumoPorMateria.length
    ? Math.round(resumoPorMateria.reduce((s, m) => s + m.media, 0) / resumoPorMateria.length)
    : null

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Boletim</h1>
          <p className="mt-2 text-texto/60">Seu aprendizado por matéria, atualizado em tempo real pelos professores.</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-[#3FD08A] bg-[#3FD08A]/10 px-3 py-1.5 rounded-full">
          <Radio size={12} className="animate-pulse" /> Ao vivo
        </span>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando boletim…</div>
      ) : resumoPorMateria.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <GaugeCircle className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhuma avaliação de aprendizado lançada ainda.</p>
        </div>
      ) : (
        <>
          {mediaGeral !== null && (
            <div className="mt-8 rounded-2xl bg-card border p-8 flex items-center gap-6">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shrink-0" style={{ background: `${corDoValor(mediaGeral)}22`, color: corDoValor(mediaGeral) }}>
                {mediaGeral}%
              </div>
              <div>
                <div className="text-white font-semibold text-lg">Aprendizado geral</div>
                <p className="text-texto/60 text-sm mt-1">Média de todas as matérias avaliadas até agora.</p>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {resumoPorMateria.map((m) => (
              <div key={m.materiaId} className="rounded-2xl bg-card border p-6">
                <div className="font-bold text-white">{m.nome}</div>
                <div className="mt-3 h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${m.media}%`, background: corDoValor(m.media) }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-bold text-lg" style={{ color: corDoValor(m.media) }}>{m.media}%</span>
                  <span className="text-texto/45">{m.qtd} avaliação{m.qtd === 1 ? '' : 'ões'}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
