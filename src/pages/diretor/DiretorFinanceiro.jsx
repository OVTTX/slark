import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { DollarSign, CreditCard } from 'lucide-react'

const STATUS_PAGAMENTO = {
  pendente: { rotulo: 'Pendente', cor: '#F5C451' },
  pago: { rotulo: 'Pago', cor: '#3FD08A' },
  atrasado: { rotulo: 'Atrasado', cor: '#FF6B6B' },
  estornado: { rotulo: 'Estornado', cor: '#8892B0' },
}

export default function DiretorFinanceiro() {
  const { perfil } = useAuth()
  const [assinatura, setAssinatura] = useState(null)
  const [pagamentos, setPagamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!perfil?.escola_id) return
    async function carregar() {
      setCarregando(true)
      setErro('')
      try {
        const [{ data: assData, error: e1 }, { data: pagData, error: e2 }] = await Promise.all([
          supabase.from('assinaturas').select('*').eq('escola_id', perfil.escola_id).order('criada_em', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('pagamentos').select('*').eq('escola_id', perfil.escola_id).order('competencia', { ascending: false }),
        ])
        if (e1) throw e1
        if (e2) throw e2
        setAssinatura(assData || null)
        setPagamentos(pagData || [])
      } catch (e) {
        console.error(e)
        setErro('Não foi possível carregar os dados financeiros. Confira a conexão com o Supabase.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [perfil?.escola_id])

  const totalPago = pagamentos.filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.valor), 0)
  const totalPendente = pagamentos.filter((p) => p.status !== 'pago').reduce((s, p) => s + Number(p.valor), 0)

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Financeiro</h1>
      <p className="mt-2 text-texto/60">Assinatura e histórico de cobranças da sua escola com a Slark.</p>

      {erro && <p className="mt-6 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">{erro}</p>}

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando dados financeiros…</div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-card border p-6">
              <div className="text-sm text-texto/60">Total pago</div>
              <div className="mt-1 text-3xl font-bold text-[#3FD08A]">R$ {totalPago.toLocaleString('pt-BR')}</div>
            </div>
            <div className="rounded-2xl bg-card border p-6">
              <div className="text-sm text-texto/60">Pendente</div>
              <div className="mt-1 text-3xl font-bold text-[#F5C451]">R$ {totalPendente.toLocaleString('pt-BR')}</div>
            </div>
            <div className="rounded-2xl bg-card border p-6">
              <div className="flex items-center gap-2 text-sm text-texto/60"><CreditCard size={15} /> Preço por aluno</div>
              <div className="mt-1 text-3xl font-bold text-white">
                {assinatura ? `R$ ${Number(assinatura.preco_por_aluno).toLocaleString('pt-BR')}` : '—'}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-card border overflow-hidden">
            {pagamentos.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="mx-auto text-azul/60" size={40} />
                <p className="mt-4 text-texto/70">Nenhuma cobrança registrada ainda.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-texto/50 border-b">
                    <th className="px-6 py-4 font-medium">Competência</th>
                    <th className="px-6 py-4 font-medium">Valor</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p) => {
                    const s = STATUS_PAGAMENTO[p.status] || STATUS_PAGAMENTO.pendente
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-white/[0.02] transition">
                        <td className="px-6 py-4 text-white font-medium">
                          {new Date(p.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-texto/70">R$ {Number(p.valor).toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: `${s.cor}22`, color: s.cor }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.cor }} />
                            {s.rotulo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-texto/70">{p.pago_em ? new Date(p.pago_em).toLocaleDateString('pt-BR') : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
