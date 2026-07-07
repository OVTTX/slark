import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CreditCard, X, Loader2, Pencil } from 'lucide-react'

const STATUS_ASSINATURA = [
  { valor: 'trial', rotulo: 'Trial', cor: '#F5C451' },
  { valor: 'ativa', rotulo: 'Ativa', cor: '#3FD08A' },
  { valor: 'inadimplente', rotulo: 'Inadimplente', cor: '#FF6B6B' },
  { valor: 'cancelada', rotulo: 'Cancelada', cor: '#8892B0' },
]

function badge(status) {
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

export default function AdminAssinaturas() {
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
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Assinaturas</h1>
      <p className="mt-2 text-texto/60">Planos e status de cada escola.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

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
        <div className="mt-8 rounded-2xl bg-card border overflow-hidden">
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
                  <td className="px-6 py-4">{badge(a.status)}</td>
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
