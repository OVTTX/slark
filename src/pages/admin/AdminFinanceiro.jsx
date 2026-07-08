import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CreditCard, DollarSign, Plus, X, Loader2, Check, Pencil, Wallet } from 'lucide-react'

const STATUS_ASSINATURA = [
  { valor: 'trial', rotulo: 'Trial', cor: '#F5C451' },
  { valor: 'ativa', rotulo: 'Ativa', cor: '#3FD08A' },
  { valor: 'inadimplente', rotulo: 'Inadimplente', cor: '#FF6B6B' },
  { valor: 'cancelada', rotulo: 'Cancelada', cor: '#8892B0' },
]

const STATUS_PAGAMENTO = [
  { valor: 'pendente', rotulo: 'Pendente', cor: '#F5C451' },
  { valor: 'pago', rotulo: 'Pago', cor: '#3FD08A' },
  { valor: 'atrasado', rotulo: 'Atrasado', cor: '#FF6B6B' },
  { valor: 'estornado', rotulo: 'Estornado', cor: '#8892B0' },
]

function badgeAssinatura(status) {
  const s = STATUS_ASSINATURA.find((x) => x.valor === status) || STATUS_ASSINATURA[0]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: `${s.cor}22`, color: s.cor }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.cor }} />
      {s.rotulo}
    </span>
  )
}

function badgePagamento(status) {
  const s = STATUS_PAGAMENTO.find((x) => x.valor === status) || STATUS_PAGAMENTO[0]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: `${s.cor}22`, color: s.cor }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.cor }} />
      {s.rotulo}
    </span>
  )
}

