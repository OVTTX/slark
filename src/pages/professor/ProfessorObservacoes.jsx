import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Eye, Loader2, Search } from 'lucide-react'

export default function ProfessorObservacoes() {
  const { perfil } = useAuth()
  const [alunos, setAlunos] = useState([])
  const [alunoSelecionado, setAlunoSelecionado] = useState(null)
  const [observacoes, setObservacoes] = useState([])
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoObs, setCarregandoObs] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const { data: salasData, error: eSalas } = await supabase.from('salas').select('id, nome').eq('professor_id', perfil.id)
        if (eSalas) throw eSalas
        const salaIds = (salasData || []).map((s) => s.id)
        const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
        if (salaIds.length === 0) { setAlunos([]); return }

        const { data: alunosData, error: eAlunos } = await supabase.from('alunos').select('*').in('sala_id', salaIds).order('nome')
        if (eAlunos) throw eAlunos
        setAlunos((alunosData || []).map((a) => ({ ...a, salaNome: salaPorId[a.sala_id]?.nome || '—' })))
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar os alunos. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.id])

  async function carregarObservacoes(alunoId) {
    setCarregandoObs(true)
    try {
      const { data, error } = await supabase.from('observacoes').select('*').eq('aluno_id', alunoId).order('criada_em', { ascending: false })
      if (error) throw error
      setObservacoes(data || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as observações.')
    } finally {
      setCarregandoObs(false)
    }
  }

  function selecionar(aluno) {
    setAlunoSelecionado(aluno)
    setTexto('')
    carregarObservacoes(aluno.id)
  }

  async function adicionar(e) {
    e.preventDefault()
    if (!texto.trim() || !alunoSelecionado) return
    setSalvando(true)
    try {
      const { error } = await supabase.from('observacoes').insert({
        aluno_id: alunoSelecionado.id,
        professor_id: perfil.id,
        texto: texto.trim(),
      })
      if (error) throw error
      setTexto('')
      await carregarObservacoes(alunoSelecionado.id)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a observação.')
    } finally {
      setSalvando(false)
    }
  }

  const alunosFiltrados = useMemo(
    () => alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())),
    [alunos, busca],
  )

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Observações</h1>
      <p className="mt-2 text-texto/60">Registre anotações individuais sobre o desenvolvimento de cada aluno.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando alunos…</div>
      ) : alunos.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Eye className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum aluno nas suas turmas ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-card border p-4 lg:col-span-1 max-h-[560px] overflow-y-auto">
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto/40" />
              <input
                value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar aluno…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-azul/10 text-white text-sm focus:outline-none focus:border-azul transition"
              />
            </div>
            <div className="space-y-1">
              {alunosFiltrados.map((a) => (
                <button
                  key={a.id}
                  onClick={() => selecionar(a)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${alunoSelecionado?.id === a.id ? 'bg-azul text-white' : 'text-texto/70 hover:bg-white/5 hover:text-white'}`}
                >
                  <div className="font-medium">{a.nome}</div>
                  <div className={`text-xs ${alunoSelecionado?.id === a.id ? 'text-white/70' : 'text-texto/45'}`}>{a.salaNome}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!alunoSelecionado ? (
              <div className="rounded-2xl bg-card border p-12 text-center text-texto/50 h-full flex items-center justify-center">
                Selecione um aluno para ver ou adicionar observações.
              </div>
            ) : (
              <div className="rounded-2xl bg-card border p-6">
                <div className="font-bold text-white text-lg">{alunoSelecionado.nome}</div>
                <form onSubmit={adicionar} className="mt-4 flex gap-2">
                  <textarea
                    value={texto} onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escreva uma nova observação…"
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition resize-none"
                  />
                  <button
                    type="submit" disabled={salvando}
                    className="px-5 rounded-xl bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30 disabled:opacity-60 flex items-center gap-2"
                  >
                    {salvando && <Loader2 size={16} className="animate-spin" />}
                    Salvar
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t space-y-4">
                  {carregandoObs ? (
                    <div className="text-texto/50 text-sm">Carregando observações…</div>
                  ) : observacoes.length === 0 ? (
                    <p className="text-sm text-texto/45">Nenhuma observação registrada ainda.</p>
                  ) : (
                    observacoes.map((o) => (
                      <div key={o.id} className="rounded-xl bg-white/[0.03] p-4">
                        <p className="text-sm text-white/90 leading-relaxed">{o.texto}</p>
                        <div className="mt-2 text-xs text-texto/45">{new Date(o.criada_em).toLocaleString('pt-BR')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
