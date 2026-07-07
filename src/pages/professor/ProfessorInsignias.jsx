import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Award, Loader2 } from 'lucide-react'

export default function ProfessorInsignias() {
  const { perfil } = useAuth()
  const [selos, setSelos] = useState([])
  const [alunos, setAlunos] = useState([])
  const [concedidos, setConcedidos] = useState([]) // últimos concedidos
  const [alunoId, setAlunoId] = useState('')
  const [seloId, setSeloId] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  async function carregar() {
    if (!perfil?.id) return
    setCarregando(true)
    setErro('')
    try {
      const [{ data: selosData, error: eSelos }, { data: salasData, error: eSalas }] = await Promise.all([
        supabase.from('selos').select('*').order('pontos_necessarios'),
        supabase.from('salas').select('id').eq('professor_id', perfil.id),
      ])
      if (eSelos) throw eSelos
      if (eSalas) throw eSalas
      setSelos(selosData || [])

      const salaIds = (salasData || []).map((s) => s.id)
      if (salaIds.length === 0) { setAlunos([]); return }

      const { data: alunosData, error: eAlunos } = await supabase.from('alunos').select('id, nome, pontos').in('sala_id', salaIds).order('nome')
      if (eAlunos) throw eAlunos
      setAlunos(alunosData || [])

      const alunoIds = (alunosData || []).map((a) => a.id)
      if (alunoIds.length > 0) {
        const { data: concedidosData } = await supabase
          .from('aluno_selos').select('*, selos(nome, icone), alunos(nome)').in('aluno_id', alunoIds)
          .order('concedido_em', { ascending: false }).limit(8)
        setConcedidos(concedidosData || [])
      }
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as insígnias. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [perfil?.id])

  async function conceder(e) {
    e.preventDefault()
    if (!alunoId || !seloId) return
    setSalvando(true)
    setErro('')
    setAviso('')
    try {
      const { error } = await supabase.from('aluno_selos').insert({ aluno_id: alunoId, selo_id: seloId })
      if (error) {
        if (error.code === '23505') setAviso('Esse aluno já tem essa insígnia.')
        else throw error
      } else {
        setAviso('Insígnia concedida!')
        await carregar()
      }
    } catch (e) {
      console.error(e)
      setErro('Não foi possível conceder a insígnia.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Insígnias</h1>
      <p className="mt-2 text-texto/60">Reconheça conquistas dos seus alunos com selos.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando…</div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 rounded-2xl bg-card border p-6 h-fit">
            <div className="font-semibold text-white mb-4">Conceder insígnia</div>
            <form onSubmit={conceder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Aluno</label>
                <select
                  required value={alunoId} onChange={(e) => setAlunoId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="">Selecione…</option>
                  {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.pontos} pts)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Insígnia</label>
                <select
                  required value={seloId} onChange={(e) => setSeloId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="">Selecione…</option>
                  {selos.map((s) => <option key={s.id} value={s.id}>{s.icone} {s.nome}</option>)}
                </select>
              </div>
              {aviso && <p className="text-sm text-[#3FD08A] bg-[#3FD08A]/10 px-4 py-2.5 rounded-xl">{aviso}</p>}
              <button
                type="submit" disabled={salvando || alunos.length === 0 || selos.length === 0}
                className="w-full py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Concedendo…' : 'Conceder'}
              </button>
              {selos.length === 0 && <p className="text-xs text-texto/45">Nenhuma insígnia cadastrada pela equipe Slark ainda.</p>}
            </form>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="text-sm font-semibold text-texto/50 uppercase tracking-wide mb-3">Catálogo de insígnias</div>
              {selos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-azul/30 bg-card/40 p-8 text-center text-texto/60 text-sm">
                  Nenhuma insígnia cadastrada ainda.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {selos.map((s) => (
                    <div key={s.id} className="rounded-2xl bg-card border p-5 text-center">
                      <div className="text-4xl">{s.icone || <Award className="mx-auto text-azul/60" />}</div>
                      <div className="mt-2 font-semibold text-white text-sm">{s.nome}</div>
                      <div className="text-xs text-texto/50 mt-1">{s.descricao}</div>
                      <div className="text-[11px] text-texto/40 mt-2">{s.pontos_necessarios} pts sugeridos</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-texto/50 uppercase tracking-wide mb-3">Concedidas recentemente</div>
              {concedidos.length === 0 ? (
                <p className="text-sm text-texto/45">Nenhuma insígnia concedida ainda.</p>
              ) : (
                <div className="space-y-2">
                  {concedidos.map((c) => (
                    <div key={`${c.aluno_id}-${c.selo_id}`} className="rounded-xl bg-card/50 border p-3.5 flex items-center gap-3 text-sm">
                      <span className="text-xl">{c.selos?.icone}</span>
                      <span className="text-white/90 font-medium">{c.alunos?.nome}</span>
                      <span className="text-texto/50">ganhou</span>
                      <span className="text-white/90">{c.selos?.nome}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
