import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  GraduationCap, Plus, X, Loader2, Pencil, Trash2, Search, ChevronLeft, ChevronRight,
  Power, AlertTriangle, Copy, Check, School,
} from 'lucide-react'

const SENHA_PADRAO = 'Slark@2026'
const POR_PAGINA = 10
const FORM_VAZIO = { nome: '', email: '', escola_id: '' }

export default function AdminProfessores() {
  const { perfil } = useAuth()
  const [professores, setProfessores] = useState([])
  const [escolas, setEscolas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null) // usuario sendo editado (nome/escola), null = criando
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
      const [{ data: profData, error: e1 }, { data: escolasData, error: e2 }, { data: salasData, error: e3 }] = await Promise.all([
        supabase.from('usuarios').select('*').eq('perfil', 'professor').order('nome'),
        supabase.from('escolas').select('id, nome').order('nome'),
        supabase.from('salas').select('id, professor_id'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      const escolaPorId = Object.fromEntries((escolasData || []).map((e) => [e.id, e]))
      const turmasPorProfessor = {}
      for (const s of salasData || []) {
        if (!s.professor_id) continue
        turmasPorProfessor[s.professor_id] = (turmasPorProfessor[s.professor_id] || 0) + 1
      }
      setProfessores((profData || []).map((p) => ({
        ...p,
        escolaNome: escolaPorId[p.escola_id]?.nome || '—',
        qtdTurmas: turmasPorProfessor[p.id] || 0,
      })))
      setEscolas(escolasData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os professores. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const professoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return professores
    return professores.filter((p) =>
      p.nome.toLowerCase().includes(termo) || p.email.toLowerCase().includes(termo) || p.escolaNome.toLowerCase().includes(termo),
    )
  }, [professores, busca])

  const totalPaginas = Math.max(1, Math.ceil(professoresFiltrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const professoresDaPagina = professoresFiltrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setModalAberto(true)
  }

  function abrirEdicao(p) {
    setEditando(p)
    setForm({ nome: p.nome, email: p.email, escola_id: p.escola_id || '' })
    setModalAberto(true)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        const { error } = await supabase.from('usuarios').update({
          nome: form.nome.trim(),
          escola_id: form.escola_id,
        }).eq('id', editando.id)
        if (error) throw error
        setModalAberto(false)
        await carregar()
      } else {
        const { data, error } = await supabase.functions.invoke('admin-usuarios', {
          body: { acao: 'criar_professor', nome: form.nome.trim(), email: form.email.trim().toLowerCase(), escola_id: form.escola_id },
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
      setErro(e.message || 'Não foi possível salvar o professor.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(p) {
    try {
      const { error } = await supabase.from('usuarios').update({ ativo: !p.ativo }).eq('id', p.id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível alterar o status do professor.')
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return
    setExcluindo(true)
    setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: { acao: 'excluir_pessoa', tipo: 'professor', usuario_id: paraExcluir.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setParaExcluir(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Não foi possível excluir o professor.')
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
          <div className="flex items-center gap-3">
            <GraduationCap className="text-azul" size={28} />
            <h1 className="text-4xl font-bold text-white tracking-tight">Professores</h1>
          </div>
          <p className="mt-2 text-texto/60">Corpo docente de todas as escolas da rede.</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Novo professor
        </button>
      </div>

      <div className="mt-6 relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto/40" />
        <input
          value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1) }}
          placeholder="Buscar por nome, e-mail ou escola…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-azul/15 text-white placeholder:text-texto/30 focus:outline-none focus:border-azul transition"
        />
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {criadoComSucesso && (
        <div className="mt-6 rounded-2xl bg-[#3FD08A]/10 border border-[#3FD08A]/25 p-5">
          <div className="flex items-center gap-2 text-[#3FD08A] font-semibold">
            <Check size={16} /> Professor criado: {criadoComSucesso.nome}
          </div>
          <p className="mt-1.5 text-sm text-texto/70">
            Login: <span className="text-white">{criadoComSucesso.email}</span> · Senha provisória: <span className="text-white font-mono">{SENHA_PADRAO}</span>
            {criadoComSucesso.escolaNome && <> · Escola: <span className="text-white">{criadoComSucesso.escolaNome}</span></>}
          </p>
          <button onClick={() => setCriadoComSucesso(null)} className="mt-2 text-xs text-texto/50 hover:text-white transition">Ok, entendi</button>
        </div>
      )}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando professores…</div>
      ) : professoresFiltrados.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <GraduationCap className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            {professores.length === 0 ? 'Nenhum professor cadastrado ainda.' : 'Nenhum professor encontrado com essa busca.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-texto/50 border-b">
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium">Escola</th>
                  <th className="px-6 py-4 font-medium">Turmas</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {professoresDaPagina.map((p) => {
                  const souEu = p.id === perfil?.id
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{p.nome} {souEu && <span className="text-xs text-texto/40 font-normal">(você)</span>}</div>
                        <div className="text-xs text-texto/45 mt-0.5">{p.email}</div>
                      </td>
                      <td className="px-6 py-4 text-texto/70">
                        <div className="flex items-center gap-1.5"><School size={13} className="text-texto/40" /> {p.escolaNome}</div>
                      </td>
                      <td className="px-6 py-4 text-texto/70">{p.qtdTurmas}</td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: p.ativo ? '#3FD08A22' : '#FF6B6B22', color: p.ativo ? '#3FD08A' : '#FF6B6B' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.ativo ? '#3FD08A' : '#FF6B6B' }} />
                          {p.ativo ? 'Ativo' : 'Desativado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => abrirEdicao(p)} title="Editar" className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition">
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => alternarAtivo(p)} disabled={souEu}
                            title={souEu ? 'Você não pode desativar a própria conta' : p.ativo ? 'Desativar' : 'Ativar'}
                            className={`p-2 rounded-lg transition disabled:opacity-30 disabled:pointer-events-none ${p.ativo ? 'text-texto/60 hover:text-red-400 hover:bg-red-400/10' : 'text-texto/60 hover:text-[#3FD08A] hover:bg-[#3FD08A]/10'}`}
                          >
                            <Power size={16} />
                          </button>
                          <button
                            onClick={() => setParaExcluir(p)} disabled={souEu}
                            title="Excluir professor" className="p-2 rounded-lg text-texto/60 hover:text-red-400 hover:bg-red-400/10 transition disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editando ? 'Editar professor' : 'Novo professor'}</h2>
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
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">E-mail</label>
                <input
                  required type="email" disabled={!!editando} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition disabled:opacity-50"
                />
                {editando && <p className="mt-1.5 text-xs text-texto/45">O e-mail de login não pode ser trocado por aqui.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Escola</label>
                <select
                  required value={form.escola_id} onChange={(e) => setForm({ ...form, escola_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  <option value="" disabled>Selecione…</option>
                  {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
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
                {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar professor'}
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
                <p className="mt-1 text-sm text-texto/60 leading-relaxed">O login dessa pessoa deixa de existir. Essa ação é permanente.</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-red-400/5 border border-red-400/15 p-4 text-sm text-texto/70 leading-relaxed">
              Planos de aula e mensagens dele(a) são apagados junto.
              <p className="mt-2 text-texto/50">Turmas, atividades, gabaritos e trilhas que ele(a) criou continuam existindo, só ficam sem professor vinculado.</p>
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
