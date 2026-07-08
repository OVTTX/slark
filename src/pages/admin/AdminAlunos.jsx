import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Users, Search, Trophy, School, Plus, X, Loader2, Pencil, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle, Copy, Check,
} from 'lucide-react'

const SENHA_PADRAO = 'Slark@2026'
const POR_PAGINA = 10
const FORM_VAZIO = { nome: '', email: '', escola_id: '', sala_id: '', caracteristica_id: '' }

export default function AdminAlunos() {
  const [alunos, setAlunos] = useState([])
  const [escolas, setEscolas] = useState([])
  const [salas, setSalas] = useState([])
  const [caracteristicas, setCaracteristicas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('todas')
  const [pagina, setPagina] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null) // aluno sendo editado, null = criando
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [criadoComSucesso, setCriadoComSucesso] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const [{ data: alunosData, error: e1 }, { data: escolasData, error: e2 }, { data: salasData, error: e3 }, { data: caracData, error: e4 }] =
        await Promise.all([
          supabase.from('alunos').select('*').order('pontos', { ascending: false }),
          supabase.from('escolas').select('id, nome'),
          supabase.from('salas').select('id, nome, escola_id'),
          supabase.from('caracteristicas').select('id, nome, cor'),
        ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (e4) throw e4

      const escolaPorId = Object.fromEntries((escolasData || []).map((e) => [e.id, e]))
      const salaPorId = Object.fromEntries((salasData || []).map((s) => [s.id, s]))
      const caracPorId = Object.fromEntries((caracData || []).map((c) => [c.id, c]))

      const lista = (alunosData || []).map((a) => ({
        ...a,
        escolaNome: escolaPorId[a.escola_id]?.nome || '—',
        salaNome: salaPorId[a.sala_id]?.nome || '—',
        caracteristica: caracPorId[a.caracteristica_id] || null,
      }))
      setAlunos(lista)
      setEscolas(escolasData || [])
      setSalas(salasData || [])
      setCaracteristicas(caracData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os alunos. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const listaFiltrada = useMemo(() => {
    return alunos.filter((a) => {
      const passaBusca = a.nome.toLowerCase().includes(busca.toLowerCase())
      const passaEscola = filtroEscola === 'todas' || a.escola_id === filtroEscola
      return passaBusca && passaEscola
    })
  }, [alunos, busca, filtroEscola])

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const listaDaPagina = listaFiltrada.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  const salasDaEscola = useMemo(() => salas.filter((s) => s.escola_id === form.escola_id), [salas, form.escola_id])

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setModalAberto(true)
  }

  function abrirEdicao(a) {
    setEditando(a)
    setForm({ nome: a.nome, email: '', escola_id: a.escola_id || '', sala_id: a.sala_id || '', caracteristica_id: a.caracteristica_id || '' })
    setModalAberto(true)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        const { error } = await supabase.from('alunos').update({
          nome: form.nome.trim(),
          sala_id: form.sala_id || null,
          caracteristica_id: form.caracteristica_id || null,
        }).eq('id', editando.id)
        if (error) throw error
        setModalAberto(false)
        await carregar()
      } else {
        const { data, error } = await supabase.functions.invoke('admin-usuarios', {
          body: {
            acao: 'criar_aluno',
            nome: form.nome.trim(),
            email: form.email.trim().toLowerCase(),
            escola_id: form.escola_id,
            sala_id: form.sala_id || null,
            caracteristica_id: form.caracteristica_id || null,
          },
        })
        if (error) throw error
        if (data?.error) throw new Error(data.error)

        const escolaNome = escolas.find((e) => e.id === form.escola_id)?.nome
        setCriadoComSucesso({ nome: form.nome.trim(), email: form.email.trim().toLowerCase(), escolaNome })
        setModalAberto(false)
        await carregar()
      }
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Não foi possível salvar o aluno.')
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return
    setExcluindo(true)
    setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: { acao: 'excluir_pessoa', tipo: 'aluno', aluno_id: paraExcluir.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setParaExcluir(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Não foi possível excluir o aluno.')
    } finally {
      setExcluindo(false)
    }
  }

  function copiarSenha() {
    navigator.clipboard?.writeText(SENHA_PADRAO)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Alunos</h1>
          <p className="mt-2 text-texto/60">Visão global de todos os alunos, em todas as escolas.</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Novo aluno
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto/40" />
          <input
            value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar aluno pelo nome…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
          />
        </div>
        <select
          value={filtroEscola} onChange={(e) => { setFiltroEscola(e.target.value); setPagina(1) }}
          className="px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
        >
          <option value="todas">Todas as escolas</option>
          {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {criadoComSucesso && (
        <div className="mt-6 rounded-2xl bg-[#3FD08A]/10 border border-[#3FD08A]/25 p-5">
          <div className="flex items-center gap-2 text-[#3FD08A] font-semibold">
            <Check size={16} /> Aluno criado: {criadoComSucesso.nome}
          </div>
          <p className="mt-1.5 text-sm text-texto/70">
            Login: <span className="text-white">{criadoComSucesso.email}</span> · Senha provisória: <span className="text-white font-mono">{SENHA_PADRAO}</span>
            {criadoComSucesso.escolaNome && <> · Escola: <span className="text-white">{criadoComSucesso.escolaNome}</span></>}
          </p>
          <button onClick={() => setCriadoComSucesso(null)} className="mt-2 text-xs text-texto/50 hover:text-white transition">Ok, entendi</button>
        </div>
      )}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando alunos…</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <Users className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            {alunos.length === 0 ? 'Nenhum aluno cadastrado ainda.' : 'Nenhum aluno encontrado com esse filtro.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-texto/50 border-b">
                  <th className="px-6 py-4 font-medium">Aluno</th>
                  <th className="px-6 py-4 font-medium">Escola</th>
                  <th className="px-6 py-4 font-medium">Sala</th>
                  <th className="px-6 py-4 font-medium">Característica</th>
                  <th className="px-6 py-4 font-medium">Nível</th>
                  <th className="px-6 py-4 font-medium text-right">Pontos</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listaDaPagina.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 font-semibold text-white">{a.nome}</td>
                    <td className="px-6 py-4 text-texto/70">
                      <div className="flex items-center gap-1.5"><School size={13} className="text-texto/40" />{a.escolaNome}</div>
                    </td>
                    <td className="px-6 py-4 text-texto/70">{a.salaNome}</td>
                    <td className="px-6 py-4">
                      {a.caracteristica ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: `${a.caracteristica.cor}22`, color: a.caracteristica.cor }}
                        >
                          {a.caracteristica.nome}
                        </span>
                      ) : <span className="text-texto/40 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4 text-texto/70">Nível {a.nivel}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5 font-bold text-white">
                        <Trophy size={14} className="text-[#F5C451]" /> {a.pontos}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => abrirEdicao(a)} title="Editar" className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setParaExcluir(a)} title="Excluir aluno" className="p-2 rounded-lg text-texto/60 hover:text-red-400 hover:bg-red-400/10 transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-texto/60">
              <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition">
                <ChevronLeft size={16} />
              </button>
              Página {paginaAtual} de {totalPaginas}
              <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editando ? 'Editar aluno' : 'Novo aluno'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition"><X size={20} /></button>
            </div>

            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Nome</label>
                <input
                  required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>

              {!editando && (
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">E-mail</label>
                  <input
                    required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Escola</label>
                <select
                  required disabled={!!editando} value={form.escola_id}
                  onChange={(e) => setForm({ ...form, escola_id: e.target.value, sala_id: '' })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition disabled:opacity-50"
                >
                  <option value="" disabled>Selecione…</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
                {editando && <p className="mt-1.5 text-xs text-texto/45">Pra trocar a escola do aluno, exclua e cadastre de novo.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Turma (opcional)</label>
                <select
                  value={form.sala_id} onChange={(e) => setForm({ ...form, sala_id: e.target.value })}
                  disabled={!form.escola_id}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition disabled:opacity-50"
                >
                  <option value="">Sem turma</option>
                  {salasDaEscola.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Característica (opcional)</label>
                <select
                  value={form.caracteristica_id} onChange={(e) => setForm({ ...form, caracteristica_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="">Nenhuma ainda</option>
                  {caracteristicas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {!editando && (
                <div className="rounded-xl bg-white/[0.03] border border-azul/10 p-4 text-sm text-texto/60 flex items-center justify-between gap-3">
                  <span>Senha provisória: <span className="text-white font-mono">{SENHA_PADRAO}</span></span>
                  <button type="button" onClick={copiarSenha} className="shrink-0 p-1.5 rounded-lg text-texto/50 hover:text-white hover:bg-white/10 transition" title="Copiar senha">
                    {copiado ? <Check size={14} className="text-[#3FD08A]" /> : <Copy size={14} />}
                  </button>
                </div>
              )}

              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar aluno'}
              </button>
            </form>
          </div>
        </div>
      )}

      {paraExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setParaExcluir(null)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border border-red-400/20 p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-11 h-11 rounded-full bg-red-400/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Excluir "{paraExcluir.nome}"?</h2>
                <p className="mt-1 text-sm text-texto/60 leading-relaxed">O login e o histórico do aluno são apagados. Essa ação é permanente.</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-red-400/5 border border-red-400/15 p-4 text-sm text-texto/70 leading-relaxed">
              Junto com o aluno somem: pontuações, selos, observações, entregas e participação em times.
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={() => setParaExcluir(null)} className="flex-1 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition">
                Cancelar
              </button>
              <button
                type="button" onClick={confirmarExclusao} disabled={excluindo}
                className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {excluindo && <Loader2 size={16} className="animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
