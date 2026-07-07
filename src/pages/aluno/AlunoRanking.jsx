import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Trophy, Medal, UsersRound } from 'lucide-react'

const CORES_PODIO = ['#F5C451', '#C0C0C0', '#CD7F32']

export default function AlunoRanking() {
  const { perfil } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [times, setTimes] = useState([])
  const [aba, setAba] = useState('alunos')
  const [meuId, setMeuId] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: alunoData, error: eAluno } = await supabase.from('alunos').select('id, sala_id').eq('usuario_id', perfil.id).maybeSingle()
        if (eAluno) throw eAluno
        if (!alunoData?.sala_id) return
        setMeuId(alunoData.id)

        const [{ data: alunosData, error: eAlunos }, { data: timesData, error: eTimes }] = await Promise.all([
          supabase.from('alunos').select('*').eq('sala_id', alunoData.sala_id).order('pontos', { ascending: false }),
          supabase.from('times').select('*').eq('sala_id', alunoData.sala_id).order('pontos', { ascending: false }),
        ])
        if (eAlunos) throw eAlunos
        if (eTimes) throw eTimes
        setAlunos(alunosData || [])
        setTimes(timesData || [])
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar o ranking. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  const lista = aba === 'alunos' ? alunos : times
  const maior = lista[0]?.pontos || 1

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Ranking</h1>
      <p className="mt-2 text-texto/60">Como você e seu time estão na sua turma.</p>

      <div className="mt-6 inline-flex rounded-xl bg-card border p-1">
        <button onClick={() => setAba('alunos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'alunos' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>Alunos</button>
        <button onClick={() => setAba('times')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'times' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>Times</button>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando ranking…</div>
      ) : lista.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          {aba === 'alunos' ? <Trophy className="mx-auto text-azul/60" size={40} /> : <UsersRound className="mx-auto text-azul/60" size={40} />}
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            {aba === 'alunos' ? 'Nenhum aluno pontuado ainda.' : 'Nenhum time cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {lista.map((item, i) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 flex items-center gap-5 transition hover:-translate-y-0.5 hover:border-azul/40 ${aba === 'alunos' && item.id === meuId ? 'bg-azul/10 border-azul/40' : 'bg-card'}`}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
                style={{ background: i < 3 ? `${CORES_PODIO[i]}22` : 'rgba(255,255,255,0.05)', color: i < 3 ? CORES_PODIO[i] : 'rgba(255,255,255,0.5)' }}
              >
                {i < 3 ? <Medal size={20} /> : `${i + 1}º`}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{item.nome}{aba === 'alunos' && item.id === meuId ? ' (você)' : ''}</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${Math.max(4, (item.pontos / maior) * 100)}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 justify-end font-bold text-white text-lg shrink-0">
                <Trophy size={16} className="text-[#F5C451]" /> {item.pontos}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
