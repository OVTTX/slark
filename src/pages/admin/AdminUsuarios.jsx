import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  ShieldCheck, Plus, X, Loader2, Power, Trash2, Copy, Check, KeyRound, Building2, GraduationCap,
} from 'lucide-react'

const SENHA_PADRAO = 'Slark@2026'

const FUNCOES = [
  { valor: 'admin_slark', rotulo: 'Admin Slark', descricao: 'Acesso total ao painel, todas as escolas.', icon: ShieldCheck, cor: '#2E5BFF' },
  { valor: 'diretor', rotulo: 'Diretor', descricao: 'Entra como diretor de uma escola específica.', icon: Building2, cor: '#F5C451' },
  { valor: 'professor', rotulo: 'Professor', descricao: 'Entra como professor de uma escola específica.', icon: GraduationCap, cor: '#3FD08A' },
]

function rotuloFuncao(valor) {
  return FUNCOES.find((f) => f.valor === valor) || FUNCOES[0]
}

const FORM_VAZIO = { nome: '', email: '', funcao: 'admin_slark', escola_id: '' }

export default function AdminUsuarios() {
  const { perfil } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [escolas, setEscolas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [criando, setCriando] = useState(false)
  const [criadoComSucesso, setCriadoComSucesso] = useState(null) // { nome, email, funcao, escolaNome }
  const [copiado, setCopiado] = useState(false)
  const [excluindoId, setExcluindoId] = useState(null)
  const [paraExcluir, setParaExcluir] = useState(null)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const [{ data, error }, { data: escolasData, error: eEscolas }] = await Promise.all([
        // equipe fixa (admin_slark) + qualquer conta de suporte temporária, seja qual for a função
        supabase.from('usuarios').select('*, escolas(nome)').or('perfil.eq.admin_slark,temporario.eq.true').order('criado_em', { ascending: true }),
        supabase.from('escolas').select('id, nome').order('nome'),
      ])
      if (error) throw error
      if (eEscolas) throw eEscolas
      setUsuarios(data || [])
      setEscolas(escolasData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os usuários. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function criar(e) {
    e.preventDefault()
    if (form.funcao !== 'admin_slark' && !form.escola_id) {
      setErro('Selecione uma escola para essa função.')
      return
    }
    setCriando(true)
    setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: {
          acao: 'criar',
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          funcao: form.funcao,
          escola_id: form.funcao === 'admin_slark' ? null : form.escola_id,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const escolaNome = escolas.find((e) => e.id === form.escola_id)?.nome
      setCriadoComSucesso({ nome: form.nome.trim(), email: form.email.trim().toLowerCase(), funcao: form.funcao, escolaNome })
      setForm(FORM_VAZIO)
      setModalAberto(false)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Não foi possível criar o usuário.')
    } finally {
      setCriando(false)
    }
  }

  async function alternarAtivo(u) {
    try {
      const { error } = await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível alterar o status do usuário.')
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return
    setExcluindoId(paraExcluir.id)
    setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: { acao: 'excluir', usuario_id: paraExcluir.id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setParaExcluir(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Não foi possível excluir o usuário.')
    } finally {
      setExcluindoId(null)
    }
  }

  function copiarSenha() {
    navigator.clipboard?.writeText(SENHA_PADRAO)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  const funcaoEscolhida = rotuloFuncao(form.funcao)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-azul" size={28} />
            <h1 className="text-4xl font-bold text-white tracking-tight">Usuários de Suporte</h1>
          </div>
          <p className="mt-2 text-texto/60">Equipe fixa da Slark e logins temporários — como Admin Slark ou entrando direto como diretor/professor de uma escola específica.</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Novo usuário de suporte
        </button>
      </div>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {criadoComSucesso && (
        <div className="mt-6 rounded-2xl bg-[#3FD08A]/10 border border-[#3FD08A]/25 p-5">
          <div className="flex items-center gap-2 text-[#3FD08A] font-semibold">
            <Check size={16} /> Usuário criado: {criadoComSucesso.nome}
          </div>
          <p className="mt-1.5 text-sm text-texto/70">
            Login: <span className="text-white">{criadoComSucesso.email}</span> · Senha provisória:{' '}
            <span className="text-white font-mono">{SENHA_PADRAO}</span>
          </p>
          <p className="mt-1 text-sm text-texto/70">
            Entra como <span className="text-white font-semibold">{rotuloFuncao(criadoComSucesso.funcao).rotulo}</span>
            {criadoComSucesso.escolaNome && <> da escola <span className="text-white font-semibold">{criadoComSucesso.escolaNome}</span></>}.
          </p>
          <p className="mt-1 text-xs text-texto/50">Peça para a pessoa trocar a senha em "Perfil" assim que acessar.</p>
          <button onClick={() => setCriadoComSucesso(null)} className="mt-3 text-xs text-texto/50 hover:text-white transition">Ok, entendi</button>
        </div>
      )}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando usuários…</div>
      ) : (
        <div className="mt-8 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">E-mail</th>
                <th className="px-6 py-4 font-medium">Função</th>
                <th className="px-6 py-4 font-medium">Escola</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const souEu = u.id === perfil?.id
                const f = rotuloFuncao(u.perfil)
                const FuncaoIcon = f.icon
                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4 font-semibold text-white">
                      {u.nome} {souEu && <span className="text-xs text-texto/40 font-normal">(você)</span>}
                    </td>
                    <td className="px-6 py-4 text-texto/70">{u.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: `${f.cor}22`, color: f.cor }}
                        >
                          <FuncaoIcon size={11} /> {f.rotulo}
                        </span>
                        {u.temporario && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-texto/45">
                            <KeyRound size={10} /> suporte temporário
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-texto/70">{u.escolas?.nome || '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: u.ativo ? '#3FD08A22' : '#FF6B6B22', color: u.ativo ? '#3FD08A' : '#FF6B6B' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.ativo ? '#3FD08A' : '#FF6B6B' }} />
                        {u.ativo ? 'Ativo' : 'Desativado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => alternarAtivo(u)}
                          disabled={souEu}
                          title={souEu ? 'Você não pode desativar a própria conta' : u.ativo ? 'Desativar acesso' : 'Reativar acesso'}
                          className={`p-2 rounded-lg transition disabled:opacity-30 disabled:pointer-events-none ${u.ativo ? 'text-texto/60 hover:text-red-400 hover:bg-red-400/10' : 'text-texto/60 hover:text-[#3FD08A] hover:bg-[#3FD08A]/10'}`}
                        >
                          <Power size={16} />
                        </button>
                        {u.temporario && (
                          <button
                            onClick={() => setParaExcluir(u)}
                            disabled={souEu || excluindoId === u.id}
                            title="Excluir conta de suporte"
                            className="p-2 rounded-lg text-texto/60 hover:text-red-400 hover:bg-red-400/10 transition disabled:opacity-30 disabled:pointer-events-none"
                          >
                            {excluindoId === u.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Novo usuário de suporte</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={criar} className="space-y-4">
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
                  required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Função</label>
                <div className="grid grid-cols-3 gap-2">
                  {FUNCOES.map((f) => {
                    const Icon = f.icon
                    const selecionada = form.funcao === f.valor
                    return (
                      <button
                        key={f.valor}
                        type="button"
                        onClick={() => setForm({ ...form, funcao: f.valor, escola_id: f.valor === 'admin_slark' ? '' : form.escola_id })}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition ${selecionada ? 'border-azul bg-azul/10 text-white' : 'border-white/10 text-texto/60 hover:text-white hover:bg-white/5'}`}
                      >
                        <Icon size={16} style={{ color: selecionada ? f.cor : undefined }} />
                        {f.rotulo}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-xs text-texto/45">{funcaoEscolhida.descricao}</p>
              </div>

              {form.funcao !== 'admin_slark' && (
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Escola</label>
                  <select
                    required value={form.escola_id} onChange={(e) => setForm({ ...form, escola_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  >
                    <option value="" disabled>Selecione…</option>
                    {escolas.map((esc) => <option key={esc.id} value={esc.id}>{esc.nome}</option>)}
                  </select>
                  {escolas.length === 0 && <p className="mt-1.5 text-xs text-[#F5C451]">Nenhuma escola cadastrada ainda.</p>}
                </div>
              )}

              <div className="rounded-xl bg-white/[0.03] border border-azul/10 p-4 text-sm text-texto/60 flex items-center justify-between gap-3">
                <span>Senha provisória: <span className="text-white font-mono">{SENHA_PADRAO}</span></span>
                <button type="button" onClick={copiarSenha} className="shrink-0 p-1.5 rounded-lg text-texto/50 hover:text-white hover:bg-white/10 transition" title="Copiar senha">
                  {copiado ? <Check size={14} className="text-[#3FD08A]" /> : <Copy size={14} />}
                </button>
              </div>

              <p className="text-xs text-texto/45 leading-relaxed">
                {form.funcao === 'admin_slark'
                  ? 'Essa conta tem acesso total de Admin Slark (mesmo nível da equipe fixa).'
                  : `Essa conta entra direto como ${funcaoEscolhida.rotulo.toLowerCase()} da escola selecionada — vê exatamente o que essa pessoa veria.`}
                {' '}Use para suporte pontual e desative ou exclua quando não precisar mais.
              </p>

              <button
                type="submit" disabled={criando || (form.funcao !== 'admin_slark' && escolas.length === 0)}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {criando && <Loader2 size={18} className="animate-spin" />}
                {criando ? 'Criando…' : 'Criar usuário'}
              </button>
            </form>
          </div>
        </div>
      )}

      {paraExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setParaExcluir(null)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border border-red-400/20 p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white">Excluir "{paraExcluir.nome}"?</h2>
            <p className="mt-2 text-sm text-texto/60 leading-relaxed">
              O login dessa pessoa deixa de existir imediatamente. Essa ação é permanente.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button" onClick={() => setParaExcluir(null)}
                className="flex-1 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button" onClick={confirmarExclusao} disabled={excluindoId === paraExcluir.id}
                className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {excluindoId === paraExcluir.id && <Loader2 size={16} className="animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
