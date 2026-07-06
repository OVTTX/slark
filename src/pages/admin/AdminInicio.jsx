import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Building2, Users, CreditCard, DollarSign, TrendingUp, Trophy } from 'lucide-react'

// Card de KPI
function Kpi({ icon: Icon, rotulo, valor, cor }) {
  return (
    <div className="rounded-2xl bg-card border p-6 transition hover:-translate-y-1 hover:border-azul/40">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-texto/60">{rotulo}</div>
          <div className="mt-1 text-3xl font-bold text-white">{valor}</div>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${cor}22` }}>
          <Icon size={20} style={{ color: cor }} />
        </div>
      </div>
    </div>
  )
}

export default function AdminInicio() {
  const [m, setM] = useState({ escolas: 0, alunos: 0, ativas: 0, receita: 0, pendentes: 0, pontos: 0 })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        // Contagens reais do banco (head:true traz só o count, sem dados)
        const [escolas, alunos, ativas, pagamentos, pontuacoes] = await Promise.all([
          supabase.from('escolas').select('id', { count: 'exact', head: true }),
          supabase.from('alunos').select('id', { count: 'exact', head: true }),
          supabase.from('assinaturas').select('id', { count: 'exact', head: true }).eq('status', 'ativa'),
          supabase.from('pagamentos').select('valor, status'),
          supabase.from('alunos').select('pontos'),
        ])
        const receita = (pagamentos.data || []).filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor), 0)
        const pendentes = (pagamentos.data || []).filter(p => p.status !== 'pago').length
        const pontos = (pontuacoes.data || []).reduce((s, a) => s + (a.pontos || 0), 0)
        setM({
          escolas: escolas.count || 0,
          alunos: alunos.count || 0,
          ativas: ativas.count || 0,
          receita, pendentes, pontos,
        })
      } catch (e) {
        console.warn('Conecte o Supabase para ver os dados reais.', e)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight">Painel da Equipe Slark</h1>
      <p className="mt-2 text-texto/60">Visão geral do ecossistema — todas as escolas clientes.</p>

      {carregando ? (
        <div className="mt-10 text-texto/50">Carregando dados…</div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Kpi icon={Building2} rotulo="Escolas" valor={m.escolas} cor="#2E5BFF" />
            <Kpi icon={Users} rotulo="Alunos no total" valor={m.alunos} cor="#3FD08A" />
            <Kpi icon={CreditCard} rotulo="Assinaturas ativas" valor={m.ativas} cor="#C44DFF" />
            <Kpi icon={DollarSign} rotulo="Receita recebida" valor={`R$ ${m.receita.toLocaleString('pt-BR')}`} cor="#F5C451" />
            <Kpi icon={TrendingUp} rotulo="Pagamentos pendentes" valor={m.pendentes} cor="#FF6B6B" />
            <Kpi icon={Trophy} rotulo="Pontos Slark gerados" valor={m.pontos} cor="#2E5BFF" />
          </div>

          <div className="mt-6 rounded-2xl bg-card/50 border p-6 text-sm text-texto/55">
            💡 Os números acima vêm direto do banco. Enquanto o Supabase não estiver conectado, eles aparecem zerados — após plugar as chaves e cadastrar escolas, tudo preenche sozinho.
          </div>
        </>
      )}
    </div>
  )
}
