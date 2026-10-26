import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Building2, Pencil } from 'lucide-react'

export default function AdminAssinaturas({ compact = false }) {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [schoolResult, subscriptionResult] = await Promise.all([
          supabase.from('escolas').select('id,nome,ativa,escola_farol').order('nome'),
          supabase.from('assinaturas').select('id,escola_id,status,plano,criada_em').order('criada_em', { ascending:false }).order('id', { ascending:false }),
        ])
        if (schoolResult.error || subscriptionResult.error) throw schoolResult.error || subscriptionResult.error
        if (!cancelled) setSchools((schoolResult.data || []).map(school=>({...school,assinatura:subscriptionResult.data?.find(item=>item.escola_id===school.id)})))
      } catch { if (!cancelled) setError('Não foi possível carregar os planos das escolas.') }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [])
  return <div className={compact ? 'mt-6' : ''}>
    {!compact && <h1>Assinaturas</h1>}
    <p className="text-sm text-texto/60 mb-5">Status, plano e participação no projeto Escola-Farol. As alterações ficam em Editar escola.</p>
    {error && <p role="alert" className="mb-5 text-sm text-red-400">{error}</p>}
    {loading ? <p role="status" className="text-sm text-texto/60">Carregando escolas…</p> : !schools.length && !error ? <div className="rounded-2xl bg-card border p-10 text-center"><Building2 className="mx-auto text-texto/50" size={32}/><p className="mt-3 text-texto/60">Nenhuma escola cadastrada.</p><Link to="/admin/escolas" className="mt-4 inline-block text-sm underline">Gerenciar escolas</Link></div> : schools.length > 0 && <div className="rounded-2xl bg-card border overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b text-texto/60"><th className="px-5 py-4 font-medium">Escola</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Plano</th><th className="px-5 py-4 font-medium whitespace-nowrap">Escola-Farol</th><th className="px-5 py-4 font-medium"><span className="sr-only">Ações</span></th></tr></thead><tbody>{schools.map(school=>{
      const inactive = !school.ativa || school.assinatura?.status === 'cancelada'
      const overdue = !inactive && school.assinatura?.status === 'inadimplente'
      return <tr key={school.id} className="border-b last:border-0"><td className="px-5 py-4 font-medium">{school.nome}</td><td className="px-5 py-4"><span className={`text-xs ${inactive ? 'text-texto/50' : overdue ? 'text-red-400' : 'text-[#3FD08A]'}`}>{inactive ? 'Inativa' : overdue ? 'Inadimplente' : 'Ativa'}</span></td><td className="px-5 py-4 whitespace-nowrap">{school.assinatura?.plano === 'live' ? 'Slark Live' : 'Slark Base'}</td><td className="px-5 py-4 text-texto/60">{school.escola_farol ? 'Sim' : 'Não'}</td><td className="px-5 py-4"><Link className="inline-flex items-center gap-2 whitespace-nowrap text-xs underline underline-offset-4" to={`/admin/escolas?editar=${school.id}`} aria-label={`Editar escola ${school.nome}`}><Pencil size={14}/>Editar escola</Link></td></tr>
    })}</tbody></table></div>}
  </div>
}
