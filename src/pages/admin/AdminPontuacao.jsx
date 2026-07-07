import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Trophy, Medal, Users } from 'lucide-react'

const CORES_PODIO = ['#F5C451', '#C0C0C0', '#CD7F32']

export default function AdminPontuacao() {
  const [ranking, setRanking] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const [{ data: escolasData, error: e1 }, { data: alunosData, error: e2 }] = await Promise.all([
          supabase.from('escolas').select('id, nome, cidade, estado'),
          supabase.from('alunos').select('escola_id, pontos'),
        ])
        if (e1) throw e1
        if (e2) throw e2

        const somaPorEscola = {}
        const qtdPorEscola = {}
        for (const a of alunosData || []) {
          somaPorEscola[a.escola_id] = (somaPorEscola[a.escola_id] || 0) + (a.pontos || 0)
          qtdPorEscola[a.escola_id] = (qtdPorEscola[a.escola_id] || 0) + 1
        }

        const lista = (escolasData || [])
          .map((esc) => {
            const total = somaPorEscola[esc.id] || 0
            const qtd = qtdPorEscola[esc.id] || 0
            return {
              ...esc,
              totalPontos: total,
              qtdAlunos: qtd,
              media: qtd > 0 ? Math.round(total / qtd) : 0,
            }
          })
          .sort((a, b) => b.totalPontos - a.totalPontos)

        setRanking(lista)
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar o ranking. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const maiorPontuacao = ranking[0]?.totalPontos || 1

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Pontuação Global</h1>
      <p className="mt-2 text-texto/60">Ranking de pontos Slark entre todas as escolas.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando ranking…</div>
      ) : ranking.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Trophy className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            Nenhuma escola com alunos pontuados ainda.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {ranking.map((esc, i) => (
            <div
              key={esc.id}
              className="rounded-2xl bg-card border p-5 flex items-center gap-5 transition hover:-translate-y-0.5 hover:border-azul/40"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
                style={{
                  background: i < 3 ? `${CORES_PODIO[i]}22` : 'rgba(255,255,255,0.05)',
                  color: i < 3 ? CORES_PODIO[i] : 'rgba(255,255,255,0.5)',
                }}
              >
                {i < 3 ? <Medal size={20} /> : `${i + 1}º`}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{esc.nome}</div>
                <div className="text-xs text-texto/50">{[esc.cidade, esc.estado].filter(Boolean).join(' - ') || '—'}</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-azul transition-all"
                    style={{ width: `${Math.max(4, (esc.totalPontos / maiorPontuacao) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5 justify-end font-bold text-white text-lg">
                  <Trophy size={16} className="text-[#F5C451]" /> {esc.totalPontos}
                </div>
                <div className="flex items-center gap-1 justify-end text-xs text-texto/50 mt-0.5">
                  <Users size={12} /> {esc.qtdAlunos} alunos · média {esc.media}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
