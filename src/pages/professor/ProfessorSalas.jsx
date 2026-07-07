import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { School, Users, BookOpen, ClipboardList } from 'lucide-react'

export default function ProfessorSalas() {
  const { perfil } = useAuth()
  const [salas, setSalas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: salasData, error: eSalas } = await supabase.from('salas').select('*').eq('professor_id', perfil.id).order('nome')
        if (eSalas) throw eSalas
        const salaIds = (salasData || []).map((s) => s.id)

        let alunosPorSala = {}
        let atividadesPorSala = {}
        let trilhasPorSala = {}
        if (salaIds.length > 0) {
          const [{ data: alunosData }, { data: atividadesData }, { data: trilhasData }] = await Promise.all([
            supabase.from('alunos').select('sala_id').in('sala_id', salaIds),
            supabase.from('atividades').select('sala_id').in('sala_id', salaIds),
            supabase.from('trilhas').select('sala_id').eq('professor_id', perfil.id),
          ])
          for (const a of alunosData || []) alunosPorSala[a.sala_id] = (alunosPorSala[a.sala_id] || 0) + 1
          for (const a of atividadesData || []) atividadesPorSala[a.sala_id] = (atividadesPorSala[a.sala_id] || 0) + 1
          for (const t of trilhasData || []) trilhasPorSala[t.sala_id] = (trilhasPorSala[t.sala_id] || 0) + 1
        }

        setSalas((salasData || []).map((s) => ({
          ...s,
          qtdAlunos: alunosPorSala[s.id] || 0,
          qtdAtividades: atividadesPorSala[s.id] || 0,
          qtdTrilhas: trilhasPorSala[s.id] || 0,
        })))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar as salas. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Minhas Salas</h1>
      <p className="mt-2 text-texto/60">As turmas sob sua responsabilidade.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando salas…</div>
      ) : salas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <School className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            Você ainda não é responsável por nenhuma sala. Peça ao diretor da sua escola para vincular você.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {salas.map((s) => (
            <div key={s.id} className="rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40">
              <div className="font-bold text-white text-lg">{s.nome}</div>
              {s.serie && <div className="text-texto/50 text-sm">{s.serie}</div>}
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/[0.03] py-3">
                  <div className="flex items-center justify-center gap-1 text-texto/45"><Users size={13} /></div>
                  <div className="mt-1 font-bold text-white">{s.qtdAlunos}</div>
                  <div className="text-[11px] text-texto/45">alunos</div>
                </div>
                <div className="rounded-xl bg-white/[0.03] py-3">
                  <div className="flex items-center justify-center gap-1 text-texto/45"><ClipboardList size={13} /></div>
                  <div className="mt-1 font-bold text-white">{s.qtdAtividades}</div>
                  <div className="text-[11px] text-texto/45">atividades</div>
                </div>
                <div className="rounded-xl bg-white/[0.03] py-3">
                  <div className="flex items-center justify-center gap-1 text-texto/45"><BookOpen size={13} /></div>
                  <div className="mt-1 font-bold text-white">{s.qtdTrilhas}</div>
                  <div className="text-[11px] text-texto/45">trilhas</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