export default function AdminFinanceiro() {
  const [aba, setAba] = useState('assinaturas')

  return (
    <div>
      <div className="flex items-center gap-3">
        <Wallet className="text-azul" size={28} />
        <h1 className="text-4xl font-bold text-white tracking-tight">Financeiro</h1>
      </div>
      <p className="mt-2 text-texto/60">Assinaturas e cobranças de todas as escolas clientes.</p>

      <div className="mt-6 inline-flex rounded-xl bg-card border p-1">
        <button onClick={() => setAba('assinaturas')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'assinaturas' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Assinaturas
        </button>
        <button onClick={() => setAba('pagamentos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'pagamentos' ? 'bg-azul text-white' : 'text-texto/60 hover:text-white'}`}>
          Pagamentos
        </button>
      </div>

      {aba === 'assinaturas' ? <Assinaturas /> : <Pagamentos />}
    </div>
  )
}

function Assinaturas() {
  const [assinaturas, setAssinaturas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ status: 'trial', preco_por_aluno: '0', qtd_alunos_contratada: '0', proxima_cobranca: '' })
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const [{ data: assinaturasData, error: e1 }, { data: escolasData, error: e2 }] = await Promise.all([
        supabase.from('assinaturas').select('*').order('criada_em', { ascending: false }),
        supabase.from('escolas').select('id, nome'),
      ])
      if (e1) throw e1
      if (e2) throw e2

      const escolaPorId = Object.fromEntries((escolasData || []).map((e) => [e.id, e]))
      setAssinaturas((assinaturasData || []).map((a) => ({ ...a, escolaNome: escolaPorId[a.escola_id]?.nome || '—' })))
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar as assinaturas. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function abrirEdicao(a) {
    setEditando(a)
    setForm({
      status: a.status,
      preco_por_aluno: a.preco_por_aluno ?? '0',
      qtd_alunos_contratada: a.qtd_alunos_contratada ?? '0',
      proxima_cobranca: a.proxima_cobranca || '',
    })
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const { error } = await supabase.from('assinaturas').update({
        status: form.status,
        preco_por_aluno: Number(form.preco_por_aluno),
        qtd_alunos_contratada: Number(form.qtd_alunos_contratada),
        proxima_cobranca: form.proxima_cobranca || null,
      }).eq('id', editando.id)
      if (error) throw error
      setEditando(null)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar a assinatura.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mt-6">
      {erro && <p className="mb-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando assinaturas…</div>
      ) : assinaturas.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <CreditCard className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">
            Nenhuma assinatura cadastrada. Crie uma escola na aba "Escolas" para gerar a primeira.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Escola</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">R$ / aluno</th>
                <th className="px-6 py-4 font-medium">Alunos contratados</th>
                <th className="px-6 py-4 font-medium">Próxima cobrança</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {assinaturas.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 font-semibold text-white">{a.escolaNome}</td>
                  <td className="px-6 py-4">{badgeAssinatura(a.status)}</td>
                  <td className="px-6 py-4 text-texto/70">R$ {Number(a.preco_por_aluno).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-texto/70">{a.qtd_alunos_contratada}</td>
                  <td className="px-6 py-4 text-texto/70">
                    {a.proxima_cobranca ? new Date(a.proxima_cobranca).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => abrirEdicao(a)}
                      className="p-2 rounded-lg text-texto/60 hover:text-white hover:bg-white/5 transition"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setEditando(null)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editando.escolaNome}</h2>
              <button onClick={() => setEditando(null)} className="text-texto/50 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Status</label>
                <select
                  value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                >
                  {STATUS_ASSINATURA.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">R$ / aluno</label>
                  <input
                    type="number" step="0.01" min="0" value={form.preco_por_aluno}
                    onChange={(e) => setForm({ ...form, preco_por_aluno: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Alunos contratados</label>
                  <input
                    type="number" min="0" value={form.qtd_alunos_contratada}
                    onChange={(e) => setForm({ ...form, qtd_alunos_contratada: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-texto/70 mb-1.5">Próxima cobrança</label>
                <input
                  type="date" value={form.proxima_cobranca ? String(form.proxima_cobranca).slice(0, 10) : ''}
                  onChange={(e) => setForm({ ...form, proxima_cobranca: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                />
              </div>

              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const FORM_VAZIO_PAGAMENTO = { escola_id: '', valor: '', competencia: new Date().toISOString().slice(0, 10) }

function Pagamentos() {
  const [pagamentos, setPagamentos] = useState([])
  const [escolas, setEscolas] = useState([])
  const [assinaturas, setAssinaturas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO_PAGAMENTO)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const [{ data: pagamentosData, error: e1 }, { data: escolasData, error: e2 }, { data: assinaturasData, error: e3 }] =
        await Promise.all([
          supabase.from('pagamentos').select('*').order('competencia', { ascending: false }),
          supabase.from('escolas').select('id, nome'),
          supabase.from('assinaturas').select('id, escola_id'),
        ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3

      const escolaPorId = Object.fromEntries((escolasData || []).map((e) => [e.id, e]))
      setPagamentos((pagamentosData || []).map((p) => ({ ...p, escolaNome: escolaPorId[p.escola_id]?.nome || '—' })))
      setEscolas(escolasData || [])
      setAssinaturas(assinaturasData || [])
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os pagamentos. Confira a conexão com o Supabase.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const totais = pagamentos.reduce(
    (acc, p) => {
      if (p.status === 'pago') acc.recebido += Number(p.valor)
      else if (p.status === 'pendente' || p.status === 'atrasado') acc.pendente += Number(p.valor)
      return acc
    },
    { recebido: 0, pendente: 0 },
  )

  async function marcarPago(p) {
    try {
      const { error } = await supabase.from('pagamentos').update({ status: 'pago', pago_em: new Date().toISOString() }).eq('id', p.id)
      if (error) throw error
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível atualizar o pagamento.')
    }
  }

  async function criarCobranca(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const assinatura = assinaturas.find((a) => a.escola_id === form.escola_id)
      const { error } = await supabase.from('pagamentos').insert({
        escola_id: form.escola_id,
        assinatura_id: assinatura?.id || null,
        valor: Number(form.valor),
        competencia: form.competencia,
        status: 'pendente',
      })
      if (error) throw error
      setModalAberto(false)
      setForm(FORM_VAZIO_PAGAMENTO)
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Não foi possível criar a cobrança.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/30"
        >
          <Plus size={18} /> Nova cobrança
        </button>
      </div>

      {!carregando && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-card border p-6">
            <div className="text-sm text-texto/60">Total recebido</div>
            <div className="mt-1 text-3xl font-bold text-[#3FD08A]">R$ {totais.recebido.toLocaleString('pt-BR')}</div>
          </div>
          <div className="rounded-2xl bg-card border p-6">
            <div className="text-sm text-texto/60">Pendente / atrasado</div>
            <div className="mt-1 text-3xl font-bold text-[#FF6B6B]">R$ {totais.pendente.toLocaleString('pt-BR')}</div>
          </div>
        </div>
      )}

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando pagamentos…</div>
      ) : pagamentos.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-azul/30 bg-card/40 p-12 text-center">
          <DollarSign className="mx-auto text-azul/60" size={40} />
          <p className="mt-4 text-texto/70 max-w-md mx-auto leading-relaxed">Nenhum pagamento registrado ainda.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-card border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-texto/50 border-b">
                <th className="px-6 py-4 font-medium">Escola</th>
                <th className="px-6 py-4 font-medium">Competência</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 font-semibold text-white">{p.escolaNome}</td>
                  <td className="px-6 py-4 text-texto/70">
                    {new Date(p.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-texto/70">R$ {Number(p.valor).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4">{badgePagamento(p.status)}</td>
                  <td className="px-6 py-4 text-right">
                    {p.status !== 'pago' && (
                      <button
                        onClick={() => marcarPago(p)}
                        title="Marcar como pago"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#3FD08A] hover:bg-[#3FD08A]/10 transition"
                      >
                        <Check size={14} /> Marcar pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setModalAberto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-bg-2 border p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nova cobrança</h2>
              <button onClick={() => setModalAberto(false)} className="text-texto/50 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={criarCobranca} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Valor (R$)</label>
                  <input
                    required type="number" step="0.01" min="0" value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-texto/70 mb-1.5">Competência</label>
                  <input
                    required type="date" value={form.competencia}
                    onChange={(e) => setForm({ ...form, competencia: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-azul/15 text-white focus:outline-none focus:border-azul transition"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={salvando}
                className="w-full mt-2 py-3 rounded-full bg-azul hover:bg-azul-puro text-white font-semibold transition shadow-lg shadow-azul/40 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={18} className="animate-spin" />}
                {salvando ? 'Criando…' : 'Criar cobrança'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
